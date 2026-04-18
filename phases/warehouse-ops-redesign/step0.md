# Step 0: codex-hooks-and-doc-foundation

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/.codex/config.toml`
- `/Users/yeol-mac/Development/seleccase-inventory/.codex/hooks.json`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ADR.md`
- `/Users/yeol-mac/Development/seleccase-inventory/DESIGN_SYSTEM.md`

## 작업
- repo-local Codex hooks를 정리한다.
- 하네스 문서와 phase 구조를 `재고 운영 허브`, `소싱만 확장`, `스토어 연결` 기준으로 먼저 정렬한다.
- 구현 전에 팀이 공유할 canonical IA와 route 원칙을 문서에 고정한다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. `.codex/config.toml`에 `codex_hooks = true`가 설정되어 있다.
2. `.codex/hooks.json`이 유효한 JSON이며 `SessionStart`, `UserPromptSubmit`, `PreToolUse`만 사용한다.
3. 문서 전반에서 `재고 운영`이 단일 허브로 정리되어 있다.
4. phase index의 step 0 이름과 문서 방향이 일치한다.

## 금지사항
- 앱 소스 구현을 이 단계에서 시작하지 마라. 이유: 문서 합의 없이 구현하면 후속 단계가 흔들린다.
- 불필요한 hook 이벤트를 많이 추가하지 마라. 이유: 실험 기능 특성상 노이즈가 커진다.
