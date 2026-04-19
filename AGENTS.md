프로젝트: Seleccase Inventory

기술 스택
- Next.js 16 App Router
- TypeScript 5
- Tailwind CSS v4

아키텍처 규칙
- CRITICAL: 모든 서버/외부 API 로직은 server action 또는 route handler에서만 처리한다.
- CRITICAL: 클라이언트 컴포넌트에서 직접 외부 API를 호출하지 않는다.
- 컴포넌트는 shared primitive를 우선 재사용하고, 타입과 액션은 역할별로 분리한다.

개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성한다.
- 커밋 메시지는 conventional commits 형식을 따른다. (`feat:`, `fix:`, `docs:`, `refactor:`)

명령어
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
