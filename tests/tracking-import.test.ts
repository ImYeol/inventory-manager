import { describe, expect, it } from 'vitest'
import { BUILT_IN_TRACKING_PRESETS, headerFingerprint, matchTrackingRows, normalizeTrackingRows } from '@/lib/excel'

describe('tracking import contracts', () => {
  it('uses immutable built-ins and maps canonical fields by a header fingerprint', () => {
    expect(BUILT_IN_TRACKING_PRESETS.map((preset) => preset.name)).toEqual(['쿠팡 송장', '네이버 발송', '택배사 기본'])
    expect(BUILT_IN_TRACKING_PRESETS.every((preset) => preset.immutable)).toBe(true)
    expect(headerFingerprint([' 운송장번호 ', '받는분', '주소'])).toBe(headerFingerprint(['주소', '받는분', '운송장번호']))
    expect(normalizeTrackingRows([{ '운송장번호': ' 123 ', '받는분': '홍길동', 주소: '서울 시' }], {
      trackingNumber: '운송장번호', recipientName: '받는분', address: '주소', orderNumber: '', carrier: '', shippedAt: '',
    })[0]).toMatchObject({ trackingNumber: '123', recipientName: '홍길동', address: '서울 시' })
  })

  it('matches in external order, SKU+recipient, then normalized recipient+address order and excludes unsafe rows', () => {
    const rows = matchTrackingRows([
      { rowNumber: 1, orderNumber: 'ORDER-1', trackingNumber: 'A', carrier: '', recipientName: '다름', address: '', shippedAt: '' },
      { rowNumber: 2, orderNumber: '', trackingNumber: 'B', carrier: '', recipientName: '홍 길동', address: '', shippedAt: '', sellerSku: 'SKU-1' },
      { rowNumber: 3, orderNumber: '', trackingNumber: 'C', carrier: '', recipientName: '김철수', address: '서울시 강남구', shippedAt: '' },
      { rowNumber: 4, orderNumber: '', trackingNumber: '', carrier: '', recipientName: '홍길동', address: '', shippedAt: '' },
    ], [
      { id: 1, externalOrderId: 'ORDER-1', sellerSku: 'OTHER', recipientName: '홍길동', address: '부산', channel: 'naver' },
      { id: 2, externalOrderId: 'ORDER-2', sellerSku: 'SKU-1', recipientName: '홍길동', address: '서울', channel: 'coupang' },
      { id: 3, externalOrderId: 'ORDER-3', sellerSku: null, recipientName: '김철수', address: '서울시강남구', channel: 'naver' },
    ])
    expect(rows.map((row) => [row.matchStatus, row.channel, row.dispatchable])).toEqual([
      ['MATCHED', 'naver', true], ['MATCHED', 'coupang', true], ['MATCHED', 'naver', true], ['TRACKING_MISSING', null, false],
    ])
  })
})
