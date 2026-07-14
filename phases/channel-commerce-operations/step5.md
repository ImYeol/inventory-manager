# Step 5: tracking-import-and-fulfillment

## 읽어야 할 파일
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `src/lib/excel.ts`
- `src/lib/actions/shipping.ts`
- `src/lib/api/naver.ts`
- `src/lib/api/coupang.ts`
- `src/app/(protected)/shipping/ShippingView.tsx`
- `tests/excel.test.ts`
- `tests/shipping-actions.test.ts`
- `tests/shipping-view.test.ts`

## 작업
- column mapping, preset, matching, dispatch/finalize idempotency 테스트를 먼저 작성한다.
- `/orders/tracking-import`를 `파일 → 시트/헤더 → 컬럼 매핑 → 미리보기 → 발송` workspace로 추가한다. 기존 BasicDataTable/TableSurface/Select/Modal을 재사용한다.
- canonical fields는 orderNumber, trackingNumber(required), carrier, recipientName, address, shippedAt다. built-in `쿠팡 송장 / 네이버 발송 / 택배사 기본` preset은 immutable이고 사용자는 clone한 custom preset만 저장한다. header fingerprint로 preset을 재선택한다.
- import batch에는 raw 파일 대신 normalized rows와 validation/result summary만 저장한다.
- 매칭 우선순위는 external order ID, seller SKU+recipient, recipient+normalized address다. ambiguous/missing/duplicate/tracking missing은 자동 발송 대상에서 제외한다.
- 네이버 dispatch는 최대 30개씩 묶는다. 쿠팡은 shipmentBoxId+orderId+vendorItemId DTO와 설정의 default carrier를 사용한다.
- 각 외부 성공 row를 order_fulfillments external-success로 기록한 후 `finalize_order_fulfillment` RPC를 호출한다. 외부 실패는 재고 변경 없음, 외부 성공/로컬 실패는 RECONCILE_REQUIRED다. idempotency key로 외부/로컬 중복 처리를 막는다.
- 로컬 finalize 후 연결된 모든 채널에 `sum(available)-safetyStock` 절대 수량을 비동기 갱신한다. 갱신 실패는 fulfillment를 되돌리지 않고 channel ref sync error로 남긴다.
- `/shipping`은 `/orders/tracking-import`로 redirect하고 ShippingView 중복 owner는 제거한다.

## 완료 조건
- `npm run test -- --run tests/excel.test.ts tests/tracking-import.test.ts tests/fulfillment.test.ts tests/shipping-page.test.ts`
- `npm run lint`

## 금지사항
- raw Excel 파일/credential/secret을 DB나 사용자 오류에 저장하지 마라. 이유: 필요 이상의 민감 데이터 보존이다.
- 외부 발송 실패 row를 finalize하지 마라. 이유: 실제 발송이 확인되지 않았다.
- delta 방식으로 채널 재고를 연속 차감하지 마라. 이유: 재시도 시 이중 차감된다.

## 결과 기록
완료 시 step 5를 completed로 바꾸고 preset/matching/finalize/reconcile 검증을 summary에 기록한다.
