# ADR-009: shared primitive의 canonical path는 `src/components/ui`다
**결정**: shared primitive는 `src/components/ui` 아래에 추가한다. root `/components/ui`는 만들지 않는다.  
**이유**: 이 저장소는 이미 `@/*` alias와 `src` 중심 구조를 사용하고 있다. 두 번째 component tree를 만들면 ownership이 다시 갈라진다.  
**트레이드오프**: shadcn CLI를 도입하더라도 path 설정을 repo 구조에 맞춰 수동 정렬해야 할 수 있다.

