# Step 3: shipping-classification-and-store-connection-merge

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/shipping/page.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/shipping/ShippingView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/settings/page.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/settings/SettingsView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/integrations/IntegrationsView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/excel.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/actions/shipping.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/shipping-credentials.ts`

## 작업
- 운송장 페이지에서 `연동 준비 상태`와 중복 카드 섹션을 제거한다.
- 업로드 아래 첫 번째 핵심 surface를 분류 미리보기 table로 바꾼다.
- 업로드 row를 `네이버`, `쿠팡`, `미분류`, `중복 후보` 뱃지로 분류한다.
- 분류 기준 필터를 추가한다.
- 미연결 provider는 비활성 안내 대신 활성 `연결` 버튼을 두고 설정의 해당 provider 영역으로 deep link 한다.
- 스토어 연결 form은 설정 page 안으로 합치고 연결/변경을 계속 지원한다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 운송장 화면에 `연동 준비 상태` 섹션이 없다.
2. 업로드 후 row별 분류 뱃지가 보인다.
3. `미분류`만 필터링할 수 있다.
4. 네이버/쿠팡 미연결 버튼은 설정 deep link로 이동한다.
5. 설정 화면에서 연결 상태, 마스킹된 요약, 연결/변경 form을 함께 볼 수 있다.

## 금지사항
- 설정과 운송장에 같은 credential form을 남기지 마라. 이유: 수정 지점이 다시 분산된다.
- 업로드 후 원본 엑셀만 보여주고 분류 결과를 뒤로 미루지 마라. 이유: 사용자가 바로 쓸 surface가 아니다.
