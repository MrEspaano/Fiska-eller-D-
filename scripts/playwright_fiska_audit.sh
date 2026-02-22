#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://fiska-eller-d.vercel.app}"
SESSION="${PW_SESSION:-fiske-audit}"
OUT_DIR="output/playwright"
ARTIFACT_DIR=".playwright-cli"

PWCLI_CMD=(npx playwright-cli -s="$SESSION")

run_pw() {
  "${PWCLI_CMD[@]}" "$@"
}

eval_bool() {
  local expr="$1"
  local out
  local result
  out="$(run_pw eval "$expr")"
  result="$(printf '%s\n' "$out" | awk '
    /^### Result$/ { getline; gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0); print $0; exit }
    /^[[:space:]]*(true|false)[[:space:]]*$/ { gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0); print $0; exit }
  ')"
  if [[ "$result" == "true" ]]; then
    echo "true"
  else
    echo "false"
  fi
}

latest_file() {
  local pattern="$1"
  ls -1t $pattern 2>/dev/null | head -n 1
}

mkdir -p "$OUT_DIR"

echo "[1/8] Open site"
run_pw open "$BASE_URL"
run_pw snapshot >/dev/null

echo "[2/8] Desktop menu checks"
run_pw resize 1280 800 >/dev/null
START_MENU_VISIBLE="$(eval_bool "() => !!document.querySelector('[role=\"dialog\"]')")"
run_pw run-code "(page) => page.getByRole('button', { name: 'Inställningar' }).click()" >/dev/null
run_pw snapshot >/dev/null
run_pw run-code "(page) => page.getByRole('button', { name: 'Tillbaka' }).click()" >/dev/null
run_pw run-code "(page) => page.getByRole('button', { name: 'Hjälp' }).click()" >/dev/null
run_pw snapshot >/dev/null
run_pw run-code "(page) => page.getByRole('button', { name: 'Tillbaka' }).click()" >/dev/null

echo "[3/8] Start game and test ESC pause"
run_pw run-code "(page) => page.getByRole('button', { name: 'Starta spelet' }).click()" >/dev/null
run_pw snapshot >/dev/null
run_pw press Escape >/dev/null
run_pw snapshot >/dev/null
ESC_MENU_VISIBLE="$(eval_bool "() => !!document.querySelector('[role=\"dialog\"]')")"

echo "[4/8] Mobile controls and pause menu checks"
run_pw resize 390 844 >/dev/null
run_pw reload >/dev/null
run_pw snapshot >/dev/null
MOBILE_BUTTONS_VISIBLE="$(eval_bool "() => !!document.querySelector('button[aria-label=\"Upp\"]') || !!Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('▲'))")"
run_pw run-code "(page) => page.getByRole('button', { name: 'Starta spelet' }).click()" >/dev/null
run_pw run-code "(page) => page.getByRole('button', { name: 'Meny' }).click()" >/dev/null
run_pw snapshot >/dev/null
MOBILE_MENU_VISIBLE="$(eval_bool "() => !!document.querySelector('[role=\"dialog\"]')")"

echo "[5/8] Capture artifacts"
run_pw screenshot >/dev/null
run_pw console >/dev/null

LATEST_SCREENSHOT="$(latest_file "$ARTIFACT_DIR/page-*.png")"
LATEST_CONSOLE="$(latest_file "$ARTIFACT_DIR/console-*.log")"

if [[ -n "${LATEST_SCREENSHOT:-}" ]]; then
  cp "$LATEST_SCREENSHOT" "$OUT_DIR/last-run.png"
fi
if [[ -n "${LATEST_CONSOLE:-}" ]]; then
  cp "$LATEST_CONSOLE" "$OUT_DIR/last-console.log"
fi

echo "[6/8] Analyze console issues"
FAVICON_404="false"
if [[ -f "$OUT_DIR/last-console.log" ]] && rg -q "favicon\\.ico:0" "$OUT_DIR/last-console.log"; then
  FAVICON_404="true"
fi

FAILURES=0
for check in "$START_MENU_VISIBLE" "$ESC_MENU_VISIBLE" "$MOBILE_BUTTONS_VISIBLE" "$MOBILE_MENU_VISIBLE"; do
  if [[ "$check" != "true" ]]; then
    FAILURES=$((FAILURES + 1))
  fi
done

echo "[7/8] Write summary"
{
  echo "Fiske2D Playwright audit"
  echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "URL: $BASE_URL"
  echo "Session: $SESSION"
  echo "Result: $([[ "$FAILURES" -eq 0 ]] && echo PASS || echo FAIL)"
  echo
  echo "Checks"
  echo "- Start menu visible on load: $START_MENU_VISIBLE"
  echo "- ESC opens pause menu in desktop gameplay: $ESC_MENU_VISIBLE"
  echo "- Mobile movement controls visible: $MOBILE_BUTTONS_VISIBLE"
  echo "- Mobile Menu button opens pause menu: $MOBILE_MENU_VISIBLE"
  echo "- Console contains favicon 404: $FAVICON_404"
  echo
  echo "Artifacts"
  echo "- Screenshot: $OUT_DIR/last-run.png"
  echo "- Console log: $OUT_DIR/last-console.log"
} >"$OUT_DIR/audit-summary.txt"

echo "[8/8] Done"
echo "Summary written to $OUT_DIR/audit-summary.txt"
if [[ "$FAILURES" -ne 0 ]]; then
  echo "One or more core checks failed ($FAILURES)." >&2
  exit 1
fi
