#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${LMAB_REPO_URL:-https://github.com/UnderstudyLabs/lowermyaibill.git}"
REF="${LMAB_REF:-main}"
INSTALL_ROOT="${LMAB_HOME:-$HOME/.lmab}"
SOURCE_DIR="$INSTALL_ROOT/source"
TARGET_REPO="$(pwd)"
YES=0
DRY_RUN=0
NO_LAUNCH=0
UNINSTALL=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    -y|--yes) YES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --no-launch) NO_LAUNCH=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --ref) REF="${2:?missing git ref}"; shift ;;
    --install-dir) INSTALL_ROOT="${2:?missing install directory}"; SOURCE_DIR="$INSTALL_ROOT/source"; shift ;;
    -h|--help)
      cat <<'EOF'
Usage: install.sh [--yes] [--dry-run] [--no-launch] [--ref REF] [--uninstall]

Installs the LMAB Claude Code plugin and launches a local Anthropic spend audit.
Environment: LMAB_REPO_URL, LMAB_REF, LMAB_HOME.
EOF
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

say() { printf 'lmab %s\n' "$*"; }
run() {
  if [ "$DRY_RUN" = "1" ]; then
    printf 'lmab dry-run:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}
need() {
  command -v "$1" >/dev/null 2>&1 || {
    say "$1 is required. Install it and rerun this command."
    exit 1
  }
}
confirm() {
  [ "$YES" = "1" ] && return 0
  if [ ! -r /dev/tty ] || [ ! -w /dev/tty ]; then
    say "Confirmation requires a terminal. Rerun with --yes for non-interactive use."
    return 1
  fi
  printf 'Continue? [y/N] ' >/dev/tty
  read -r answer </dev/tty
  case "$answer" in y|Y|yes|YES) return 0 ;; *) return 1 ;; esac
}

uninstall_lmab() {
  say "Uninstalling the LMAB Claude plugin and LMAB-owned files."
  if command -v claude >/dev/null 2>&1; then
    claude plugin uninstall lmab@lmab --scope user >/dev/null 2>&1 || true
    claude plugin marketplace remove lmab >/dev/null 2>&1 || true
  fi
  if [ -d "$HOME/.claude/plugins/cache/lmab" ]; then
    run rm -rf "$HOME/.claude/plugins/cache/lmab"
  fi
  if [ -L "$HOME/.local/bin/lmab" ] && [ "$(readlink "$HOME/.local/bin/lmab")" = "$SOURCE_DIR/bin/lmab" ]; then
    run rm "$HOME/.local/bin/lmab"
  fi
  if [ -f "$INSTALL_ROOT/.owned-by-lmab" ]; then
    run rm -rf "$INSTALL_ROOT"
  else
    say "Not removing $INSTALL_ROOT because its LMAB ownership marker is missing."
  fi
  say "Uninstall complete. Repository reports under .lmab were preserved."
}

if [ "$UNINSTALL" = "1" ]; then
  uninstall_lmab
  exit 0
fi

say "Install plan:"
say "  clone public source to $SOURCE_DIR"
say "  install the LMAB Claude Code plugin for this user"
say "  link the lmab command under $HOME/.local/bin when safe"
if [ "$NO_LAUNCH" = "0" ]; then
  say "  launch Claude in $TARGET_REPO and start the audit"
fi
say "The audit reads local code and narrowly relevant Anthropic billing records from already-connected integrations."
say "It does not upload source, call model providers, change billing, or edit application code."
confirm || exit 1

if [ "$DRY_RUN" = "0" ]; then
  need git
  need node
  need claude
  node -e 'const major=Number(process.versions.node.split(".")[0]);if(major<20)process.exit(1)' || {
    say "Node 20 or newer is required."
    exit 1
  }
fi

run mkdir -p "$INSTALL_ROOT"
if [ "$DRY_RUN" = "0" ] && [ -d "$SOURCE_DIR/.git" ]; then
  say "Updating LMAB source to $REF."
  run git -C "$SOURCE_DIR" fetch --depth 1 origin "$REF"
  run git -C "$SOURCE_DIR" checkout --detach FETCH_HEAD
elif [ "$DRY_RUN" = "0" ] && [ -e "$SOURCE_DIR" ]; then
  say "$SOURCE_DIR exists but is not an LMAB git checkout; move it aside and rerun."
  exit 1
else
  say "Installing LMAB source from $REPO_URL#$REF."
  run git clone --depth 1 --branch "$REF" "$REPO_URL" "$SOURCE_DIR"
fi
run touch "$INSTALL_ROOT/.owned-by-lmab"
run chmod +x "$SOURCE_DIR/bin/lmab"

run mkdir -p "$HOME/.local/bin"
if [ "$DRY_RUN" = "1" ] || [ ! -e "$HOME/.local/bin/lmab" ] || [ -L "$HOME/.local/bin/lmab" ]; then
  run ln -sfn "$SOURCE_DIR/bin/lmab" "$HOME/.local/bin/lmab"
else
  say "Leaving existing $HOME/.local/bin/lmab unchanged."
fi

if [ "$DRY_RUN" = "1" ]; then
  run claude plugin marketplace add "$SOURCE_DIR"
  run claude plugin install lmab@lmab --scope user
else
  if ! claude plugin marketplace add "$SOURCE_DIR" >/dev/null 2>&1; then
    claude plugin marketplace update lmab >/dev/null
  fi
  if claude plugin list --json 2>/dev/null | grep -q 'lmab@lmab'; then
    claude plugin update lmab@lmab --scope user >/dev/null
  else
    claude plugin install lmab@lmab --scope user >/dev/null
  fi
fi

say "LMAB installed. Run: lmab audit ."
if [ "$NO_LAUNCH" = "0" ]; then
  PROMPT="Use the LMAB audit skill for this repository. Start immediately: scan the code locally, automatically seek narrowly relevant Anthropic billing totals in already-connected integrations, write .lmab/report.html and .lmab/share-card.svg, open the report, and do not edit application code or call a model provider."
  if [ "$DRY_RUN" = "1" ]; then
    run claude --plugin-dir "$SOURCE_DIR" "$PROMPT"
  else
    exec claude --plugin-dir "$SOURCE_DIR" "$PROMPT"
  fi
fi
