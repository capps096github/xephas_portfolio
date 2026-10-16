#!/usr/bin/env bash
# ==============================================================================
# build-archive.sh: build the delivery archive on the handover call
#
# Apta Innovations Limited. Full guide: https://xephas.me/code/prepare/
#
# WHAT HAPPENS ON THE CALL
#   You invite us to the repo with Read access. On the call we run this script,
#   and you see every step. It:
#     1. copies the cleaned_version branch with its full commit history
#        (delivered as main). Your other branches are not copied.
#     2. exports the pull requests, their reviews and comments (GitHub)
#     3. runs check-repo.sh on the copy
#     4. packs it as <name>.tar.gz and verifies it by unpacking it again
#     5. prints a receipt with the archive's SHA-256 fingerprint
#   Payment is released on the call once the archive passes.
#
# IT ONLY READS YOUR REPO
#   Read access is all it needs. It never pushes or changes your repository.
#
# USAGE
#   bash build-archive.sh <repo-url> [output-folder]
#     bash build-archive.sh https://github.com/owner/app.git ~/Deliveries
#
# NEEDS
#   git, tar, gzip, and the GitHub CLI (gh, logged in) for pull requests.
#   check-repo.sh in the same folder.
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
fi

URL="$1"
SOURCE_BRANCH="${SOURCE_BRANCH:-cleaned_version}"
ARCHIVE_BRANCH="${ARCHIVE_BRANCH:-main}"
OUT_ROOT="${2:-$PWD}"
mkdir -p "$OUT_ROOT"
OUT_ROOT="$(cd "$OUT_ROOT" && pwd)"
NAME="$(basename "$URL" .git)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date '+%Y%m%d-%H%M')"
ARCHIVE="$OUT_ROOT/${NAME}.tar.gz"
REPORT="$OUT_ROOT/${NAME}-check-${STAMP}.txt"
RECEIPT="$OUT_ROOT/${NAME}-receipt-${STAMP}.txt"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/build-archive.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
STAGE="$WORK/stage"
REPO="$STAGE/$NAME"
mkdir -p "$STAGE"

sha256() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

echo "=============================================================="
echo " Building delivery archive: $NAME"
echo "=============================================================="
echo " Repo   : $URL"
echo " Output : $ARCHIVE"
echo "=============================================================="
echo

[ -e "$ARCHIVE" ] && { echo "ERROR: $ARCHIVE already exists. Move it first."; exit 1; }

# --- 1. Copy ------------------------------------------------------------------
echo "[1/5] Copying the $SOURCE_BRANCH branch and its full history..."
# Only the cleaned branch. The seller's other branches and GitHub's pull/*
# refs still hold the history from before the clean-up, so they are left out
# on purpose; the pull requests travel as JSON instead (step 2).
if ! git ls-remote --exit-code --heads "$URL" "$SOURCE_BRANCH" >/dev/null 2>&1; then
  echo "ERROR: no branch named $SOURCE_BRANCH on $URL (or no read access yet)."
  echo "       The seller creates it with clean-history.sh: https://xephas.me/code/prepare/"
  exit 1
fi
git clone --bare --quiet --single-branch --no-tags --branch "$SOURCE_BRANCH" "$URL" "$REPO/.git"
if [ "$SOURCE_BRANCH" != "$ARCHIVE_BRANCH" ]; then
  git -C "$REPO" branch -m "$SOURCE_BRANCH" "$ARCHIVE_BRANCH"
fi
git -C "$REPO" config --bool core.bare false
git -C "$REPO" remote remove origin 2>/dev/null || true
git -C "$REPO" reset --hard --quiet
COMMITS=$(git -C "$REPO" rev-list --count --all)
BRANCHES=$(git -C "$REPO" for-each-ref --format='%(refname:short)' refs/heads | tr '\n' ' ')
DEFAULT=$(git -C "$REPO" symbolic-ref --short HEAD)
TAGS=$(git -C "$REPO" tag | wc -l | tr -d ' ')
echo "      $COMMITS commits, $TAGS tags, default branch $DEFAULT"
echo "      branches: $BRANCHES"
echo

# --- 2. Pull requests -------------------------------------------------------------
echo "[2/5] Exporting pull requests..."
PRS="n/a"
SLUG=$(printf '%s' "$URL" | sed -nE 's#^(https://|git@)github\.com[:/]([^/]+/[^/]+)$#\2#p' | sed 's/\.git$//')
if [ -z "$SLUG" ]; then
  echo "      Not a GitHub URL. Export pull/merge requests from the host by hand."
elif ! command -v gh >/dev/null 2>&1 || ! gh auth status >/dev/null 2>&1; then
  echo "      gh is not installed or not logged in. Skipping. (gh auth login)"
else
  PR_DIR="$REPO/pull_requests"
  mkdir -p "$PR_DIR"
  FIELDS="number,title,body,state,isDraft,author,createdAt,updatedAt,closedAt,mergedAt,mergedBy,baseRefName,headRefName,labels,url,additions,deletions,changedFiles,comments,reviews,commits,mergeCommit"
  if ! gh pr list -R "$SLUG" --state all --limit 100000 --json "$FIELDS" >"$PR_DIR/pull_requests.json" 2>/dev/null; then
    gh pr list -R "$SLUG" --state all --limit 100000 \
      --json number,title,body,state,author,createdAt,closedAt,mergedAt,baseRefName,headRefName,url,comments,reviews >"$PR_DIR/pull_requests.json"
  fi
  gh api --paginate "repos/$SLUG/pulls/comments?per_page=100" --jq '.[]' >"$PR_DIR/review_comments.jsonl" 2>/dev/null || true
  PRS=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))))' "$PR_DIR/pull_requests.json" 2>/dev/null ||
    grep -o '"number":' "$PR_DIR/pull_requests.json" | wc -l | tr -d ' ')
  RC=$(wc -l <"$PR_DIR/review_comments.jsonl" | tr -d ' ')
  # Keep the export out of `git status`, so the delivered repo reads clean.
  echo "pull_requests/" >>"$REPO/.git/info/exclude"
  echo "      $PRS pull requests, $RC inline review comments -> pull_requests/"
fi
echo

# --- 3. Check ------------------------------------------------------------------
echo "[3/5] Running check-repo.sh..."
CHECK="not run"
if [ -f "$SCRIPT_DIR/check-repo.sh" ]; then
  if bash "$SCRIPT_DIR/check-repo.sh" "$REPO" >"$REPORT" 2>&1; then CHECK="PASSED"; else CHECK="FAILED"; fi
  sed -n '/^\[/,$p' "$REPORT" | grep -E '^\[|FAIL|WARN|RESULT' | sed 's/^/      /'
  echo "      Full report: $REPORT"
else
  echo "      check-repo.sh not found next to this script. Download it from"
  echo "      https://xephas.me/code/check-repo.sh"
fi
echo

# --- 4. Pack and verify ------------------------------------------------------------
echo "[4/5] Packing and verifying..."
TAR_FLAGS=()
tar --help 2>&1 | grep -q -- '--no-xattrs' && TAR_FLAGS+=(--no-xattrs)
find "$STAGE" -name '.DS_Store' -delete
COPYFILE_DISABLE=1 tar ${TAR_FLAGS[@]+"${TAR_FLAGS[@]}"} -czf "$ARCHIVE" -C "$STAGE" "$NAME"

gzip -t "$ARCHIVE"
mkdir -p "$WORK/verify"
tar -xzf "$ARCHIVE" -C "$WORK/verify"
V="$WORK/verify/$NAME"
V_OK=1
vcheck() { if [ "$2" = "$3" ]; then echo "      ok    $1: $2"; else echo "      FAIL  $1: $2 (expected $3)"; V_OK=0; fi; }
vcheck "top-level folder" "$(ls "$WORK/verify")" "$NAME"
git -C "$V" fsck --connectivity-only --no-progress >/dev/null 2>&1 && vcheck "git fsck" ok ok || vcheck "git fsck" failed ok
vcheck "commits" "$(git -C "$V" rev-list --count --all)" "$COMMITS"
vcheck "branches" "$(git -C "$V" for-each-ref --format='%(refname:short)' refs/heads | tr '\n' ' ')" "$BRANCHES"
vcheck "git status" "$( [ -z "$(git -C "$V" status --porcelain)" ] && echo clean || echo dirty)" clean
vcheck "run_instruction.md" "$( [ -f "$V/run_instruction.md" ] && echo present || echo missing)" present
vcheck "AI tooling files" "$(git -C "$V" rev-list --objects --all | grep -ciE '(^| |/)(CLAUDE\.md|AGENTS\.md|copilot-instructions\.md|\.cursorrules|\.clinerules)$|(^| |/)\.(cursor|claude|windsurf|remember)/' || true)" 0
vcheck "AppleDouble files" "$(find "$V" -name '._*' | wc -l | tr -d ' ')" 0
SIZE=$(du -h "$ARCHIVE" | cut -f1)
SHA=$(sha256 "$ARCHIVE")
echo

# --- 5. Receipt --------------------------------------------------------------------
cat >"$RECEIPT" <<EOF
Delivery receipt: Apta Innovations Limited
------------------------------------------
Repository   : $URL
Branch       : $SOURCE_BRANCH (delivered as $ARCHIVE_BRANCH)
Built        : $(date '+%Y-%m-%d %H:%M %Z')
Archive      : $(basename "$ARCHIVE")
Size         : $SIZE
SHA-256      : $SHA
Commits      : $COMMITS
Branches     : $BRANCHES
Tags         : $TAGS
Pull requests: $PRS
Repo check   : $CHECK
Archive check: $( [ "$V_OK" = 1 ] && echo PASSED || echo FAILED)
EOF
echo "[5/5] Receipt"
sed 's/^/      /' "$RECEIPT"
echo
echo "=============================================================="
if [ "$V_OK" = 1 ] && [ "$CHECK" != "FAILED" ]; then
  echo " READY. Archive and receipt saved in $OUT_ROOT"
  echo " Send the seller the receipt. The SHA-256 identifies this exact file."
else
  echo " NOT READY. Do not release payment. Review $REPORT"
fi
echo "=============================================================="
[ "$V_OK" = 1 ] && [ "$CHECK" != "FAILED" ]
