import { describe, expect, it } from 'vitest'
import { parseExcelRow } from '@/lib/excel'

describe('parseExcelRow', () => {
  it('maps known column headers and trims whitespace', () => {
    const row = parseExcelRow({
      No: ' 12 ',
      '집화예정장소': ' 서울 ',
      '접수일자': ' 2026-04-12 ',
      '집화예정일자': ' 2026-04-13 ',
      '집화일자': ' 2026-04-14 ',
      '예약구분': ' 일반 ',
      '예약번호': ' AB-123 ',
      '운송장번호': ' 987654321 ',
      '받는분': ' 홍길동 ',
      '전화번호': ' 010-1234-5678 ',
      '주소': ' 서울시 ',
      '예약매체': ' 웹 ',
    })

    expect(row).toEqual({
      no: '12',
      pickupLocation: '서울',
      receiptDate: '2026-04-12',
      pickupScheduleDate: '2026-04-13',
      pickupDate: '2026-04-14',
      reservationType: '일반',
      reservationNumber: 'AB-123',
      trackingNumber: '987654321',
      recipientName: '홍길동',
      phone: '010-1234-5678',
      address: '서울시',
      reservationMedia: '웹',
    })
  })

  it('supports typo headers used in source spreadsheets', () => {
    const row = parseExcelRow({
      '운송장변호': ' 1111 ',
      '전화변호': ' 010-0000-0000 ',
    })

    expect(row.trackingNumber).toBe('1111')
    expect(row.phone).toBe('010-0000-0000')
  })

  it('defaults missing columns to empty strings', () => {
    const row = parseExcelRow({})

    expect(row).toEqual({
      no: '',
      pickupLocation: '',
      receiptDate: '',
      pickupScheduleDate: '',
      pickupDate: '',
      reservationType: '',
      reservationNumber: '',
      trackingNumber: '',
      recipientName: '',
      phone: '',
      address: '',
      reservationMedia: '',
    })
  })
})
