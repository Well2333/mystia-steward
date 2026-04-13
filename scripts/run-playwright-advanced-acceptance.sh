#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_STAMP="$(date +%F_%H:%M)"
RUN_DIR_REL=".playwright-cli/tmp/$RUN_STAMP"
RUN_DIR_ABS="$ROOT_DIR/$RUN_DIR_REL"
TEMPLATE_FN=".playwright-cli/playwright-advanced-acceptance.fn.template.js"

if [[ -e "$RUN_DIR_ABS" ]]; then
  echo "目标目录已存在：$RUN_DIR_REL" >&2
  echo "为避免不同 run 结果混入同一目录，请等待下一分钟后重试。" >&2
  exit 4
fi
mkdir -p "$RUN_DIR_ABS"

run_pw() {
  if command -v playwright-cli >/dev/null 2>&1; then
    playwright-cli "$@"
  else
    npx -y @playwright/cli@latest "$@"
  fi
}

if [[ ! -f "$TEMPLATE_FN" ]]; then
  echo "缺少模板文件: $TEMPLATE_FN" >&2
  exit 3
fi

HTTP_STATUS="$(curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/ || true)"
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "开发服务不可用（http://127.0.0.1:4173，状态: $HTTP_STATUS）" >&2
  echo "请先启动: pnpm dev --host 127.0.0.1 --port 4173" >&2
  exit 2
fi

# Keep script source stable in scripts/. Per-run only keeps an execution copy.
cp "$TEMPLATE_FN" "$RUN_DIR_ABS/advanced.fn.js"
sed -i "s#__RUN_DIR__#$RUN_DIR_REL#g" "$RUN_DIR_ABS/advanced.fn.js"

# Track auto-generated root artifacts, then move newly created ones into run directory.
declare -A ROOT_AUTOGEN_BEFORE=()
shopt -s nullglob
for f in .playwright-cli/page-*.yml .playwright-cli/console-*.log; do
  ROOT_AUTOGEN_BEFORE["$(basename "$f")"]=1
done
shopt -u nullglob

move_new_root_artifacts() {
  shopt -s nullglob
  for f in .playwright-cli/page-*.yml .playwright-cli/console-*.log; do
    base="$(basename "$f")"
    if [[ -z "${ROOT_AUTOGEN_BEFORE[$base]+x}" ]]; then
      mv "$f" "$RUN_DIR_ABS/$base" 2>/dev/null || true
    fi
  done
  shopt -u nullglob
}

cleanup() {
  set +e
  run_pw close >/dev/null 2>&1 || true
  move_new_root_artifacts
}

trap cleanup EXIT

run_pw close-all >/dev/null 2>&1 || true
run_pw open http://127.0.0.1:4173/ >/dev/null
run_pw --raw run-code --filename="$RUN_DIR_REL/advanced.fn.js" > "$RUN_DIR_ABS/summary.json"
run_pw console > "$RUN_DIR_ABS/console.log" || true
run_pw network > "$RUN_DIR_ABS/network.log" || true

printf '%s\n' "$RUN_DIR_REL"
