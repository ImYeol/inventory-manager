# Step 2: channel-product-sync

## 읽어야 할 파일
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `src/lib/api/naver.ts`
- `src/lib/api/coupang.ts`
- `src/lib/actions/shipping.ts`
- `src/lib/shipping-credentials.ts`
- `src/lib/db.ts`
- `tests/naver-api.test.ts` (없으면 생성)
- `tests/coupang-api.test.ts`

## 작업
- API mapping과 SKU linking 테스트를 먼저 작성한다.
- Naver 상품 검색 `POST /external/v1/products/search`를 pagination(size 최대 500)으로 조회하고 sellerManagementCode, origin/channel product number, status/display status, stockQuantity, price, image와 raw attributes를 typed snapshot으로 정규화한다.
- Coupang seller-products paging 조회 후 각 sellerProductId detail을 조회해 vendorItemId, externalVendorSku, approval status, amountInStock/onSale snapshot을 정규화한다. Rocket Growth 전용 수량 처리는 추가하지 않는다.
- HMAC/OAuth와 credential 조회는 기존 server-only 경계를 재사용한다. 오류 메시지에 secret 또는 raw credential을 포함하지 않는다.
- `syncProducts(channel?)` server action/service를 추가해 snapshot을 channel_product_refs에 upsert한다. seller SKU가 정확히 하나의 기존 ProductVariant와 일치할 때만 자동 연결한다. 동일 SKU가 여러 variant에 있거나 SKU가 없으면 mapping-required로 남긴다. 이름 기반 자동 연결은 하지 않는다.
- 같은 seller SKU의 두 채널 ref가 동일 ProductVariant를 참조하는 contract를 보장한다. 동기화 결과는 added/updated/mappingRequired/failed count만 반환한다.
- 독립 API 요청은 Promise.all 또는 제한된 병렬 흐름으로 처리하되 채널 rate limit을 무시하는 무제한 fan-out은 하지 않는다.

## 완료 조건
- `npm run test -- --run tests/naver-api.test.ts tests/coupang-api.test.ts tests/channel-product-sync.test.ts`
- `npm run lint`

## 금지사항
- client component에서 external API를 호출하지 마라. 이유: AGENTS server-only 계약 위반이다.
- 상품명/옵션명 fuzzy match로 자동 연결하지 마라. 이유: 잘못된 재고 SKU 연결은 출고 오류로 이어진다.
- 상품 동기화에서 창고 재고를 갱신하지 마라. 이유: channel snapshot은 참고값이다.

## 결과 기록
완료 시 step 2를 completed로 바꾸고 API endpoint, SKU 매핑 규칙, 테스트 결과를 summary에 기록한다.
