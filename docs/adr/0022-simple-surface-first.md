# ADR-022: 운영 콘솔은 Simple Surface First와 component budget을 기본 원칙으로 삼는다
**결정**: 운영 콘솔은 Simple Surface First와 component budget을 기본 판단 기준으로 삼는다.
**이유**: 운영 콘솔에서 실제 가치가 생기는 지점은 설명 카드가 아니라 표, 필터, 액션이다. component 수와 action 수가 늘어날수록 사용자는 어디를 눌러야 하는지 다시 해석해야 한다.  
**트레이드오프**: 화면별로 즉흥적인 wrapper나 상태 카드를 추가하는 대신, shared primitive와 existing surface를 더 엄격하게 재사용해야 한다.

운영 규칙 세부는 UI Guide의 [Compact Action Doctrine](../design/ui-guide.md#compact-action-doctrine)과 [Component Budget Checklist](../design/ui-guide.md#component-budget-checklist)를 참조한다.

