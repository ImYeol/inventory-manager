export type CourierRow = {
  no: string;
  pickupLocation: string;       // 집화예정장소
  receiptDate: string;          // 접수일자
  pickupScheduleDate: string;   // 집화예정일자
  pickupDate: string;           // 집화일자
  reservationType: string;      // 예약구분
  reservationNumber: string;    // 예약번호
  trackingNumber: string;       // 운송장번호
  recipientName: string;        // 받는분
  phone: string;                // 전화번호
  address: string;              // 주소
  reservationMedia: string;     // 예약매체
};

export const TRACKING_FIELDS = ['orderNumber', 'trackingNumber', 'carrier', 'recipientName', 'address', 'shippedAt'] as const
export type TrackingField = (typeof TRACKING_FIELDS)[number]
export type TrackingColumnMapping = Record<TrackingField, string>
export type TrackingRow = Record<TrackingField, string> & { rowNumber: number; sellerSku?: string }
export type TrackingMatch = TrackingRow & { matchStatus: 'MATCHED' | 'MISSING' | 'AMBIGUOUS' | 'DUPLICATE' | 'TRACKING_MISSING'; channel: 'naver' | 'coupang' | null; orderLineId?: number; dispatchable: boolean }

export const BUILT_IN_TRACKING_PRESETS: ReadonlyArray<{ name: '쿠팡 송장' | '네이버 발송' | '택배사 기본'; immutable: true; mapping: TrackingColumnMapping }> = [
  { name: '쿠팡 송장', immutable: true, mapping: { orderNumber: '주문번호', trackingNumber: '운송장번호', carrier: '택배사', recipientName: '수취인', address: '주소', shippedAt: '발송일' } },
  { name: '네이버 발송', immutable: true, mapping: { orderNumber: '상품주문번호', trackingNumber: '송장번호', carrier: '택배사', recipientName: '수취인명', address: '배송지', shippedAt: '발송일시' } },
  { name: '택배사 기본', immutable: true, mapping: { orderNumber: '예약번호', trackingNumber: '운송장번호', carrier: '택배사', recipientName: '받는분', address: '주소', shippedAt: '집화일자' } },
]

const COLUMN_MAP: Record<string, keyof CourierRow> = {
  'No': 'no',
  '집화예정장소': 'pickupLocation',
  '집화예정점소': 'pickupLocation',
  '접수일자': 'receiptDate',
  '집화예정일자': 'pickupScheduleDate',
  '집화일자': 'pickupDate',
  '예약구분': 'reservationType',
  '예약번호': 'reservationNumber',
  '운송장번호': 'trackingNumber',
  '운송장변호': 'trackingNumber',  // 오타 대응
  '받는분': 'recipientName',
  '전화번호': 'phone',
  '전화변호': 'phone',            // 오타 대응
  '주소': 'address',
  '예약매체': 'reservationMedia',
};

function normalizeHeader(header: string) {
  return header
    .normalize('NFC')
    .replace(/\uFEFF/g, '')
    .replace(/\s+/g, '')
    .trim()
}

export function headerFingerprint(headers: string[]) {
  return headers.map(normalizeHeader).filter(Boolean).sort().join('|')
}

export function normalizeTrackingRows(rows: Record<string, unknown>[], mapping: TrackingColumnMapping): TrackingRow[] {
  return rows.map((row, index) => {
    const lookup = new Map(Object.entries(row).map(([header, value]) => [normalizeHeader(header), String(value ?? '').trim()]))
    return {
      rowNumber: index + 1,
      orderNumber: lookup.get(normalizeHeader(mapping.orderNumber)) ?? '',
      trackingNumber: lookup.get(normalizeHeader(mapping.trackingNumber)) ?? '',
      carrier: lookup.get(normalizeHeader(mapping.carrier)) ?? '',
      recipientName: lookup.get(normalizeHeader(mapping.recipientName)) ?? '',
      address: lookup.get(normalizeHeader(mapping.address)) ?? '',
      shippedAt: lookup.get(normalizeHeader(mapping.shippedAt)) ?? '',
    }
  })
}

function comparable(value: string) { return value.normalize('NFC').replace(/\s+/g, '').toLowerCase() }

export function matchTrackingRows(rows: TrackingRow[], candidates: Array<{ id: number; externalOrderId: string; sellerSku: string | null; recipientName: string; address: string; channel: 'naver' | 'coupang' }>): TrackingMatch[] {
  const used = new Set<number>()
  return rows.map((row) => {
    if (!row.trackingNumber) return { ...row, matchStatus: 'TRACKING_MISSING', channel: null, dispatchable: false }
    const byId = row.orderNumber ? candidates.filter((candidate) => candidate.externalOrderId === row.orderNumber) : []
    const bySku = !byId.length && row.sellerSku ? candidates.filter((candidate) => candidate.sellerSku === row.sellerSku && comparable(candidate.recipientName) === comparable(row.recipientName)) : []
    const byAddress = !byId.length && !bySku.length ? candidates.filter((candidate) => comparable(candidate.recipientName) === comparable(row.recipientName) && comparable(candidate.address) === comparable(row.address)) : []
    const matches = byId.length ? byId : bySku.length ? bySku : byAddress
    if (!matches.length) return { ...row, matchStatus: 'MISSING', channel: null, dispatchable: false }
    if (matches.length > 1 || used.has(matches[0].id)) return { ...row, matchStatus: matches.length > 1 ? 'AMBIGUOUS' : 'DUPLICATE', channel: null, dispatchable: false }
    used.add(matches[0].id)
    return { ...row, matchStatus: 'MATCHED', channel: matches[0].channel, orderLineId: matches[0].id, dispatchable: true }
  })
}

export function parseExcelRow(row: Record<string, unknown>): CourierRow {
  const result: Partial<CourierRow> = {};
  for (const [header, value] of Object.entries(row)) {
    const normalized = normalizeHeader(header.trim());
    const key = COLUMN_MAP[normalized];
    if (key) {
      result[key] = String(value ?? '').trim();
    }
  }
  return {
    no: result.no ?? '',
    pickupLocation: result.pickupLocation ?? '',
    receiptDate: result.receiptDate ?? '',
    pickupScheduleDate: result.pickupScheduleDate ?? '',
    pickupDate: result.pickupDate ?? '',
    reservationType: result.reservationType ?? '',
    reservationNumber: result.reservationNumber ?? '',
    trackingNumber: result.trackingNumber ?? '',
    recipientName: result.recipientName ?? '',
    phone: result.phone ?? '',
    address: result.address ?? '',
    reservationMedia: result.reservationMedia ?? '',
  };
}
