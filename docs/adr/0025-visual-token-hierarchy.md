# ADR-025: 시각 기반 토큰 계층과 명명 스케일을 도입한다
**결정**: visual token은 primitive → semantic → component 계층으로 관리한다. primitive/semantic은 `src/app/globals.css`, component preset bridge는 `src/app/components/ui.tsx`, shared primitive는 `src/components/ui/*`가 소유한다. 컴포넌트에 색상, 크기, radius, duration을 하드코딩하지 않는다.
**이유**: 스케일 부재로 작은 높이가 3종, 이름 없는 radius가 7종, `150ms` 하드코딩이 누적되어 화면별 드리프트가 발생했다.
**트레이드오프**: 단순한 시각 변경도 먼저 토큰과 primitive 계층을 검토해야 하지만, 이후 변경의 일관성과 검토 가능성이 높아진다.

