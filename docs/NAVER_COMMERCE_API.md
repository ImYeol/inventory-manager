# Naver Commerce API scope

This repository uses Naver Commerce API only from server-side helpers in `src/lib/api/naver.ts`. Naver credentials are encrypted at rest and decrypted only for authenticated server actions.

## Verified current workflow

| Workflow | Endpoint | Method | Current use |
| --- | --- | --- | --- |
| OAuth token | `/v1/oauth2/token` | `POST` | Client Credentials with bcrypt-plus-Base64 `client_secret_sign`; bearer token is never exposed to the client. |
| Product sync | `/v1/products/search` | `POST` | Reads channel product records for `/products`; existing mappings remain exact seller-SKU/manual only. |
| Changed order lookup | `/v1/pay-order/seller/product-orders/last-changed-statuses` | `GET` | Reads changed orders using query parameters and the `moreFrom`/`moreSequence` continuation cursor. |
| Order details | `/v1/pay-order/seller/product-orders/query` | `POST` | Reads detailed product orders in batches of at most 300 IDs for classification. |
| Tracking dispatch | `/v1/pay-order/seller/product-orders/dispatch` | `POST` | Sends tracking data through the existing order/tracking server action. |

The current product-management scope is read/sync only. Product registration, modification, deletion, option mutation, and catalog/attribute APIs are deliberately not called because `/products` is a channel-first inventory mapping surface, not a Naver publishing console.

## Provider boundary

Naver uses an OAuth bearer token acquired from a bcrypt-based client-credentials request. Coupang remains a separate CEA HMAC integration in `src/lib/api/coupang.ts`; its signing and request headers must not be shared with Naver.
