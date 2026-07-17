# Design Token Specification

## Token Architecture

시각 토큰은 primitive → semantic → component의 3-tier로 관리한다. primitive는 원시 색상값, semantic은 화면 역할, component는 소비 가능한 preset/primitive다.

| 계층 | 소유 파일 | 책임 |
| --- | --- | --- |
| Primitive / semantic | `src/app/globals.css` | warm neutral·상태 색상, 역할 색상, spacing, radius, control, type, elevation, motion |
| Component preset bridge | `src/app/components/ui.tsx` | 페이지가 재사용하는 토큰 기반 class preset |
| Shared primitive | `src/components/ui/*` | card, control, select, table 등 실제 UI primitive |

새 색상/크기/radius/duration을 컴포넌트에 하드코딩하지 마라. 기존 토큰을 재사용하거나 먼저 토큰을 추가한다.

## Color

### Warm neutral primitive

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--warm-50` | `#faf9f7` | body gradient의 밝은 warm layer |
| `--warm-100` | `#f7f6f4` | muted surface |
| `--warm-150` | `#efedea` | strong surface |
| `--warm-200` | `#e7e4df` | 기본 border |
| `--warm-300` | `#d6d2cb` | strong border |
| `--warm-500` | `#79746e` | muted foreground |
| `--warm-600` | `#57534e` | muted text |
| `--warm-900` | `#211f1c` | foreground |

### Semantic color

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--background` | `#ffffff` | document background |
| `--surface` | `#ffffff` | 기본 surface |
| `--surface-muted` | `var(--warm-100)` | 낮은 강조 배경 |
| `--surface-strong` | `var(--warm-150)` | strong surface |
| `--foreground` | `var(--warm-900)` | 기본 텍스트 |
| `--muted` | `var(--warm-600)` | 보조 텍스트 |
| `--muted-foreground` | `var(--warm-500)` | 약한 보조 텍스트 |
| `--border` | `var(--warm-200)` | 기본 경계 |
| `--border-strong` | `var(--warm-300)` | 강조 경계 |
| `--accent` | `#d97706` | action-first amber |
| `--accent-foreground` | `#ffffff` | accent 위 텍스트 |
| `--focus-ring` | `rgba(217, 119, 6, 0.28)` | focus ring |

### Semantic status

| 의미 | hue 토큰 / 값 | foreground 토큰 / 값 |
| --- | --- | --- |
| info | `--hue-info` / `#2563eb` | `--info-foreground` / `#1d4ed8` |
| success | `--hue-success` / `#16a34a` | `--success-foreground` / `#166534` |
| warning | `--hue-warning` / `#f59e0b` | `--warning-foreground` / `#92400e` |
| danger | `--hue-danger` / `#dc2626` | `--danger-foreground` / `#b91c1c` |

purple SaaS gradient, glassmorphism, decorative glow는 금지한다.

## Spacing

4px base scale만 사용한다.

| 토큰 | 값 | px |
| --- | --- | --- |
| `--space-1` | `0.25rem` | 4 |
| `--space-2` | `0.5rem` | 8 |
| `--space-3` | `0.75rem` | 12 |
| `--space-4` | `1rem` | 16 |
| `--space-5` | `1.25rem` | 20 |
| `--space-6` | `1.5rem` | 24 |
| `--space-8` | `2rem` | 32 |
| `--space-10` | `2.5rem` | 40 |
| `--space-12` | `3rem` | 48 |
| `--space-16` | `4rem` | 64 |

### Card composition contract

Card의 구성과 token 참조는 [card.composition.json](../../design-system/contracts/card.composition.json)이 정의한다. 이 문서는 의도를 설명하고, contract는 Figma와 React가 공유하는 component/property 이름 및 조합을 정의하며, 코드와 harness가 이를 검증한다.

## Radius

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--radius-xs` | `0.375rem` (6px) | chips, shortcuts |
| `--radius-sm` | `0.5rem` (8px) | dense controls, menu items |
| `--radius-md` | `0.625rem` (10px) | controls, buttons |
| `--radius-lg` | `1rem` (16px) | card, table shell, modal |
| `--radius-full` | `9999px` | pills, badges, tabs |

## Control Size & Density

정의된 tier만 사용한다. 임의 height를 만들지 않는다.

| Tier | 토큰 | 값 | 용도 |
| --- | --- | --- | --- |
| dense | `--control-h-dense` | `2rem` (32px) | dense toolbar button, compact status |
| sm | `--control-h-sm` | `2.25rem` (36px) | compact control |
| md | `--control-h-md` | `2.5rem` (40px) | small button |
| default | `--control-h` | `2.75rem` (44px) | default input/control/icon button, tap target |
| lg | `--control-h-lg` | `3.25rem` (52px) | prominent action |

## Typography

body/control은 최소 14px(`--text-base`)이다.

| 토큰 | 값 | 역할 |
| --- | --- | --- |
| `--text-xs` | `0.75rem` (12px) | 좁은 보조 정보 |
| `--text-sm` | `0.8125rem` (13px) | compact 보조 UI |
| `--text-base` | `0.875rem` (14px) | body/control 최소값 |
| `--text-md` | `0.9375rem` (15px) | control text |
| `--text-lg` | `1rem` (16px) | 큰 body/label |
| `--fw-regular` | `400` | regular |
| `--fw-medium` | `500` | medium |
| `--fw-semibold` | `600` | emphasis |

## Elevation

one-off shadow는 금지한다.

| Level | 토큰 / 값 | 역할 |
| --- | --- | --- |
| 1 | `--elevation-1`: `0 1px 2px rgba(28, 25, 23, 0.05)` | subtle / hairline |
| 2 | `--elevation-2`: `0 4px 12px rgba(28, 25, 23, 0.08)` | card |
| 3 | `--elevation-3`: `0 16px 40px rgba(28, 25, 23, 0.10)` | dropdown / overlay |
| 4 | `--elevation-4`: `0 28px 70px rgba(28, 25, 23, 0.16)` | modal |

`--shadow`는 legacy alias이며 `var(--elevation-1)`과 동일하다.

## Usage Rules

- 새 값 하드코딩을 금지하고 이 스케일의 토큰만 사용한다.
- dense는 표·toolbar처럼 정보 밀도가 핵심인 경우에만, sm/md/default/lg는 control의 역할과 tap target에 맞춰 고른다.
- 페이지가 새 시각 언어를 필요로 하면 `src/app/components/ui.tsx` preset 또는 `src/components/ui/*` primitive로 올린다.
- 모션 값과 사용 규칙은 [MOTION.md](./motion.md)를 따른다.

_조사 근거: 3-tier 토큰 아키텍처, 4px base, 역할 기반 elevation, AI 에이전트용 DESIGN.md 토큰 스펙 포맷을 채택한다._
