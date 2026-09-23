#!/usr/bin/env bash
# Self-test for classify.sh routing. Runs in the cheap classify job (bash only, no toolchains).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
fail=0

expect() { # <label> <expected "docs core migration desktop"> <paths...>
  local label="$1" expected="$2"; shift 2
  local out got
  out="$(printf '%s\n' "$@" | bash "$here/classify.sh")"
  got="$(echo "$out" | sed -E 's/^[a-z_]+=//' | tr '\n' ' ' | sed 's/ $//')"
  if [ "$got" = "$expected" ]; then echo "ok    $label -> $got"; else echo "FAIL  $label -> got '$got' expected '$expected'"; fail=1; fi
}

#            docs_only core migration desktop
expect "readme only"            "true false false false"  README.md
expect "roadmap + arch + docs"  "true false false false"  ROADMAP.md ARCHITECTURE.md docs/notes.md desktop-verify/M8B-EVIDENCE.md
expect "manual qa artifacts"    "true false false false"  manual-qa/results/a.json
expect "component"              "false true false true"   src/components/TodayView.tsx
expect "navigation"             "false true false true"   src/navigation/workspaceModel.ts
expect "app shell entry"        "false true false true"   src/App.tsx
expect "main entry"             "false true false true"   src/main.tsx
expect "i18n strings"           "false true false true"   src/i18n.ts
expect "global styles"          "false true false true"   src/styles.css
expect "index.html"             "false true false true"   index.html
expect "service + docs"         "false true false false"  src/services/scheduleService.ts README.md
expect "lib helper"             "false true false false"  src/lib/dates.ts
expect "vite env types"         "false true false false"  src/vite-env.d.ts
expect "backup service"         "false true true false"   src/services/backupService.ts
expect "dexie schema"           "false true true false"   src/db.ts
expect "rust shell"             "false true false true"   src-tauri/src/lib.rs
expect "tauri config"           "false true false true"   src-tauri/tauri.conf.json
expect "desktop adapter"        "false true false true"   src/desktop/desktopAdapter.ts
expect "verification tooling"   "false true false true"   desktop-verify/desktop-smoke.mjs
expect "desktop dev launcher"   "false true false true"   OPEN_DAILY_CANVAS_DEV.cmd
expect "workflow change"        "false true false true"   .github/workflows/ci.yml
expect "dependency manifest"    "false true false true"   pnpm-lock.yaml
expect "unknown path is app"    "false true false false"  some/new/thing.bin
expect "unknown src path"       "false true false true"   src/newFeature.ts
expect "mixed docs + shell"     "false true false true"   README.md src-tauri/Cargo.toml
expect "empty change set"       "false true true true"    ""

exit $fail
