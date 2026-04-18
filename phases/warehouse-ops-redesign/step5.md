# Step 5: store-connections-and-shipping-upgrade

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/shipping-credentials.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/actions/shipping.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/api/naver.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/api/coupang.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/shipping/ShippingView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/settings/SettingsView.tsx`

## 작업
- 현재 네이버/쿠팡 자격증명 UI를 `스토어 연결` 정보 구조에 맞게 재배치한다.
- MVP에서는 `shipping_provider_credentials` 저장소와 기존 액션 계층을 재사용한다.
- `스토어 연결`과 `운송장`의 역할을 명확히 분리한다.
- 운송장 화면은 기존 주문 조회/업로드/매칭/발송 흐름을 유지한다.
- `운송장`은 direct item을 유지하고 불필요한 하위 메뉴 분해를 하지 않는다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 네이버/쿠팡 연결 상태, 마스킹된 값, 최근 갱신 시각을 확인할 수 있다.
2. 저장 후 운송장 화면에서 기존 provider fetch/send 흐름이 계속 동작한다.
3. 사용자에게 `연결 준비`와 `발송 실행`의 화면 역할 차이가 명확하다.
4. 내비게이션에서 `운송장`이 singleton category로 분해되지 않는다.

## 금지사항
- 범용 connector 플랫폼을 이 단계에서 새로 만들지 마라. 이유: 현재 범위를 불필요하게 키운다.
- shipping의 업로드 → 미리보기 → 매칭/발송 흐름을 건드리지 마라. 이유: 이번 범위의 핵심이 아니다.
