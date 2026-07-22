# ADR-025: 시각 기반 토큰 계층과 명명 스케일을 도입한다
**Amended by ADR-037**: 3-tier 구조는 유효하나, 구체 값 소유는 shadcn preset으로 이관됐다.
**결정**: visual token은 primitive → semantic → component 계층으로 관리한다. primitive/semantic은 `src/app/globals.css`, component preset bridge는 `src/app/components/ui.tsx`, shared primitive는 `src/components/ui/*`가 소유한다. 컴포넌트에 색상, 크기, radius, duration을 하드코딩하지 않는다.
**이유**: 스케일 부재로 작은 높이가 3종, 이름 없는 radius가 7종, `150ms` 하드코딩이 누적되어 화면별 드리프트가 발생했다.
**트레이드오프**: 단순한 시각 변경도 먼저 토큰과 primitive 계층을 검토해야 하지만, 이후 변경의 일관성과 검토 가능성이 높아진다.

**보강 (인지·그룹핑 원칙)**: 이 토큰 계층은 elevation baseline(카드=`--elevation-2`, dropdown/overlay=`--elevation-3`, modal/fixed-sheet=`--elevation-4`), 버튼 크기 역할(주 동작=`default`, 보조=`sm`, 부가=`ghost`), 근접성·공통 영역·시각 계층·강조 예산까지 인지 차원으로 확장된다. 구체 규칙의 SoT는 [ui-guide.md 인지·그룹핑 원칙](../design/ui-guide.md#인지그룹핑-원칙)이며, [ADR-018](./0018-ui-system-checks.md) UI-system-check가 `tests/design-contracts.test.ts`, `tests/ui-token-presets.test.ts`, `tests/shared-primitives-tokens.test.ts`로 이를 강제해 새 화면이 flat baseline으로 회귀하지 않게 한다.

