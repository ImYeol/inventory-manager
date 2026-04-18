#!/usr/bin/env python3
import json


def main() -> None:
    context = (
        "Seleccase harness session. Read AGENTS.md, docs/, DESIGN_SYSTEM.md, "
        "and phases/ before non-trivial changes. Treat inventory as a single warehouse-"
        "operations hub with warehouse context plus overview/inbound/outbound/csv/history "
        "subsections. Use expandable sidebar groups only when a section has 2 or more child "
        "screens; otherwise prefer direct menu items. Keep analytics and shipping intact. "
        "Treat Naver and Coupang as store connections that feed shipping, not as hidden "
        "settings-only credentials. For plan-only requests, update docs, skills, hooks, and "
        "phase files before application code."
    )
    print(json.dumps({"hookSpecificOutput": {"additionalContext": context}}))


if __name__ == "__main__":
    main()
