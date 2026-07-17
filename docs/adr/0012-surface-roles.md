# ADR-012: 상단 tabs는 view switch, toolbar는 filter/action, card는 border language로 분리한다
**결정**: tabs, toolbar, bordered surface의 역할을 각각 view switch, filter/action, shared border language로 분리한다.
**이유**: tabs를 필터처럼 쓰거나 toolbar를 navigation처럼 쓰면 dense operational screen의 의미가 흐려진다. card/surface language를 분리하면 설명용 chrome을 줄이고 bordered surfaces를 일관되게 만들 수 있다.
**트레이드오프**: 기존 화면에서 tabs, toolbar, card의 역할이 섞여 있으면 재배치가 필요하다.

운영 규칙 세부는 UI Guide의 [Layout Rules](../design/ui-guide.md#layout-rules)와 [Shared Primitive](../design/ui-guide.md#shared-primitive)를 참조한다.

