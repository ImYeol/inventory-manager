# Issue tracker: GitHub

GitHub Issues in `ImYeol/inventory-manager` are the work-item record. Use `gh` from this clone; it infers the repository from `origin`.

## Operations

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open`
- Update: `gh issue comment <number> --body "..."` or `gh issue edit <number> ...`
- Close: `gh issue close <number> --comment "..."`

When a skill publishes a ticket, create an issue. When it needs the ticket, read its body, labels, and comments. Pull requests are not a triage surface.
