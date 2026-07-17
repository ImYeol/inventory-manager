# ADR-010: 외부 data-table 예제는 패턴만 적응하고 demo 도메인은 버린다
**결정**: 외부에서 제공된 data-table 예제는 column visibility, dropdown, row motion 패턴만 가져오고, repository/avatar/contributor 같은 demo 필드는 최종 UI에 들여오지 않는다.
**이유**: 그대로 복제하면 운영 도메인과 무관한 UI가 섞여 AI slop처럼 보인다.  
**트레이드오프**: 적응 작업이 단순 copy-paste보다 조금 더 든다.

