# Step 0: align-naver-auth-products-and-orders

## Read first

- `AGENTS.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/UI_GUIDE.md`
- `docs/ADR.md`
- `src/lib/api/naver.ts`
- `src/lib/api/coupang.ts`
- `tests/naver-api.test.ts`
- `tests/order-sync.test.ts`
- `tests/shipping-actions.test.ts`
- `phases/naver-commerce-api-alignment/index.json`

## Goal

Align the server-only Naver Commerce integration with the current official API contract used by product sync and order/tracking workflows, while leaving the separate Coupang HMAC integration unchanged.

## Required sequence

1. Add focused regression tests before implementation. They must prove that Naver's OAuth token request uses the provider's bcrypt-plus-Base64 `client_secret_sign`, sends the required client-credentials parameters, and never exposes the Client Secret in a request or error.
2. Add tests for the Naver product-list request and order workflow: product sync uses `POST /v1/products/search`; changed-order lookup uses `GET /v1/pay-order/seller/product-orders/last-changed-statuses` with query parameters; detailed order lookup and dispatch preserve bearer-token server requests.
3. Implement the Naver bcrypt signing dependency and request handling. Keep this logic in `src/lib/api/naver.ts`; no client component may access provider credentials or call Naver directly.
4. Correct changed-order lookup to use the documented GET/query contract and collect every continuation page using the documented `more.moreFrom` and `more.moreSequence` cursor. Then fetch order details in chunks no larger than the documented maximum, and retain only pending/shippable order rows expected by the existing workflow.
5. Keep Naver and Coupang authentication code separate: do not modify Coupang's CEA HMAC signing, endpoint paths, headers, or credential payload.
6. Add a concise repository document that records the verified Naver endpoints and explicitly scopes unimplemented product registration/edit APIs out of the current read/sync and tracking workflow.

## Constraints

- Do not log, store in tests, or return a literal Client Secret or bearer token. Reason: provider credentials are server-only secrets.
- Do not change product-name mapping or automatically link products by similarity. Reason: `ChannelProductRef` mapping remains exact-SKU/manual only.
- Do not add product-registration UI or call write APIs outside the existing tracking dispatch. Reason: this task validates and corrects the current product/order/tracking scope, not a catalog publishing feature.
- Do not change `src/lib/api/coupang.ts`. Reason: Coupang uses a distinct CEA HMAC contract and is out of this Naver alignment scope.

## Acceptance

    npm run test -- --run tests/naver-api.test.ts tests/channel-product-sync.test.ts tests/order-sync.test.ts tests/shipping-actions.test.ts
    npm run lint
    npm run build
    npm run test

Record results in `step0-output.json` and update the phase index.
