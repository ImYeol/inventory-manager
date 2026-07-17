# ADR-021: strong card seam 문제는 shared primitive로 해결한다
**결정**: header/body를 함께 담는 strong card는 하나의 clipped surface로 읽혀야 하며, corner gap이나 segmented seam을 page-local border patch로 땜질하지 않는다. 대신 shared card/surface primitive의 variant, padding, token을 고친다.  
**이유**: settings-card처럼 카드가 두 개로 쪼개져 보이면 동일 surface가 아니라 임시 조립물처럼 읽힌다. 이런 문제를 페이지별 border 수정으로 막으면 재발한다.  
**트레이드오프**: 카드가 어색하면 개별 화면에서 고치는 대신 shared primitive까지 올라가야 하므로 수정 범위가 커질 수 있다.

**Card composition contract**: [vendor-neutral contract](../../design-system/contracts/card.composition.json)가 component composition을 정의한다. 문서는 의도를 설명하고, code와 harness가 contract alignment를 검증한다.

