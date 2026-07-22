---
preset: b1HXyfo0W
style: rhea
baseColor: neutral
theme: indigo
font: Inter
radius: default
icon: lucide
sourceOfTruth:
  values: src/app/globals.css
  componentDefaults: components.json
deviations:
  - id: dense-table-density
    adr: ADR-003
    summary: 카탈로그형 preset 밀도 대신 운영 도구 dense row 밀도를 유지한다.
  - id: modal-non-modal-focus
    adr: ADR-037
    file: src/components/ui/modal.tsx
    summary: Radix Dialog를 modal={false}로 오버라이드해 중첩 Modal/Select/Popover의 focus 충돌을 자체 처리한다.
  - id: legacy-status-colors
    adr: ADR-037
    summary: info/success/warning/danger 4종 semantic status 색은 preset 표준으로 아직 이관되지 않고 레거시 값을 유지한다.
---

# Design System

이 문서는 Seleccase Inventory 시각 시스템의 canonical 근거 문서다. **값의 SoT는 shadcn preset이 생성하는 `src/app/globals.css`와 `components.json`**이며, 이 문서는 값을 반복하지 않는다. 위 YAML은 preset 구성과 확정된 일탈만 기록한다.

## Visual Theme & Atmosphere

모던하고 깔끔한 전형적 shadcn 룩을 지향한다. 브랜드 고유 커스텀 색상(warm neutral, aubergine)이나 장식적 요소(pastel-mesh gradient, glassmorphism, 반복 pulse/glow)를 새로 도입하지 않는다. 새 시각 값이 필요하면 shadcn semantic 토큰 확장 관례를 먼저 따르고 컴포넌트에 raw 값을 하드코딩하지 않는다([ADR-037](../adr/0037-shadcn-preset-visual-system.md), [ADR-025](../adr/0025-visual-token-hierarchy.md) 원칙 승계).

## Color Palette & Roles

색상은 shadcn semantic 토큰(`--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring` 등)의 역할로만 참조한다. hex 값은 이 문서에 적지 않는다 — SoT는 `globals.css`다.

- `--primary`/`--ring`: theme `indigo` 기준 action-first accent.
- `--muted`/`--muted-foreground`: 낮은 강조 배경과 보조 텍스트.
- `--border`/`--border-strong`: 기본/강조 경계.
- `--destructive`: 파괴적 액션과 danger 상태.
- semantic status(info/success/warning/danger) 4종은 위 YAML `deviations`의 `legacy-status-colors`에 따라 아직 레거시 값을 유지한다. 이관 시 Badge variant 등 semantic class로 표현하고 raw hex를 컴포넌트에 직접 넣지 않는다.

## Typography

Google Fonts **Inter**(`next/font/google`)를 display/UI 공통 폰트로 쓴다. 로컬 시스템 폰트 스택은 폴백으로 유지한다. 크기 스케일 값은 `globals.css`가 SoT다.

## Density Doctrine

행 밀도는 preset의 카탈로그형 기본값이 아니라 [ADR-003](../adr/0003-dense-table-and-compact-filters.md) dense table 원칙을 따른다 — 이 제품은 매일 반복해서 쓰는 운영 콘솔이며 표를 빨리 읽는 것이 시각적 여유보다 우선한다. 카탈로그형 레퍼런스(flux 등)에서는 배치·군집화(breadcrumb → 타이틀 → 탭 필터 → 검색·필터·컬럼 툴바 순의 수직 리듬, 좌측 필터 군집·우측 액션 군집)만 차용하고 행 밀도는 차용하지 않는다.

## 인지·그룹핑 원칙

새 화면이 flat·무계층 baseline으로 회귀하지 않도록 아래 원칙을 모든 화면 설계·리뷰에 적용한다. [ADR-018](../adr/0018-ui-system-checks.md) UI-system-check가 `tests/design-contracts.test.ts`, `tests/ui-token-presets.test.ts`, `tests/shared-primitives-tokens.test.ts`로 강제한다.

### 1. 근접성 (Proximity)
같은 그룹에 속한 control 사이 간격은 그룹 간 간격보다 항상 작아야 한다. 하나의 spacing 값으로 모든 간격을 통일하지 않는다 — 간격 차이 자체가 그룹 경계를 표현한다.

### 2. 공통 영역 (Common Region)
관련 control은 하나의 region(카드, 클러스터, toolbar segment) 안에 담는다. 관련 없는 control을 구분 없이 한 줄에 flat하게 나열하지 않는다. region 경계는 shared primitive/preset으로 표현하고 page-local wrapper div로 새로 만들지 않는다([ADR-019](../adr/0019-no-page-local-visual-language.md)).

### 3. 시각 계층 (Visual Hierarchy)
제목, 섹션 라벨, 본문, 메타 텍스트는 크기·굵기·대비로 구분되어야 하며 같은 크기·굵기를 반복하지 않는다.

### 4. 강조 예산 (Emphasis Budget)
하나의 surface(카드/toolbar/시트)에서 강하게 강조된 요소는 1~2개로 제한한다(filled primary 버튼 1개, 강조 배지 1개 수준). [Button 크기 역할 계층](./components.md#button-크기-역할-계층)이 강조 예산의 1차 도구다: 주 동작=`default`, 보조=`sm`, 부가=`ghost`.

### 5. Elevation 계층 (Surface depth)
surface 종류별 elevation은 shadcn 기본 elevation 관례를 따른다. 새 표면을 추가할 때 임의 shadow를 만들지 않는다.

### 외부 근거
- [NN/g Visual Hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)
- [NN/g Common Region](https://www.nngroup.com/articles/common-region/)
- [NN/g 5 Principles of Visual Design](https://www.nngroup.com/articles/principles-visual-design/)
- [IxDF Visual Hierarchy](https://ixdf.org/literature/topics/visual-hierarchy)
- [Gestalt Common Region](https://www.gestaltprinciples.com/principles/common-region)

## Motion

shadcn/Radix 컴포넌트가 제공하는 기본 모션(duration/easing)을 canonical로 삼는다. [ADR-027](../adr/0027-semantic-motion-tiers.md)의 semantic tier(instant/fast/base/slow) 개념은 컴포넌트 모션 역할을 구분하는 사고 틀로 유지하되, 구체 수치는 커스텀 값이 아니라 shadcn/Radix 기본값을 따른다. `prefers-reduced-motion`은 항상 존중하며, reduced motion 환경에서 모션이 필수 정보 전달 수단이 되면 안 된다.

금지: 과한 spring, 반복 pulse/glow, 핵심 데이터를 덮는 장식용 전환.
