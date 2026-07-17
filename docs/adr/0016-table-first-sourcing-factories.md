# ADR-016: sourcing factories는 table + detail modal 구조로 전환한다
**결정**: 외부 공장 목록은 카드형 master/detail 레이아웃 대신 `toolbar + table + detail modal + register modal` 구조를 쓴다.  
**이유**: 운영자가 많은 공장을 빠르게 훑고 필터링하려면 카드형 탐색보다 행 중심 표면이 낫다.  
**트레이드오프**: row interaction과 modal 상태 관리가 추가된다.

