# ADR-018: UI 변경과 검사 스크립트는 shared design system 사용 여부를 함께 검토한다
**결정**: `docs/design/ui-guide.md`와 hooks/검사 스크립트는 UI 변경 시 shared theme, component, primitive, design token 사용 여부를 함께 검토하도록 유지한다.  
**이유**: 문서와 검사 로직이 같은 기준을 보지 않으면 UI 원칙이 코드보다 먼저 느슨해진다.  
**트레이드오프**: hooks와 문서의 수정 범위가 함께 움직여야 한다.

