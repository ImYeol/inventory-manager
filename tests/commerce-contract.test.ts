import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const document = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

describe('SKU channel mapping contract', () => {
  it('makes the internal SKU ledger, not a channel catalog snapshot, canonical', () => {
    const prd = document('docs/product/prd.md')
    const architecture = document('docs/architecture/overview.md')
    const context = document('CONTEXT.md')

    expect(prd).toContain('내부 `ProductVariant`의 seller SKU와 실제 창고 수량이 source of truth')
    expect(architecture).toContain('전량 채널 상품 수집은 canonical flow가 아니다')
    expect(context).toContain('실제 창고 수량이 source of truth')
    expect(prd).toContain('채널 상품 등록·수정·전량 수집은 Seleccase 범위 밖')
  })

  it('requires a user-entered, server-validated mapping without automatic matching', () => {
    const prd = document('docs/product/prd.md')
    const architecture = document('docs/architecture/overview.md')
    const adr = document('docs/adr/0031-sku-channel-mapping-and-inventory-operations.md')

    for (const source of [prd, architecture, adr]) {
      expect(source).toContain('판매자 SKU, 채널 상품 ID, 채널 옵션 ID')
      expect(source).toContain('상품명 유사도나 SKU 자동 연결을 하지 않는다')
    }
    expect(adr).toContain('하나의 내부 SKU는 채널별 옵션을 여러 개 가질 수 있다')
    expect(adr).toContain('server action에서 존재를 검증한다')
  })

  it('keeps incoming out of available stock and retries channel inventory as an absolute quantity', () => {
    const prd = document('docs/product/prd.md')
    const architecture = document('docs/architecture/overview.md')
    const context = document('CONTEXT.md')
    const adr = document('docs/adr/0031-sku-channel-mapping-and-inventory-operations.md')

    for (const source of [prd, architecture, context, adr]) {
      expect(source).toContain('incoming')
      expect(source).toContain('available')
    }
    expect(prd).toContain('검수 전에는 available 및 채널 재고에 포함하지 않는다')
    expect(architecture).toContain('취소는 예약만 해제한다')
    expect(adr).toContain('반품은 검수 입고 뒤에만 onHand를 복구한다')
    expect(adr).toContain('내부 원장을 되돌리지 않고 최신 absolute quantity를 재시도·재조정한다')
  })

  it('limits Naver product reads to mapping validation and excludes publishing and full collection', () => {
    const naver = document('docs/integrations/naver-commerce-api.md')

    expect(naver).toContain('매핑 검증')
    expect(naver).toContain('등록, 수정, 전량 상품 수집을 사용하지 않는다')
    expect(naver).not.toContain('Reads channel product records for `/products`')
  })
})
