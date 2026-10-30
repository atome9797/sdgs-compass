#!/usr/bin/env bash
# DB 스키마 시험: 새 데이터베이스를 만들어 schema.sql + seed.sql 을 올리고, tests/ 의 시험을 차례로 돌려요.
#   사용법:  PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres bash db/run-tests.sh [데이터베이스 이름]
#   (psql, createdb, dropdb 가 PATH 에 있어야 해요. 시험은 모두 트랜잭션 안에서 하고 ROLLBACK 하므로 데이터가 남지 않아요.)
set -euo pipefail
cd "$(dirname "$0")"
DB="${1:-sdgs_compass_test}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")

echo "▶ 데이터베이스 $DB 를 새로 만들어요"
dropdb --if-exists "$DB" 2>/dev/null
createdb "$DB"

echo "▶ schema.sql · seed.sql 적용"
"${PSQL[@]}" -f schema.sql -f seed.sql

pass=0
for f in tests/0*.sql; do
  echo "▶ $(basename "$f")"
  # 시험 결과(NOTICE)는 stderr 로 나와요. 앞의 'psql:파일:줄: NOTICE:' 는 지워서 읽기 좋게 보여줘요. (pipefail 덕분에 psql 이 실패하면 여기서 멈춰요)
  if ! "${PSQL[@]}" -o /dev/null -f "$f" 2>&1 | sed -E 's/^psql:[^ ]+ (NOTICE|INFO):  /  /; s/^psql:[^ ]+ ERROR:  /  ✗ /'; then
    echo "✗ $(basename "$f") 실패"
    exit 1
  fi
  pass=$((pass + 1))
done
echo "✓ DB 시험 ${pass}개 파일 모두 통과"
