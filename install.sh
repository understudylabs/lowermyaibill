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
Environment: LMAB_REPO_URL, LMAB_REF, LMAB_HOME, NO_COLOR.
EOF
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

# Presentation stays rich on a terminal and deliberately plain in CI or logs.
FANCY=0
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-dumb}" != "dumb" ]; then
  FANCY=1
fi
if [ "$FANCY" = "1" ]; then
  R=$'\033[0m' B=$'\033[1m' D=$'\033[2m'
  case "${COLORTERM:-}" in
    *truecolor*|*24bit*)
      C1=$'\033[38;2;217;119;87m' C2=$'\033[38;2;229;154;117m'
      C3=$'\033[38;2;226;190;118m' C4=$'\033[38;2;158;219;211m'
      C5=$'\033[38;2;72;204;231m'
      ;;
    *)
      C1=$'\033[38;5;173m' C2=$'\033[38;5;180m' C3=$'\033[38;5;186m'
      C4=$'\033[38;5;159m' C5=$'\033[38;5;44m'
      ;;
  esac
  AC="$C5" OKC=$'\033[38;5;42m' ERRC=$'\033[31m'
  trap 'printf "\033[?25h" 2>/dev/null || true' EXIT
else
  R="" B="" D="" C1="" C2="" C3="" C4="" C5="" AC="" OKC="" ERRC=""
fi

say() {
  if [ "$FANCY" = "1" ]; then
    printf '  %s│%s %s\n' "$D" "$R" "$*"
  else
    printf 'lmab %s\n' "$*"
  fi
}
ok() {
  if [ "$FANCY" = "1" ]; then
    printf '  %s✓%s %s\n' "$OKC" "$R" "$*"
  else
    printf 'lmab %s\n' "$*"
  fi
}
fail_line() {
  if [ "$FANCY" = "1" ]; then
    printf '  %s✗%s %s\n' "$ERRC" "$R" "$*" >&2
  else
    printf 'lmab %s\n' "$*" >&2
  fi
}
section() {
  if [ "$FANCY" = "1" ]; then
    local title="$*" len n pad=""
    len=$(printf '%s' "$title" | wc -m)
    n=$((54 - len))
    [ "$n" -lt 2 ] && n=2
    while [ "$n" -gt 0 ]; do pad="${pad}─"; n=$((n - 1)); done
    printf '\n  %s──%s %s%s%s %s%s%s\n' "$AC" "$R" "$B" "$title" "$R" "$AC" "$pad" "$R"
  else
    printf '\nlmab %s\n' "$*"
  fi
}
banner() {
  [ "$FANCY" = "1" ] || return 0
  printf '\n'
  printf '  %s%s%s\n' "$C1" $'  _                                       _   _    _ _ _ ' "$R"
  printf '  %s%s%s\n' "$C2" $' | |_____ __ _____ _ _   _ __ _  _   __ _(_) | |__(_) | |' "$R"
  printf '  %s%s%s\n' "$C3" $' | / _ \\ V  V / -_) \'_| | \'  \\ || | / _` | | | \'_ \\ | | |' "$R"
  printf '  %s%s%s\n' "$C4" $' |_\\___/\\_/\\_/\\___|_|   |_|_|_\\_, | \\__,_|_| |_.__/_|_|_|' "$R"
  printf '  %s%s%s\n' "$C5" $'                              |__/                       ' "$R"
  printf '\n  %sfind the expensive routes. keep the evidence.%s\n' "$D" "$R"
}
run() {
  if [ "$DRY_RUN" = "1" ]; then
    printf 'lmab dry-run:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}
run_step() {
  local label="$1" output status=0
  shift
  if [ "$DRY_RUN" = "1" ] || [ "$FANCY" != "1" ]; then
    run "$@"
    [ "$DRY_RUN" = "1" ] || ok "$label"
    return 0
  fi
  output=$(mktemp "${TMPDIR:-/tmp}/lmab-install.XXXXXX")
  "$@" >"$output" 2>&1 &
  local pid=$! frames=(◐ ◓ ◑ ◒) i=0
  printf '\033[?25l'
  while kill -0 "$pid" 2>/dev/null; do
    printf '\r  %s%s%s %s' "$AC" "${frames[$((i % 4))]}" "$R" "$label"
    i=$((i + 1))
    sleep 0.1
  done
  wait "$pid" || status=$?
  printf '\r\033[2K\033[?25h'
  if [ "$status" = "0" ]; then
    rm -f "$output"
    ok "$label"
    return 0
  fi
  cat "$output" >&2
  rm -f "$output"
  fail_line "$label"
  return "$status"
}
need() {
  command -v "$1" >/dev/null 2>&1 || {
    say "$1 is required. Install it and rerun this command."
    exit 1
  }
}
confirm() {
  local prompt="${1:-Start the audit?}"
  [ "$YES" = "1" ] && return 0
  if [ ! -r /dev/tty ] || [ ! -w /dev/tty ]; then
    say "Confirmation requires a terminal. Rerun with --yes for non-interactive use."
    return 1
  fi
  printf '  %s?%s %s %s[Y/n]%s ' "$C1" "$R" "$prompt" "$D" "$R" >/dev/tty
  read -r answer </dev/tty
  case "$answer" in ""|y|Y|yes|YES) return 0 ;; *) return 1 ;; esac
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

banner
section "Welcome"
say "A local code scan for expensive Anthropic usage patterns."
say "Target: ${B}$TARGET_REPO${R}"
say "Source: $REPO_URL#$REF"

section "Install plan"
say "  ${C2}1.${R} Install the small LMAB command."
say "  ${C3}2.${R} Add the LMAB skill to Claude Code."
if [ "$NO_LAUNCH" = "0" ]; then
  say "  ${C4}3.${R} Open Claude here and start the audit."
else
  say "  ${C4}3.${R} Leave the audit ready for you to start."
fi
say ""
say "${B}Code only.${R} Reads repository files and writes the report under .lmab/."
say "No email, billing dashboards, connected integrations, or traces."
say "No source upload. No provider calls. No application edits."
confirm "Install LMAB and lower this bill?" || exit 1

if [ "$DRY_RUN" = "0" ]; then
  need git
  need node
  need claude
  node -e 'const major=Number(process.versions.node.split(".")[0]);if(major<20)process.exit(1)' || {
    say "Node 20 or newer is required."
    exit 1
  }
fi

section "1/3 · Install LMAB"
run mkdir -p "$INSTALL_ROOT"
if [ "$DRY_RUN" = "0" ] && [ -d "$SOURCE_DIR/.git" ]; then
  run_step "Update source" git -C "$SOURCE_DIR" fetch --depth 1 origin "$REF"
  run_step "Pin source to $REF" git -C "$SOURCE_DIR" checkout --detach FETCH_HEAD
elif [ "$DRY_RUN" = "0" ] && [ -e "$SOURCE_DIR" ]; then
  fail_line "$SOURCE_DIR exists but is not an LMAB git checkout; move it aside and rerun."
  exit 1
else
  run_step "Download public source" git clone --depth 1 --branch "$REF" "$REPO_URL" "$SOURCE_DIR"
fi
run touch "$INSTALL_ROOT/.owned-by-lmab"
run chmod +x "$SOURCE_DIR/bin/lmab"

run mkdir -p "$HOME/.local/bin"
if [ "$DRY_RUN" = "1" ] || [ ! -e "$HOME/.local/bin/lmab" ] || [ -L "$HOME/.local/bin/lmab" ]; then
  run ln -sfn "$SOURCE_DIR/bin/lmab" "$HOME/.local/bin/lmab"
  [ "$DRY_RUN" = "1" ] || ok "Command ready at $HOME/.local/bin/lmab"
else
  say "Leaving existing $HOME/.local/bin/lmab unchanged."
fi

section "2/3 · Add the Claude Code skill"
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
  ok "Claude Code skill installed"
fi

section "3/3 · Start the audit"
ok "LMAB is ready"
if [ "$NO_LAUNCH" = "0" ]; then
  say "Opening Claude Code in ${B}$TARGET_REPO${R}."
  say "The report will stay under ${B}.lmab/${R}."
  PROMPT="Use the LMAB audit skill for this repository. Start immediately: scan the code locally, write .lmab/report.html and .lmab/share-card.svg, open the report, and do not search email, billing dashboards, connected integrations, telemetry, or traces. Do not edit application code or call a model provider."
  if [ "$DRY_RUN" = "1" ]; then
    run claude --plugin-dir "$SOURCE_DIR" "$PROMPT"
  else
    exec claude --plugin-dir "$SOURCE_DIR" "$PROMPT"
  fi
else
  say "Run ${C4}lmab audit .${R} when you are ready."
fi
