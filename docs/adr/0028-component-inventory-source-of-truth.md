# ADR-028: 컴포넌트 인벤토리를 재사용의 canonical SoT로 둔다
**결정**: `docs/design/components.md`를 preset과 shared primitive 재사용의 canonical source of truth로 둔다. hand-roll 또는 새 primitive를 도입하기 전에는 이 카탈로그를 확인하고, 기존 variant 확장 가능성을 먼저 검토한다.
**이유**: preset, primitive, 화면별 조립물이 함께 존재하는 상태에서 canonical·dead·gap을 한곳에 기록하지 않으면 같은 역할의 UI가 다시 분기된다.
**트레이드오프**: 새 UI 작업 전에 카탈로그 검토가 추가되지만, component ownership과 후속 통합 대상이 명확해진다.

