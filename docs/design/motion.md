# Motion Specification

## Duration Tier

| Tier | 토큰 | 값 |
| --- | --- | --- |
| instant | `--duration-instant` | `80ms` |
| fast | `--duration-fast` | `120ms` |
| base | `--duration-base` | `180ms` |
| slow | `--duration-slow` | `240ms` |

## Easing

| 토큰 | 값 |
| --- | --- |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` |

## Component Guidance

| 상호작용 | 권장 tier |
| --- | --- |
| hover / focus / color | fast |
| dropdown / select / tooltip | fast |
| dialog / sheet / modal 진입 | base |
| 대형 또는 저빈도 전환 | slow |

고빈도 인터랙션은 150ms 미만을 유지한다. 새 duration/easing을 하드코딩하지 말고 위 토큰을 사용한다.

## Accessibility

`src/app/globals.css`의 기본 `prefers-reduced-motion` 규칙을 존중한다. reduced motion 환경에서 모션이 필수 정보 전달 수단이 되면 안 된다.

## Forbidden

- 과한 spring
- 반복 pulse 또는 glow
- 핵심 데이터를 덮는 장식용 전환

이 규칙은 `./ui-guide.md`의 모션 계약과 함께 적용한다.
