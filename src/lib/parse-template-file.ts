import type * as XLSXType from 'xlsx'

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

function matchesSignature(view: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => view[index] === byte)
}

/** .xlsx (zip) and legacy .xls (OLE2) both start with a fixed binary signature; anything else is treated as text. */
function isBinarySpreadsheet(view: Uint8Array): boolean {
  return matchesSignature(view, ZIP_SIGNATURE) || matchesSignature(view, OLE2_SIGNATURE)
}

/** Only the first line is inspected: enough to tell a comma export from a tab export without scanning the whole file. */
export function detectCsvFieldSeparator(text: string): string {
  const firstLine = text.split(/\r\n|\r|\n/).find((line) => line.trim() !== '') ?? ''
  const tabCount = (firstLine.match(/\t/g) ?? []).length
  const commaCount = (firstLine.match(/,/g) ?? []).length
  return tabCount > commaCount ? '\t' : ','
}

/**
 * Reads a `ParseTemplateBuilder` file upload (inbound template samples, actual
 * inbound files, tracking-import samples) into an XLSX workbook.
 *
 * Binary .xlsx/.xls files are parsed as-is. Everything else (CSV, or a .txt
 * export merely renamed to .csv) is decoded as UTF-8 ourselves - stripping a
 * BOM if present - with the field separator auto-detected between comma and
 * tab, so a tab-delimited export still parses into the right columns instead
 * of one garbled column. Non-UTF-8 encodings (EUC-KR/CP949, ...) are not
 * supported and will still read as mojibake.
 */
export function readUploadedWorkbook(XLSX: typeof XLSXType, bytes: ArrayBuffer | Uint8Array): XLSXType.WorkBook {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (isBinarySpreadsheet(view)) return XLSX.read(view, { type: 'array' })
  const text = new TextDecoder('utf-8', { fatal: false }).decode(view)
  return XLSX.read(text, { type: 'string', FS: detectCsvFieldSeparator(text) })
}
