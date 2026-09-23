#!/usr/bin/env bash
# Classifies a change set (one changed path per line on stdin) into CI routing flags.
# Output: key=value lines (docs_only, core, migration, desktop). Unknown paths are treated as app code
# (fail-safe: anything not clearly documentation runs the core checks).
#
#   docs_only  every changed path is documentation
#   core       typecheck + tests + production build
#   migration  data / backup contract touched -> targeted regression job as well
#   desktop    desktop shell / packaging / CI itself touched, OR the change could plausibly reshape
#              rendered UI/selectors -> Windows MSVC build + packaged/installer smoke as well
#
# Fail-closed UI routing (M14): a change confined to src/ used to classify as core-only unless it hit
# an explicit desktop/data path, so a UI-reshaping change (e.g. src/components/**, src/navigation/**)
# could skip the desktop tier entirely -- the packaged-app/installer smokes never drove the real
# rendered UI against it. This bit the project once (M10-A). The fix inverts the default for src/:
# only an explicit, narrow allowlist of non-visual, pure-logic paths stays core-only; every other
# src/ path -- including anything new or unanticipated -- routes to desktop as well.
set -euo pipefail

docs_only=true core=false migration=false desktop=false
any=false

while IFS= read -r path; do
  [ -z "$path" ] && continue
  any=true
  case "$path" in
    # ---- documentation only ----
    *.md|docs/*|manual-qa/*|LICENSE|LICENSE.*|.github/*.md|.github/ISSUE_TEMPLATE/*|.github/pull_request_template.md)
      continue ;;
  esac
  docs_only=false
  case "$path" in
    # ---- CI / desktop shell / packaging ----
    .github/workflows/*|.github/scripts/*|src-tauri/*|src/desktop/*|desktop-verify/*|start-daily-canvas.cmd|OPEN_DAILY_CANVAS_DEV.cmd|index.html)
      desktop=true ;;
    # ---- shared dependency manifests affect both the web app and the shell ----
    package.json|pnpm-lock.yaml|pnpm-workspace.yaml)
      core=true; desktop=true ;;
    # ---- data / backup contract (pure logic, no rendered UI of its own) ----
    src/db.ts|src/dbMigration.test.ts|src/types.ts|src/services/backupService.ts|src/services/backupService.test.ts)
      core=true; migration=true ;;
    # ---- narrow allowlist: non-visual, pure-logic src/ paths stay core-only ----
    src/services/*|src/lib/*|src/vite-env.d.ts)
      core=true ;;
    # ---- everything else under src/ can plausibly reshape rendered UI or selectors:
    #      components, navigation, shell entry points, i18n strings, global styles, and any
    #      new/unanticipated src/ path not covered above -- fail closed and run desktop too ----
    src/*)
      core=true; desktop=true ;;
    # ---- everything else is app code ----
    *)
      core=true ;;
  esac
done

# migration and desktop changes always include the core checks
if $migration || $desktop; then core=true; fi
# an empty change set (e.g. a manual run) is treated as "everything"
if ! $any; then docs_only=false core=true migration=true desktop=true; fi

echo "docs_only=$docs_only"
echo "core=$core"
echo "migration=$migration"
echo "desktop=$desktop"
