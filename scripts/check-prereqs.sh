#!/usr/bin/env bash
#
# Validates that the tools needed to build Stellar MicroPay are installed.
#
# Checks: Node.js >= 20, npm >= 10, Rust (stable), the wasm32-unknown-unknown
# target and stellar-cli. Prints ✓ / ✗ per check with the installed and
# required versions, and exits non-zero if any check fails (CI-friendly).
#
# Usage: ./scripts/check-prereqs.sh

REQ_NODE_MAJOR=20
REQ_NPM_MAJOR=10
WASM_TARGET="wasm32-unknown-unknown"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  GREEN=$'\033[32m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
  GREEN=""; RED=""; RESET=""
fi

FAILURES=0

pass() { printf '%s✓%s %-24s installed: %-22s required: %s\n' "$GREEN" "$RESET" "$1" "$2" "$3"; }
fail() {
  printf '%s✗%s %-24s installed: %-22s required: %s\n' "$RED" "$RESET" "$1" "$2" "$3"
  [ -n "$4" ] && printf '    → %s\n' "$4"
  FAILURES=$((FAILURES + 1))
}

# Extracts the leading major version number from strings like "v20.19.5".
major_of() { printf '%s' "$1" | sed -E 's/^[^0-9]*([0-9]+).*/\1/'; }

echo "Checking prerequisites for Stellar MicroPay..."
echo

# --- Node.js ---------------------------------------------------------------
if command -v node >/dev/null 2>&1; then
  NODE_V=$(node --version 2>/dev/null)
  if [ "$(major_of "$NODE_V")" -ge "$REQ_NODE_MAJOR" ] 2>/dev/null; then
    pass "Node.js" "$NODE_V" ">= $REQ_NODE_MAJOR"
  else
    fail "Node.js" "$NODE_V" ">= $REQ_NODE_MAJOR" "Install Node ${REQ_NODE_MAJOR}+ (see .nvmrc; e.g. 'nvm install')"
  fi
else
  fail "Node.js" "not found" ">= $REQ_NODE_MAJOR" "Install from https://nodejs.org or via nvm"
fi

# --- npm -------------------------------------------------------------------
if command -v npm >/dev/null 2>&1; then
  NPM_V=$(npm --version 2>/dev/null | tail -n 1)
  if [ "$(major_of "$NPM_V")" -ge "$REQ_NPM_MAJOR" ] 2>/dev/null; then
    pass "npm" "$NPM_V" ">= $REQ_NPM_MAJOR"
  else
    fail "npm" "$NPM_V" ">= $REQ_NPM_MAJOR" "Upgrade with 'npm install -g npm@latest'"
  fi
else
  fail "npm" "not found" ">= $REQ_NPM_MAJOR" "npm ships with Node.js; install Node first"
fi

# --- Rust (stable) ---------------------------------------------------------
RUST_OK=0
if command -v rustc >/dev/null 2>&1; then
  RUST_V=$(rustc --version 2>/dev/null | awk '{print $2}')
  CHANNEL="stable"
  if command -v rustup >/dev/null 2>&1; then
    ACTIVE=$(rustup show active-toolchain 2>/dev/null | awk '{print $1}')
    case "$ACTIVE" in
      stable*|"") ;;
      *) CHANNEL="$ACTIVE" ;;
    esac
  elif printf '%s' "$RUST_V" | grep -Eq -- '-(nightly|beta|dev)'; then
    CHANNEL="$RUST_V"
  fi
  if [ "$CHANNEL" = "stable" ]; then
    pass "Rust" "$RUST_V (stable)" "stable"
    RUST_OK=1
  else
    fail "Rust" "$RUST_V ($CHANNEL)" "stable" "Run 'rustup default stable'"
  fi
else
  fail "Rust" "not found" "stable" "Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
fi

# --- wasm32-unknown-unknown target ----------------------------------------
if command -v rustup >/dev/null 2>&1; then
  if rustup target list --installed 2>/dev/null | grep -qx "$WASM_TARGET"; then
    pass "$WASM_TARGET" "installed" "installed"
  else
    fail "$WASM_TARGET" "not installed" "installed" "Run 'rustup target add $WASM_TARGET'"
  fi
else
  fail "$WASM_TARGET" "rustup not found" "installed" "Install Rust via rustup, then run 'rustup target add $WASM_TARGET'"
fi

# --- stellar-cli -----------------------------------------------------------
if command -v stellar >/dev/null 2>&1; then
  STELLAR_V=$(stellar --version 2>/dev/null | head -n 1 | awk '{print $2}')
  pass "stellar-cli" "${STELLAR_V:-unknown}" "any (latest recommended)"
else
  fail "stellar-cli" "not found" "any (latest recommended)" "Run 'cargo install --locked stellar-cli'"
fi

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "${GREEN}All prerequisites satisfied.${RESET}"
  exit 0
fi
echo "${RED}${FAILURES} prerequisite check(s) failed.${RESET} Fix the items marked ✗ above and re-run."
exit 1
