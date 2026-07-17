# ADR-027: 모션은 semantic tier와 표준 easing으로 통일한다
**결정**: 모션은 instant/fast/base/slow semantic tier와 표준 easing을 사용하고 `prefers-reduced-motion`을 존중한다.
**이유**: 고빈도 상호작용의 반응성을 유지하면서 화면별 임의 transition 값을 제거한다.
**트레이드오프**: 장식적 spring이나 반복 효과의 표현 폭은 줄지만, 운영 데이터의 가독성과 접근성은 높아진다.

