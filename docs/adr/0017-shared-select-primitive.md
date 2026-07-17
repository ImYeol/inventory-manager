# ADR-017: console의 선택형 입력은 native select를 쓰지 않고 shared Select primitive로 통일한다
**결정**: 운영 콘솔 내 선택형 입력은 `src/components/ui/select.tsx`를 canonical primitive로 사용하고 native `<select>` 또는 화면별 개별 dropdown 구현은 남기지 않는다.  
**이유**: 재고 운영, 상품 관리, 운송장, 소싱, dashboard에서 서로 다른 dropdown 언어가 섞이면 interaction 품질과 시각 일관성이 무너진다.  
**트레이드오프**: 테스트 환경에서는 portal/scroll 동작을 고려한 보강이 필요하다.

