# Motion

모션의 방향은 `docs/design/DESIGN.md`와 ADR-027을 따른다. 구현값은 shadcn/Radix 기본 동작과 현재 `globals.css` token을 우선 사용한다.

- `instant`: 상태·포커스·validation feedback. 정보 전달을 늦추지 않는다.
- `fast`: Select, Popover, DropdownMenu의 열림/닫힘.
- `base`: Dialog/Sheet 진입·퇴장.
- `slow`: 사용하지 않거나, 업무 흐름을 가리지 않는 제한된 전환에만 사용한다.

Table row는 초기 진입 시 짧은 fade/translate 정도만 허용한다. 반복 pulse/glow, spring, 데이터 위를 덮는 장식 전환은 금지한다. `prefers-reduced-motion`에서는 전환을 줄이거나 제거하며, 모션을 정보 전달 수단으로 삼지 않는다.

