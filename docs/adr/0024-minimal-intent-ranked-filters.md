# ADR-024: 운영 콘솔의 기본 필터는 intent-ranked minimal set으로 제한한다
**결정**: 운영 콘솔의 기본 filter set은 field-complete가 아니라 intent-ranked minimal set이다.
**이유**: history처럼 감사성 메타가 많은 화면은 모든 속성을 필터로 올리기 시작하면 toolbar가 빠르게 과밀해진다. 또한 embedded view에서 filterable field를 context pill로 바꾸거나 local tab state로만 들고 있으면 standalone과 interaction 문법이 갈라지고, 탭 전환 시 상태가 사라져 사용성이 떨어진다.  
**트레이드오프**: 일부 low-frequency filter는 즉시 보이지 않을 수 있으므로 별도 disclosure나 audit surface로 승격하는 기준이 필요하다.

운영 규칙 세부는 UI Guide의 [Filter Budget Rules](../design/ui-guide.md#filter-budget-rules)를 참조한다.

**외부 근거**
- Carbon: table에 영향을 주는 액션은 table toolbar에 둔다.
- PatternFly: action은 영향을 주는 surface 가까이에 둔다.
- Oracle: 자동 반영 가능한 흐름에는 불필요한 refresh UI를 늘리지 않는다.

