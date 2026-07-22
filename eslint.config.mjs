import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Raw hex colors and Tailwind arbitrary color/duration values fragment the
// design token system (docs/design/tokens.md). Block them in JSX className
// strings; globals.css is a CSS file and is not covered by this rule.
const HARDCODED_STYLE_PATTERN =
  "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b|bg-\\[#|text-\\[#|border-\\[#|duration-\\[";
const HARDCODED_STYLE_MESSAGE =
  "className에 raw hex 색상이나 Tailwind arbitrary 색상/duration 값을 쓰지 마세요. docs/design/tokens.md의 semantic 토큰을 사용하세요.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Isolated agent worktrees are separate checkouts — never lint them here.
    ".claude/worktrees/**",
  ]),
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `JSXAttribute[name.name="className"] Literal[value=/${HARDCODED_STYLE_PATTERN}/]`,
          message: HARDCODED_STYLE_MESSAGE,
        },
        {
          selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${HARDCODED_STYLE_PATTERN}/]`,
          message: HARDCODED_STYLE_MESSAGE,
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/components/ui/fixed-sheet",
              message:
                "FixedSheet는 티켓 #27에서 삭제된 primitive입니다. Sheet(side=right, @/components/ui/sheet)를 사용하세요 — 재유입 금지.",
            },
            {
              name: "@/components/ui/basic-data-table",
              message:
                "basic-data-table은 이슈 #25에서 삭제된 primitive입니다 — deleted primitive, do not reintroduce. DataTable(@/components/ui/data-table, bare 모드)을 사용하세요.",
            },
            {
              name: "@/components/ui/inventory-data-table",
              message:
                "inventory-data-table은 이슈 #25에서 삭제된 primitive입니다 — deleted primitive, do not reintroduce. DataTable(@/components/ui/data-table)을 사용하세요.",
            },
            {
              name: "@/components/ui/inventory-table-toolbar",
              message:
                "inventory-table-toolbar는 이슈 #25에서 삭제된 primitive입니다 — deleted primitive, do not reintroduce. DataTable(@/components/ui/data-table)의 내장 toolbar/컬럼 가시성 메뉴를 사용하세요.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
