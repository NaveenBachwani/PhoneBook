#!/usr/bin/env bash
#
# code_quality_lint.sh — run the repository lint gate, or install its git hook.
#
# Gate: ESLint on staged files + TypeScript typecheck, plus a privacy scan that
# blocks commits containing private-repo references.
# This script is the token list itself, so it is exempt from its own scan.
#
# Modes:
#   (no args | --all)  lint whole repo + typecheck + tests (one-time full sweep)
#   --staged           lint only staged JS/TS files + typecheck (pre-commit hook)
#   --install-hook     install .git/hooks/pre-commit to run --staged
#   --check            verify the hook and prerequisites (exits 1 if not ready)
#   --help             show this message
#
# Docs: docs/utilities-info/code_quality_lint.md
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK_MARKER="# managed-by: utilities/safety/code_quality_lint.sh"

# Privacy boundary: these tokens must never appear in any tracked file.
# Exempt: this script (it holds the token list) and .gitignore (it must name
# the private file to keep it out of the repo). "Project KnowHow" is the
# maintainer's public site (linked from README) and is not a leak; only
# private repo *paths* are blocked.
LEAK_RE='(thinkhub|projects/knowhow|sync-agent-rules|/home/naveen|agents\.md|weekday zip)'

usage() {
    cat <<'EOF'
usage: code_quality_lint.sh [--all | --staged | --install-hook | --check | --help]

  (no args)       lint the whole repo (eslint + tsc + vitest)
  --all           same as no args
  --staged        lint staged JS/TS files + typecheck (git pre-commit gate)
  --install-hook  install .git/hooks/pre-commit to run --staged
  --check         verify the hook and prerequisites; exit 1 if not ready
  --help          show this message
EOF
}

fail() {
    echo "error: $*" >&2
    exit 1
}

find_node() {
    command -v node > /dev/null 2>&1 || fail "node not found. Install Node.js 18+ (20+ recommended)."
    NODE="$(command -v node)"
}

require_git() {
    git rev-parse --is-inside-work-tree > /dev/null 2>&1 || fail "not inside a git work tree"
}

report_prereqs() {
    find_node
    echo "node:  $("$NODE" --version) — $NODE"
    if [[ -x "$REPO_ROOT/node_modules/.bin/eslint" ]]; then
        echo "deps:  node_modules present"
    else
        echo "deps:  MISSING — run npm install" >&2
        return 1
    fi
}

check_setup() {
    cd "$REPO_ROOT"
    require_git

    local rc=0 hook
    report_prereqs || rc=1

    hook="$(git rev-parse --git-dir)/hooks/pre-commit"
    if [[ -x "$hook" ]] && grep -qF "$HOOK_MARKER" "$hook"; then
        echo "hook:  installed — $hook"
    else
        echo "hook:  MISSING or unmanaged — run utilities/safety/code_quality_lint.sh --install-hook" >&2
        rc=1
    fi

    exit "$rc"
}

scan_privacy() {
    local files=("$@")
    local self="utilities/safety/code_quality_lint.sh"
    for f in "${files[@]}"; do
        [[ "$f" == "$self" || "$f" == "./$self" ]] && continue
        [[ "$f" == ".gitignore" || "$f" == "./.gitignore" ]] && continue
        if grep -riE "$LEAK_RE" "$f" > /dev/null 2>&1; then
            grep -riEn "$LEAK_RE" "$f" || true
            fail "privacy boundary: $f contains private-repo references"
        fi
    done
    if [[ ${#files[@]} -gt 0 ]]; then
        echo "code_quality_lint: privacy scan clean (${#files[@]} file(s))"
    fi
}

lint_staged_files() {
    local files=("$@")
    if [[ ${#files[@]} -eq 0 ]]; then
        return 0
    fi
    find_node
    cd "$REPO_ROOT"
    "node_modules/.bin/eslint" "${files[@]}" || fail "ESLint failed on staged files"
    echo "code_quality_lint: lint-clean ${#files[@]} staged file(s)"
}

run_typecheck() {
    find_node
    cd "$REPO_ROOT"
    "node_modules/.bin/tsc" --noEmit || fail "TypeScript typecheck failed"
    echo "code_quality_lint: typecheck clean"
}

run_staged() {
    require_git
    local js=()
    mapfile -d '' js < <(git diff --cached --name-only --diff-filter=ACM -z -- '*.ts' '*.tsx' '*.js' '*.jsx')
    local staged_all=()
    mapfile -d '' staged_all < <(git diff --cached --name-only --diff-filter=ACM -z)
    scan_privacy "${staged_all[@]}"
    lint_staged_files "${js[@]}"
    run_typecheck
    if [[ ${#js[@]} -eq 0 ]]; then
        echo "code_quality_lint: no staged JS/TS files"
    fi
}

run_all() {
    find_node
    cd "$REPO_ROOT"
    require_git
    local tracked=()
    mapfile -d '' tracked < <(git ls-files --cached --others --exclude-standard -z)
    scan_privacy "${tracked[@]}"
    "node_modules/.bin/eslint" . || fail "ESLint failed"
    echo "code_quality_lint: eslint clean"
    run_typecheck
    "node_modules/.bin/vitest" run || fail "tests failed"
    echo "code_quality_lint: tests clean"
}

install_hook() {
    cd "$REPO_ROOT"
    require_git

    local git_dir hook
    git_dir="$(git rev-parse --git-dir)"
    hook="$git_dir/hooks/pre-commit"

    mkdir -p "$(dirname "$hook")"

    if [[ -f "$hook" ]] && ! grep -qF "$HOOK_MARKER" "$hook"; then
        local backup="$hook.bak.$(date +%Y%m%d%H%M%S)"
        mv "$hook" "$backup"
        echo "warning: existing pre-commit hook moved to $backup" >&2
    fi

    report_prereqs

    HOOK_TMP="$hook.tmp.$$"
    cat > "$HOOK_TMP" <<EOF
#!/usr/bin/env sh
$HOOK_MARKER
exec "\$(git rev-parse --show-toplevel)/utilities/safety/code_quality_lint.sh" --staged
EOF
    chmod +x "$HOOK_TMP"
    mv "$HOOK_TMP" "$hook"
    echo "installed: $hook"
}

mode="${1:-}"
case "$mode" in
    ""|--all)
        run_all
        ;;
    --staged)
        run_staged
        ;;
    --install-hook)
        install_hook
        ;;
    --check)
        check_setup
        ;;
    --help|-h)
        usage
        ;;
    *)
        usage >&2
        exit 2
        ;;
esac
