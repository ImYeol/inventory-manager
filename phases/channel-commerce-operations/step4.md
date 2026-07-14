# Step 4: order-ingestion-and-reservations

## 읽어야 할 파일
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `src/lib/api/naver.ts`
- `src/lib/api/coupang.ts`
- `src/lib/actions/shipping.ts`
- `src/app/components/Nav.tsx`
- `src/components/ui/table-surface.tsx`
- `src/components/ui/channel-badge.tsx`
- `tests/shipping-actions.test.ts`
- `tests/nav.test.ts`

## 작업
- 주문 upsert, 예약, 취소 해제, 페이지 상태 테스트를 먼저 작성한다.
- 채널 주문 정규화에 seller SKU/external product ref를 포함하고 `syncOrders(channel?)`가 channel_orders/order_lines를 idempotent upsert하도록 한다.
- 정확한 SKU mapping과 단일 창고의 available 수량이 충분하면 한 창고에 active reservation을 생성한다. mapping 부족/재고 부족/복수 후보는 `MAPPING_REQUIRED` 또는 `EXCEPTION`으로 두고 inventory.quantity를 변경하지 않는다.
- 취소 상태 수집 시 active reservation을 released로 바꾼다. 같은 주문 재수집에서 예약을 중복 생성하지 않는다.
- `/orders` server page와 dense table을 추가한다. 기본 열은 채널 배지, 주문번호/상품, 수량, 배정 창고, 주문/발송 상태, 주문일이다. 고정 보기 `신규 / 출고 준비 / 확인 필요 / 발송 완료`와 검색/채널 필터만 둔다.
- 주문 row 상세에서 수동 Variant/창고 배정 action을 제공한다. 한 주문은 하나의 창고만 선택할 수 있다.
- Nav를 `대시보드 / 주문 / 상품 관리 / 재고 운영 / 소싱 / 설정`으로 변경한다.

## 완료 조건
- `npm run test -- --run tests/order-sync.test.ts tests/order-reservations.test.ts tests/orders-page.test.ts tests/nav.test.ts`
- `npm run lint`

## 금지사항
- 주문 import에서 onHand를 차감하지 마라. 이유: shipment 성공 전에는 committed 예약만 변한다.
- 한 주문을 여러 창고로 자동 분리하지 마라. 이유: v1 single-warehouse 계약이다.
- 채널 이름을 색상만으로 표시하지 마라. 이유: ChannelBadge text contract를 사용해야 한다.

## 결과 기록
완료 시 step 4를 completed로 바꾸고 주문 상태/예약 규칙/UI 검증을 summary에 기록한다.
