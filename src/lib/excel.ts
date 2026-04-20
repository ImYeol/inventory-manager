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
