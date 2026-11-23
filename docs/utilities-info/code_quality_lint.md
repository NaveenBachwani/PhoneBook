# Runbook for: code_quality_lint.sh

Lint gate for PhoneBook.
Mechanism: git `pre-commit` hook → `utilities/safety/code_quality_lint.sh --staged`.

## What it enforces

| Gate | Scope | Where |
|---|---|---|
| Privacy scan | all staged files — blocks private-repo references | token list in the script |
| ESLint | staged `.ts/.tsx/.js/.jsx` files | `eslint.config.js` (flat config) |
| TypeScript | whole project (`tsc --noEmit`) | `tsconfig.json` (strict) |
| Full sweep (`--all`) | privacy scan + eslint . + tsc + vitest | before proposing a commit |

This is a JS/TS-only repo, so there is no Python leg; ESLint supersedes a
bare `node --check` syntax gate.

## One-time setup (per clone)

```bash
utilities/safety/code_quality_lint.sh --install-hook
utilities/safety/code_quality_lint.sh --check
```

The hook is local to each clone (`.git/hooks/` is not versioned). Re-run
`--install-hook` after cloning; it is safe to re-run (backs up any unmanaged
hook, never overwrites one of its own).

## Daily use

```bash
npm run lint        # eslint only, fast feedback
npm test            # unit tests
npm run build       # typecheck + production build
utilities/safety/code_quality_lint.sh --all   # full gate before proposing a commit
```

Pre-commit runs `--staged` automatically: ESLint on staged JS/TS files plus a
typecheck. If it blocks a commit, fix the findings — do not skip the hook.
