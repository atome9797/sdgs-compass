#!/usr/bin/env bash
# 사용법: bash .github/scripts/run-step.sh "<제목>" <명령> [인자...]
# 명령을 실행해 출력을 그대로 보여 주고, 실패하면 마지막 출력 360줄을 GitHub 주석(annotation)으로 남깁니다.
# 주석은 Checks API로 읽을 수 있어서, 로그 파일을 내려받지 않아도 실패 원인을 확인할 수 있습니다.
set -uo pipefail
title="$1"
shift
log="$(mktemp)"
"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  enc() { sed -e 's/%/%25/g' -e 's/\r/%0D/g' | sed -e ':a;N;$!ba;s/\n/%0A/g'; }
  dir="$(mktemp -d)"
  grep -v '^[[:space:]]*$' "$log" | tail -n 360 > "$dir/tail" || true
  split -l 60 "$dir/tail" "$dir/part_"
  n=0
  for part in "$dir"/part_*; do
    [ -s "$part" ] || continue
    n=$((n + 1))
    echo "::error title=${title} 실패 (${n})::$(enc < "$part")"
  done
fi
exit "$status"
