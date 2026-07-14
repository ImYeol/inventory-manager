# Step 0: contract-and-channel-badge

## 읽어야 할 파일
- `AGENTS.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/UI_GUIDE.md`
- `docs/COMPONENTS.md`
- `docs/DESIGN.md`
- `docs/MOTION.md`
- `docs/ADR.md`
- `src/components/ui/badge-1.tsx`
- `src/components/ui/shipping-classification-badge.tsx`
- `tests/shared-primitives.test.ts`

## 작업
- 구현 전에 문서/primitive contract 테스트를 추가한다.
- 승인된 IA와 상태 모델을 문서 SoT에 반영한다: sidebar는 `대시보드 / 주문 / 상품 관리 / 재고 운영 / 소싱 / 설정`, `/orders`가 주문·송장 작업 owner, `/shipping`은 `/orders/tracking-import` redirect다.
- ProductVariant, ChannelProductRef, `onHand / committed / available / incoming / channelReported`, 주문 예약, 외부 발송 성공 후 원자적 차감, 절대 수량 채널 동기화 규칙을 PRD/Architecture/ADR에 기록한다.
- shared `ChannelBadge`를 추가한다. 공개 props는 `channel: 'naver' | 'coupang'`, `listingStatus`, 선택 `compact`만 허용한다. 네이버는 success, 쿠팡은 info, 미등록은 neutral, 오류는 warning/danger semantic을 기존 Badge primitive로 조합하고 채널명+상태 텍스트를 항상 노출한다.
- COMPONENTS/UI Guide에 ChannelBadge를 canonical primitive로 등록한다. `src/app/globals.css`는 수정하지 않는다.

## 완료 조건
- `npm run test -- --run tests/shared-primitives.test.ts tests/nav.test.ts`
- `npm run lint`

## 금지사항
- `src/app/globals.css`를 수정하지 마라. 이유: 완료된 token SoT이며 기존 info/success/warning/danger/neutral로 충분하다.
- 채널 색상만으로 상태를 표현하지 마라. 이유: 접근성과 상태/채널 의미 분리가 깨진다.
- 페이지 전용 channel chip을 만들지 마라. 이유: ChannelBadge가 단일 owner다.

## 결과 기록
완료 시 phase index의 step 0을 completed로 바꾸고 문서 결정, primitive API, 검증 결과를 summary에 기록한다.
