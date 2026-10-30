#!/usr/bin/env bash
# 닫힌 마일스톤 → 버전 태그 + GitHub Release. .github/workflows/release.yml 이 불러요.
#
# - 마일스톤 이름이 "v1.4 …"처럼 v<주>.<부>(.<수>)로 시작할 때만 만들어요 → 태그 v1.4.0
#   (공부·과제 레포의 "2026-11 …", "과제 1 …" 같은 이름은 건너뛰어요)
# - 릴리스 노트: docs/releases/<태그>.md 가 있으면 그 파일, 없으면 마일스톤 설명의 "목표:" 줄과 완료로 닫힌 이슈 목록
# - 태그를 붙일 커밋: TARGET_SHA(마일스톤을 닫은 순간의 기본 브랜치 커밋)가 있으면 그것,
#   없으면(Actions 에서 직접 돌릴 때) 마일스톤을 닫은 때까지의 기본 브랜치 마지막 커밋
# - 같은 태그가 이미 있으면 건너뛰어요(마일스톤을 다시 열었다 닫아도 두 번 만들지 않음). 아직 열린 마일스톤은 만들지 않아요.
# - 더 높은 버전의 릴리스가 이미 있으면(예: v1.4 를 v1.2 보다 먼저 닫음) "Latest" 표시는 높은 버전에 그대로 둬요.
#
# 환경 변수: GH_TOKEN, GITHUB_REPOSITORY(owner/repo), MILESTONE(번호), TARGET_SHA(선택),
#            DRY_RUN=1 이면 만들지 않고 태그·커밋·노트만 보여 줘요(로컬 확인용).
set -euo pipefail

repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY 가 없어요 (owner/repo)}"
number="${MILESTONE:-}"
if ! [[ "$number" =~ ^[0-9]+$ ]]; then
  echo "::error::마일스톤 번호가 숫자가 아니에요: '$number'"
  exit 1
fi

milestone() { gh api "repos/$repo/milestones/$number" --jq "$1"; }
title=$(milestone '.title')
state=$(milestone '.state')
closed_at=$(milestone '.closed_at // ""')
description=$(milestone '.description // ""')

version_re='^[vV]([0-9]+)\.([0-9]+)(\.([0-9]+))?([^0-9.]|$)'
if ! [[ "$title" =~ $version_re ]]; then
  echo "::notice::마일스톤 \"$title\" 은 v1.4 처럼 버전으로 시작하지 않아서 릴리스를 만들지 않아요."
  exit 0
fi
tag="v${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.${BASH_REMATCH[4]:-0}"

if [ "$state" != "closed" ] || [ -z "$closed_at" ]; then
  echo "::error::마일스톤 \"$title\" 이 아직 열려 있어요. 닫은 뒤에 릴리스를 만들어요."
  exit 1
fi

if gh api "repos/$repo/git/ref/tags/$tag" --silent 2>/dev/null || gh api "repos/$repo/releases/tags/$tag" --silent 2>/dev/null; then
  echo "::notice::$tag 태그(또는 릴리스)가 이미 있어서 건너뛰어요."
  exit 0
fi

branch=$(gh api "repos/$repo" --jq '.default_branch')
target="${TARGET_SHA:-}"
if [ -z "$target" ]; then
  target=$(gh api "repos/$repo/commits?sha=$branch&until=$closed_at&per_page=1" --jq '.[0].sha // ""')
fi
if [ -z "$target" ]; then
  echo "::error::$branch 브랜치에서 태그를 붙일 커밋을 찾지 못했어요."
  exit 1
fi

notes=$(mktemp)
notes_file="docs/releases/$tag.md"
if [ -f "$notes_file" ]; then
  cp "$notes_file" "$notes"
  notes_from="$notes_file"
else
  goal=$(awk 'sub(/^목표:[[:space:]]*/, "") { print; exit }' <<<"$description")
  issues=$(gh api --paginate "repos/$repo/issues?milestone=$number&state=closed&sort=created&direction=asc&per_page=100" \
    --jq '.[] | select(.pull_request == null and .state_reason != "not_planned") | "- #\(.number) \(.title)"')
  {
    if [ -n "$goal" ]; then printf '%s\n\n' "$goal"; fi
    printf '## 닫힌 이슈\n'
    if [ -n "$issues" ]; then printf '%s\n' "$issues"; else printf -- '- (없음)\n'; fi
  } >"$notes"
  notes_from="마일스톤의 목표와 닫힌 이슈"
fi

# 이미 더 높은 버전의 릴리스가 있으면 Latest 로 표시하지 않아요
highest=$({
  gh api --paginate "repos/$repo/releases?per_page=100" --jq '.[] | select(.draft == false and .prerelease == false) | .tag_name'
  echo "$tag"
} | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n 1)
latest=true
if [ "$highest" != "$tag" ]; then latest=false; fi

summary() {
  echo "마일스톤: #$number $title"
  echo "태그: $tag → ${target:0:7} ($branch, 닫은 때 $closed_at)"
  echo "Latest 표시: $latest (지금 가장 높은 버전: $highest)"
  echo "노트: $notes_from"
}
summary
echo "----- 릴리스 노트 -----"
cat "$notes"
echo "----------------------"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo '```'; summary; echo '```'; } >>"$GITHUB_STEP_SUMMARY"
fi

if [ "${DRY_RUN:-}" = "1" ]; then
  echo "DRY_RUN: 태그·릴리스를 만들지 않았어요."
  exit 0
fi

gh release create "$tag" --repo "$repo" --target "$target" --title "$title" --notes-file "$notes" --latest="$latest"
echo "만들었어요: $tag"
