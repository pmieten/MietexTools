---
description: "Generate a conventional commit message from uncommitted git changes"
agent: "agent"
argument-hint: "Optional: [type][/scope] override (e.g. 'fix(auth)' or 'refactor')"
---
Generate a commit message for the uncommitted git changes in this workspace.

## Instructions

0. Check if all files are saved. If not, ask the user to save them first. 
1. Check staged changes first: run `git diff --staged --stat`. If there are staged changes, use them.
2. If nothing is staged, fall back to `git diff --stat` for unstaged changes.
3. Run the full diff (`git diff --staged` or `git diff`) to inspect the actual changes.
4. Analyze the changes and summarize what was done.
5. Firstly, output  ONLY a commit message in **Conventional Commits** format — no extra commentary.
6. Ask if execute commit or not. If yes, run `git commit -am "<commit message>"`. If no, exit without committing.

## Overrides

If the user provided an argument like `fix(auth)`, use `fix` as the type and `auth` as the scope.
If the user provided just a type like `refactor`, use that as the type and infer the scope from changes.

## Output Format

```
<type>(<scope>): <short summary>

- <bullet point per logical change>
```

If scope doesn't apply, omit it: `<type>: <short summary>`

### Types
- `feat` — A new feature
- `fix` — A bug fix
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `chore` — Maintenance tasks, dependency updates, tooling
- `docs` — Documentation changes
- `style` — Formatting, missing semicolons, etc. (no code change)
- `test` — Adding or updating tests

### Guidelines
- **Short summary**: Imperative mood, lowercase, no period at end, max 72 chars
- **Bullet points**: Be specific — mention component/file names when relevant
- Group related changes under the same commit if they serve a single purpose