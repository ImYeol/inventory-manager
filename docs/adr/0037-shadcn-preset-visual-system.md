# ADR-037: 시각 시스템을 shadcn preset 기반으로 전환한다

**상태**: Accepted — ADR-036(aubergine)을 supersede한다. ADR-036은 코드 구현에 착수하기 전 문서 단계에서 폐기된 방향의 역사 기록으로 보존한다(왜 Slack aubergine 방향을 검토했고 왜 버렸는지의 근거 유지). ADR-025의 primitive → semantic → component 3-tier 계층 *구조*는 유지하되, 계층의 구체 값과 명명을 shadcn preset 체계로 이관한다.

**결정**: shadcn preset `b1HXyfo0W`(style `rhea`, baseColor `neutral`, theme `indigo`, chartColor `amber`, iconLibrary `lucide`, font `Inter`, radius `default`)를 프로젝트 시각 시스템의 canonical 기준으로 채택한다. 기존 프로젝트이므로 적용은 `--template` 없이 `init --preset` 경로를 쓴다.

1. **색상**: warm neutral primitive(`--warm-*`)와 amber/aubergine accent 체계를 폐기하고, preset이 생성하는 shadcn semantic 토큰(`--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring` 등)으로 이관한다. semantic status 표현은 raw hex 대신 shadcn 관례(Badge variant, `text-muted-foreground` 등 semantic class)를 따른다.
2. **타이포**: Google Fonts Inter를 채택한다(ADR-036 항목 7의 폰트 결정은 승계).
3. **모션**: ADR-027의 semantic tier 개념과 `prefers-reduced-motion` 존중은 유지하되, duration/easing의 canonical 수치는 shadcn/Radix 컴포넌트의 기본 모션으로 삼는다. ADR-036 항목 8의 slack.com 관찰값 역추정 계획은 폐기한다.
4. **밀도**: ADR-003 dense table 원칙은 유지한다. 카탈로그형 레퍼런스(flux 등)에서는 배치·군집화(breadcrumb → 타이틀 → 탭 필터 → 검색·필터·컬럼 툴바 순의 수직 리듬, 좌측 필터 군집·우측 액션 군집)만 차용하고, 행 밀도는 운영 도구 기준을 지킨다.
5. **커스텀 시각 값 신설 금지**: 새 색상·크기·radius·duration이 필요하면 shadcn semantic 토큰 확장 관례를 먼저 따르고, 컴포넌트에 raw 값을 하드코딩하지 않는다(ADR-025 원칙 승계).

**이유**: 이 프로젝트의 최우선 가치가 코드 재사용성·정형화·저비용 모델의 수정 안전성으로 확인됐다. 커스텀 warm/aubergine 토큰 체계는 shadcn 생태계에서 가져오는 모든 컴포넌트를 커스텀 토큰으로 재배선해야 하는 영구 마찰을 만들고, 표준에서 벗어난 지점마다 약한 모델이 표준으로 되돌리는 회귀 위험을 남긴다. ADR-036은 코드가 한 줄도 구현되지 않은 문서 단계이므로 방향 전환 비용이 수명 주기 중 최소인 시점이다. 사용자가 "모던하고 깔끔하다"고 확인한 실물 레퍼런스(shadcn blocks, flux 계열 대시보드)가 preset의 neutral+indigo 방향과 일치한다.

**트레이드오프**:
- 브랜드 고유성(warm neutral, Slack aubergine)을 포기하고 전형적 shadcn 룩을 얻는다.
- ADR-036 기반으로 개정된 문서(`tokens.md`의 aubergine/canvas/mesh 토큰 표, `motion.md`의 교체 예정 블록 등)를 preset 기준으로 재개정해야 한다.
- `src/app/components/ui.tsx` preset bridge와 vitest 토큰 계약 테스트(`design-contracts`, `ui-token-presets`, `shared-primitives-tokens`, 화면별 토큰 테스트 6종)를 shadcn semantic 토큰 기준으로 전면 개정해야 하며, 화면별 테스트는 공통 계약 테스트로 축소하는 것을 목표로 한다.
- preset 적용 시 기존 `src/components/ui/*` 중 shadcn과 이름이 겹치는 파일의 덮어쓰기 범위를 파일 단위로 통제해야 한다. 의도된 일탈(예: `modal.tsx`의 non-modal focus 처리)은 파일 상단 주석과 ADR로 표식을 남겨 보호한다.
