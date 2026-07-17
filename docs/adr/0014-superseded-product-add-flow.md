# ADR-014: 상품 추가는 최소 modal과 후속 옵션 생성 action 조합으로 처리한다 (ADR-030으로 대체)
**결정**: 초기 모델 중심 등록 결정은 ADR-030의 channel-first 상품 관리와 원자적 내부 상품 생성 flow로 대체한다.
**이유**: 채널 상품과 내부 판매 옵션의 연결에는 고유 판매자 SKU가 필요해 개별 legacy action 조합으로는 불완전하다.
**트레이드오프**: legacy `models/sizes/colors` 스키마는 호환을 위해 유지한다.

