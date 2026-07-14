# Step 1: commerce-schema-and-invariants

## 읽어야 할 파일
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR.md`
- `prisma/schema.prisma`
- `supabase/schema.sql`
- `prisma/migrations/*/migration.sql`
- `tests/schema-contract.test.ts`
- `src/lib/data.ts`
- `src/lib/db.ts`

## 작업
- schema contract와 SQL invariant 테스트를 먼저 작성한다.
- Supabase CLI의 `supabase migration new --help`로 현재 명령을 확인한 뒤 `supabase migration new channel_commerce_operations`로 canonical migration을 생성한다. 동일 SQL을 현재 저장소 계약에 맞춰 `supabase/schema.sql`에 반영하고 Prisma schema를 동기화한다. 임의 timestamp migration 이름을 만들지 않는다.
- `product_variants`, `channel_product_refs`, `channel_orders`, `channel_order_lines`, `inventory_reservations`, `order_fulfillments`, `tracking_import_templates`, `tracking_import_batches`를 추가한다.
- 모든 public table에 `user_id default auth.uid()`, RLS, authenticated owner policy, user_id index를 둔다. 외부 식별자는 user+channel 범위에서 unique해야 한다.
- ProductVariant는 model/size/color와 seller_sku를 소유하고, ChannelProductRef는 variant nullable 연결과 공통 검색 필드, channel attributes jsonb, channel_reported, last_synced_at/error를 소유한다. SKU가 없거나 충돌하면 variant_id가 null인 mapping-required row로 남길 수 있어야 한다.
- InventoryReservation은 order line+warehouse+quantity+status를, OrderFulfillment는 idempotency key, external/local status, tracking/carrier/error를 소유한다.
- `finalize_order_fulfillment` security-invoker RPC를 추가한다. 인증 사용자 row를 잠그고, 외부 성공 상태인 fulfillment만 한 번 출고하며, inventory.quantity(onHand)와 active reservation(committed)을 함께 차감/해제하고 OUTBOUND transaction을 기록한다. 재호출은 no-op success여야 한다.
- public security-definer 함수/뷰는 만들지 않는다. 함수는 fully qualified object와 안전한 search_path를 사용한다.
- 생성 후 `npx prisma generate`로 generated client를 동기화한다.

## 완료 조건
- `npm run test -- --run tests/schema-contract.test.ts tests/commerce-schema.test.ts`
- `npx prisma validate`
- `npm run lint`

## 금지사항
- channelReported를 inventory.quantity에 복사하지 마라. 이유: 외부 스냅샷과 실재고 SoT가 다르다.
- shipment 전 주문 수집에서 inventory.quantity를 차감하지 마라. 이유: 주문은 예약만 생성한다.
- service role 또는 public security-definer로 RLS를 우회하지 마라. 이유: 사용자 경계가 무너진다.

## 결과 기록
완료 시 step 1을 completed로 바꾸고 migration 경로, RLS/RPC invariant, 검증 결과를 summary에 기록한다.
