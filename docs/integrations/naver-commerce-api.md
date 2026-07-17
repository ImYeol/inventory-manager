# Naver Commerce API scope

This repository uses Naver Commerce API only from server-side helpers in `src/lib/api/naver.ts`. Naver credentials are encrypted at rest and decrypted only for authenticated server actions.

## Verified current workflow

| Workflow | Endpoint | Method | Current use |
| --- | --- | --- | --- |
| OAuth token | `/v1/oauth2/token` | `POST` | Client Credentials with bcrypt-plus-Base64 `client_secret_sign`; bearer token is never exposed to the client. |
| Mapping validation (when supported) | Provider option lookup | provider-specific | Server action performs 매핑 검증 for the user-entered seller SKU, channel product ID, and channel option ID. It is not a catalog sync. |
| Changed order lookup | `/v1/pay-order/seller/product-orders/last-changed-statuses` | `GET` | Reads changed orders using query parameters and the `moreFrom`/`moreSequence` continuation cursor. |
| Order details | `/v1/pay-order/seller/product-orders/query` | `POST` | Reads detailed product orders in batches of at most 300 IDs for classification. |
| Tracking dispatch | `/v1/pay-order/seller/product-orders/dispatch` | `POST` | Sends tracking data through the existing order/tracking server action. |

The product read scope is limited to explicit mapping validation and order/inventory operations. Seleccase does not use product registration, modification, deletion, option mutation, or full catalog collection: 등록, 수정, 전량 상품 수집을 사용하지 않는다. `/products` is an internal SKU mapping surface, not a Naver publishing console; product-name similarity and automatic SKU linking are not used.

## Provider boundary

Naver uses an OAuth bearer token acquired from a bcrypt-based client-credentials request. Coupang remains a separate CEA HMAC integration in `src/lib/api/coupang.ts`; its signing and request headers must not be shared with Naver.
