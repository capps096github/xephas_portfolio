#!/usr/bin/env bash
# ==============================================================================
# submit.sh: turn a seller's repo into a migration archive (.tar.gz)
#   GitHub seller -> GitHub Migration API archive
#   GitLab seller -> GitLab project export
#
# Apta Innovations Limited. Guide: https://xephas.me/code/submit/
#
# WHY IT WORKS THIS WAY
#   Both APIs only export repos you OWN (GitHub) or maintain (GitLab). A
#   collaborator with Read access is rejected. So this script:
#     1. copies the seller's cleaned_version branch (Read access is enough)
#     2. runs check-repo.sh on it, and stops if it fails
#     3. exports the seller's pull/merge requests to JSON
#     4. creates a NEW PRIVATE repo under YOUR account and pushes the branch
#        to it as main
#     5. runs the export on that repo: initiate, poll, download
#     6. unpacks the archive, verifies it, and writes a receipt
#   The seller does nothing beyond the clean-up and the Read invite.
#
# USAGE
#   bash submit.sh <seller-repo-url> [new-repo-name]
#     bash submit.sh https://github.com/seller/their-app.git
#     bash submit.sh https://gitlab.com/seller/their-app.git
#     bash submit.sh https://github.com/seller/their-app.git their-app-offer
#   The platform follows the URL: gitlab.com (or any host with "gitlab" in its
#   name) uses GitLab, everything else GitHub. Override with PLATFORM=.
#
# TOKEN
#   GitHub: a CLASSIC personal access token (ghp_...), scopes repo and user
#           (for an org destination: repo and admin:org). Fine-grained tokens
#           do not work with the Migration API.
#             export GH_MIGRATION_TOKEN=ghp_xxx
#   GitLab: a LEGACY personal access token (glpat-...), scopes api and
#           write_repository.
#             export GITLAB_TOKEN=glpat-xxx
#   Or put them in a file (chmod 600) at ~/.config/code-submit/token, or set
#   TOKEN_FILE. One token per line, bare or as  owner=token  /  gitlab=token
#
# OPTIONS (environment variables)
#   SOURCE_BRANCH=cleaned_version   seller branch to deliver
#   DEST_OWNER=<you>                account or org/group that owns the new repo
#                                   (default: the token's own account)
#   ORG=1                           DEST_OWNER is an organisation (GitHub) or a
#                                   group (GitLab)
#   PLATFORM=github|gitlab          force the platform
#   GITLAB_HOST=gitlab.com          self-hosted GitLab (default: from the URL)
#   OUT_DIR=./submissions           where the archive and receipt go
#   FORCE=1                         continue even if check-repo.sh fails
#
# NEEDS
#   git, curl, python3, tar. check-repo.sh next to this script (downloaded
#   automatically if missing).
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  sed -n '2,54p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
fi

SRC_URL="$1"
SRC_NAME="$(basename "$SRC_URL" .git)"
DEST_NAME="${2:-$SRC_NAME}"
SOURCE_BRANCH="${SOURCE_BRANCH:-cleaned_version}"
IS_ORG="${ORG:-0}"
FORCE="${FORCE:-0}"
OUT_DIR="${OUT_DIR:-$PWD/submissions}"
TOKEN_FILE="${TOKEN_FILE:-${XDG_CONFIG_HOME:-$HOME/.config}/code-submit/token}"
API_VERSION="2022-11-28"
POLL_SECONDS="${POLL_SECONDS:-15}"
MAX_POLLS="${MAX_POLLS:-120}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date '+%Y%m%d-%H%M')"

die() { echo; echo "ERROR: $*"; exit 1; }
# Print one top-level field of the JSON on stdin (empty if missing or not JSON).
json() { python3 -c 'import json,sys; d=json.load(sys.stdin); v=d.get(sys.argv[1], "") if isinstance(d, dict) else ""; print("" if v is None else v)' "$1" 2>/dev/null || true; }
urlenc() { python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"; }
lower() { printf '%s' "$1" | tr 'A-Z' 'a-z'; }
sha256() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

# --- Platform -----------------------------------------------------------------------
# Host of https://host/..., https://user@host/... or git@host:...
SRC_HOST=$(printf '%s' "$SRC_URL" | sed -E 's#^[A-Za-z+]+://##; s#^[^@/]*@##; s#[:/].*$##')
SRC_HOST=$(lower "$SRC_HOST")
if [ -z "${PLATFORM:-}" ]; then
  case "$SRC_HOST" in *gitlab*) PLATFORM=gitlab ;; *) PLATFORM=github ;; esac
fi
case "$PLATFORM" in
  github) GIT_HOST="github.com"; API="https://api.github.com" ;;
  gitlab)
    if [ -z "${GITLAB_HOST:-}" ]; then
      case "$SRC_HOST" in *gitlab*) GITLAB_HOST="$SRC_HOST" ;; *) GITLAB_HOST="gitlab.com" ;; esac
    fi
    GIT_HOST="$GITLAB_HOST"; API="https://$GITLAB_HOST/api/v4" ;;
  *) die "PLATFORM must be github or gitlab, not $PLATFORM." ;;
esac

mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"
ARCHIVE="$OUT_DIR/${DEST_NAME}.tar.gz"
RECEIPT="$OUT_DIR/${DEST_NAME}-receipt-${STAMP}.txt"
REPORT="$OUT_DIR/${DEST_NAME}-check-${STAMP}.txt"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/submit.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

# --- Preflight ----------------------------------------------------------------
for tool in git curl python3 tar; do
  command -v "$tool" >/dev/null 2>&1 || die "$tool not found."
done
[ -e "$ARCHIVE" ] && die "$ARCHIVE already exists. Move it, or pass a different new-repo-name."

if [ "$PLATFORM" = "gitlab" ]; then
  TOKEN="${GITLAB_TOKEN:-}"
  TOK_RE='glpat-[A-Za-z0-9._-]+'
  DEFAULT_RE='^[[:space:]]*((default|gitlab)[[:space:]]*=)?[[:space:]]*glpat-'
else
  TOKEN="${GH_MIGRATION_TOKEN:-}"
  TOK_RE='gh[ps]_[A-Za-z0-9]+'
  DEFAULT_RE='^[[:space:]]*(default[[:space:]]*=)?[[:space:]]*gh[ps]_'
fi
if [ -z "$TOKEN" ] && [ -f "$TOKEN_FILE" ]; then
  PERMS=$(stat -f '%OLp' "$TOKEN_FILE" 2>/dev/null || stat -c '%a' "$TOKEN_FILE" 2>/dev/null || echo "")
  case "$PERMS" in *00) ;; "") ;; *) die "$TOKEN_FILE is readable by others (mode $PERMS). Run: chmod 600 \"$TOKEN_FILE\"" ;; esac
  LINES=$(grep -vE '^[[:space:]]*(#|$)' "$TOKEN_FILE" || true)
  if [ -n "${DEST_OWNER:-}" ]; then
    TOKEN=$(printf '%s\n' "$LINES" | grep -iE "^[[:space:]]*${DEST_OWNER}[[:space:]]*=" | grep -oE "$TOK_RE" | head -1 || true)
  fi
  [ -n "$TOKEN" ] || TOKEN=$(printf '%s\n' "$LINES" | grep -iE "$DEFAULT_RE" | grep -oE "$TOK_RE" | head -1 || true)
fi
if [ -z "$TOKEN" ]; then
  if [ "$PLATFORM" = "gitlab" ]; then
    die "no GitLab token. export GITLAB_TOKEN=glpat-... or add a line  gitlab=glpat-...  to $TOKEN_FILE (chmod 600).
       Legacy token, scopes api + write_repository: https://$GITLAB_HOST/-/user_settings/personal_access_tokens"
  else
    die "no token. export GH_MIGRATION_TOKEN=ghp_... or put it in $TOKEN_FILE (chmod 600).
       Classic token, scopes repo + user: https://github.com/settings/tokens"
  fi
fi
case "$TOKEN" in github_pat_*) die "that is a fine-grained token. The Migration API needs a CLASSIC token (ghp_...)." ;; esac

if [ "$PLATFORM" = "gitlab" ]; then
  api() { curl -sS -L -H "PRIVATE-TOKEN: $TOKEN" "$@"; }
  GIT_USER="oauth2"
  ME=$(api "$API/user" | json username)
else
  api() { curl -sS -L -H "Accept: application/vnd.github+json" -H "Authorization: Bearer $TOKEN" -H "X-GitHub-Api-Version: $API_VERSION" "$@"; }
  GIT_USER="x-access-token"
  ME=$(api "$API/user" | json login)
fi
[ -n "$ME" ] || die "the token was rejected by $GIT_HOST (expired or wrong?)."

# Git over HTTPS with the token, without putting it in a URL or on disk.
GIT_AUTH="Authorization: Basic $(printf '%s:%s' "$GIT_USER" "$TOKEN" | base64 | tr -d '\n')"
git_auth() { git -c credential.helper= -c "http.https://$GIT_HOST/.extraHeader=$GIT_AUTH" "$@"; }
# The seller's repo may sit on another host (PLATFORM override): use your own git login there.
if [ "$SRC_HOST" = "$(lower "$GIT_HOST")" ]; then git_src() { git_auth "$@"; }; else git_src() { git "$@"; }; fi

DEST_OWNER="${DEST_OWNER:-$ME}"
if [ "$IS_ORG" != "1" ] && [ "$(lower "$DEST_OWNER")" != "$(lower "$ME")" ]; then
  die "the token belongs to $ME but DEST_OWNER is $DEST_OWNER. Use a token for $DEST_OWNER, or ORG=1 for an organisation or group."
fi
DEST="$DEST_OWNER/$DEST_NAME"
WEB_URL="https://$GIT_HOST/$DEST"
DEST_URL="$WEB_URL.git"
if [ "$PLATFORM" = "gitlab" ]; then KIND="GitLab project export"; else KIND="GitHub Migration API"; fi

echo "=============================================================="
echo " Submission archive ($KIND)"
echo "=============================================================="
echo " Seller repo : $SRC_URL  (branch $SOURCE_BRANCH)"
echo " New repo    : $DEST on $GIT_HOST (private, created by this script)"
echo " Token       : $ME"
echo " Output      : $ARCHIVE"
echo "=============================================================="
echo

# --- 1. Copy the seller's branch ---------------------------------------------------
echo "[1/6] Copying $SOURCE_BRANCH from the seller's repo..."
git_src ls-remote --exit-code --heads "$SRC_URL" "$SOURCE_BRANCH" >/dev/null 2>&1 ||
  die "no branch $SOURCE_BRANCH on $SRC_URL, or no read access for $ME yet.
       Check the seller pushed it, and that you accepted their invite."
SRC_REPO="$WORK/$DEST_NAME.git"
git_src clone --quiet --bare --single-branch --no-tags --branch "$SOURCE_BRANCH" "$SRC_URL" "$SRC_REPO"
git -C "$SRC_REPO" branch -m "$SOURCE_BRANCH" main
COMMITS=$(git -C "$SRC_REPO" rev-list --count main)
FIRST=$(git -C "$SRC_REPO" log --reverse --format=%ad --date=short main | head -1)
LAST=$(git -C "$SRC_REPO" log -1 --format=%ad --date=short main)
echo "      $COMMITS commits, $FIRST to $LAST"
echo

# --- 2. Check -----------------------------------------------------------------------
echo "[2/6] Running check-repo.sh..."
CHECK_SCRIPT="$SCRIPT_DIR/check-repo.sh"
if [ ! -f "$CHECK_SCRIPT" ]; then
  CHECK_SCRIPT="$WORK/check-repo.sh"
  curl -fsSL https://xephas.me/code/check-repo.sh -o "$CHECK_SCRIPT" || die "could not download check-repo.sh"
fi
if bash "$CHECK_SCRIPT" "$SRC_REPO" >"$REPORT" 2>&1; then CHECK="PASSED"; else CHECK="FAILED"; fi
sed -n '/^\[/,$p' "$REPORT" | grep -E '^\[|FAIL|WARN|RESULT' | sed 's/^/      /'
echo "      Full report: $REPORT"
if [ "$CHECK" = "FAILED" ] && [ "$FORCE" != "1" ]; then
  die "check-repo.sh failed. Send the seller the report. Re-run with FORCE=1 to continue anyway."
fi
echo

# --- 3. Pull / merge requests from the seller's repo -------------------------------------
echo "[3/6] Exporting the seller's pull/merge requests..."
PRS="n/a"
PR_FILE="$OUT_DIR/${DEST_NAME}-pull_requests.json"
SRC_SLUG=$(printf '%s' "$SRC_URL" | sed -nE 's#^(https://|ssh://)?([^@/]*@)?[^/:]+[:/](.+)$#\3#p' | sed 's/\.git$//; s#/$##')
if [ "$PLATFORM" = "github" ] && [ "$SRC_HOST" = "github.com" ] && [ -n "$SRC_SLUG" ]; then
  python3 - "$SRC_SLUG" "$TOKEN" "$PR_FILE" <<'PY' || echo "      could not export pull requests (continuing)"
import json, sys, urllib.request
slug, token, out = sys.argv[1:4]
def get_all(path):
    items, url = [], f"https://api.github.com/repos/{slug}/{path}"
    while url:
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"})
        with urllib.request.urlopen(req) as r:
            items += json.load(r)
            nxt = [l.split(";")[0].strip("<> ") for l in r.headers.get("Link", "").split(",") if 'rel="next"' in l]
            url = nxt[0] if nxt else None
    return items
data = {
    "repository": slug,
    "pull_requests": get_all("pulls?state=all&per_page=100"),
    "review_comments": get_all("pulls/comments?per_page=100"),
    "issue_comments": get_all("issues/comments?per_page=100"),
}
json.dump(data, open(out, "w"), indent=2)
print(f"      {len(data['pull_requests'])} pull requests, {len(data['review_comments'])} review comments -> {out}")
PY
  PRS=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["pull_requests"]))' "$PR_FILE" 2>/dev/null || echo "n/a")
  echo "      Note: the archive of the new repo can't carry these; they are saved beside it."
elif [ "$PLATFORM" = "gitlab" ] && [ "$SRC_HOST" = "$(lower "$GITLAB_HOST")" ] && [ -n "$SRC_SLUG" ]; then
  python3 - "$API" "$(urlenc "$SRC_SLUG")" "$TOKEN" "$PR_FILE" "$SRC_SLUG" <<'PY' || echo "      could not export merge requests (continuing)"
import json, sys, urllib.request
api, project, token, out, slug = sys.argv[1:6]
def get_all(url):
    items = []
    while url:
        req = urllib.request.Request(url, headers={"PRIVATE-TOKEN": token})
        with urllib.request.urlopen(req) as r:
            items += json.load(r)
            nxt = [l.split(";")[0].strip("<> ") for l in r.headers.get("Link", "").split(",") if 'rel="next"' in l]
            url = nxt[0] if nxt else None
    return items
mrs = get_all(f"{api}/projects/{project}/merge_requests?state=all&per_page=100")
notes = {str(m["iid"]): get_all(f"{api}/projects/{project}/merge_requests/{m['iid']}/notes?per_page=100") for m in mrs}
data = {"repository": slug, "pull_requests": mrs, "merge_request_notes": notes}
json.dump(data, open(out, "w"), indent=2)
print(f"      {len(mrs)} merge requests, {sum(len(n) for n in notes.values())} comments -> {out}")
PY
  PRS=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["pull_requests"]))' "$PR_FILE" 2>/dev/null || echo "n/a")
  echo "      Note: the export of the new project can't carry these; they are saved beside it."
else
  echo "      The seller's repo is on another host. Export its pull/merge requests by hand."
fi
echo

# --- 4. Create your repo and push -------------------------------------------------------
echo "[4/6] Creating private repo $DEST and pushing..."
if [ "$PLATFORM" = "gitlab" ]; then
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' -H "PRIVATE-TOKEN: $TOKEN" "$API/projects/$(urlenc "$DEST")")
  [ "$STATUS" = "404" ] || die "$DEST already exists on $GIT_HOST. Pass a different new-repo-name as the second argument."
  NS_ID=""
  if [ "$IS_ORG" = "1" ]; then
    NS_ID=$(api "$API/groups/$(urlenc "$DEST_OWNER")" | json id)
    [ -n "$NS_ID" ] || die "group $DEST_OWNER not found, or the token can't see it."
  fi
  BODY=$(python3 -c 'import json,sys; b={"name":sys.argv[1],"path":sys.argv[1],"visibility":"private","description":"Source code: "+sys.argv[2],"initialize_with_readme":False}; sys.argv[3] and b.update(namespace_id=int(sys.argv[3])); print(json.dumps(b))' "$DEST_NAME" "$SRC_NAME" "$NS_ID")
  CREATED=$(api -X POST "$API/projects" -H "Content-Type: application/json" -d "$BODY")
  [ "$(lower "$(printf '%s' "$CREATED" | json path_with_namespace)")" = "$(lower "$DEST")" ] ||
    die "could not create $DEST:
$(printf '%s' "$CREATED" | head -10)"
  PROJECT_ID=$(printf '%s' "$CREATED" | json id)
else
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' -H "Accept: application/vnd.github+json" -H "Authorization: Bearer $TOKEN" -H "X-GitHub-Api-Version: $API_VERSION" "$API/repos/$DEST")
  [ "$STATUS" = "404" ] || die "$DEST already exists. Pass a different new-repo-name as the second argument."
  if [ "$IS_ORG" = "1" ]; then CREATE_URL="$API/orgs/$DEST_OWNER/repos"; else CREATE_URL="$API/user/repos"; fi
  DESC="Source code: $SRC_NAME"
  CREATED=$(api -X POST "$CREATE_URL" -d "{\"name\":\"$DEST_NAME\",\"private\":true,\"description\":\"$DESC\",\"has_issues\":false,\"has_wiki\":false,\"has_projects\":false}")
  [ "$(printf '%s' "$CREATED" | json full_name)" = "$DEST" ] ||
    die "could not create $DEST:
$(printf '%s' "$CREATED" | head -10)"
fi
git_auth -C "$SRC_REPO" push --quiet "$DEST_URL" main:refs/heads/main
REMOTE_HEAD=$(git_auth ls-remote "$DEST_URL" refs/heads/main | cut -f1)
[ "$REMOTE_HEAD" = "$(git -C "$SRC_REPO" rev-parse main)" ] || die "push to $DEST did not land."
echo "      $WEB_URL (main, $COMMITS commits)"
echo

# --- 5. Export --------------------------------------------------------------------------
echo "[5/6] Running the $KIND..."
STATE=""
if [ "$PLATFORM" = "gitlab" ]; then
  EXPORT_BASE="$API/projects/$PROJECT_ID/export"
  MIG_ID="$PROJECT_ID"
  CODE=$(api -X POST -o "$WORK/export.json" -w '%{http_code}' "$EXPORT_BASE")
  [ "$CODE" = "202" ] || die "export did not start (HTTP $CODE):
$(head -c 600 "$WORK/export.json")
       Check the token is a legacy token with scopes api + write_repository."
  echo "      202 Accepted, project id $PROJECT_ID"
  for i in $(seq 1 "$MAX_POLLS"); do
    STATE=$(api "$EXPORT_BASE" | json export_status)
    printf '      [%3d] %s\n' "$i" "${STATE:-unreadable}"
    case "$STATE" in
      finished) break ;;
      failed) die "GitLab reports the export failed." ;;
    esac
    sleep "$POLL_SECONDS"
  done
  [ "$STATE" = "finished" ] || die "still not finished after $((MAX_POLLS * POLL_SECONDS / 60)) minutes. Check later:
       curl -H \"PRIVATE-TOKEN: \$GITLAB_TOKEN\" $EXPORT_BASE
       then download $EXPORT_BASE/download"
  api --fail "$EXPORT_BASE/download" -o "$ARCHIVE"
else
  if [ "$IS_ORG" = "1" ]; then
    MIG_BASE="$API/orgs/$DEST_OWNER/migrations"; MIG_REPO="$DEST_NAME"
  else
    MIG_BASE="$API/user/migrations"; MIG_REPO="$DEST"
  fi
  INIT=$(api -X POST "$MIG_BASE" -d "{\"lock_repositories\":false,\"repositories\":[\"$MIG_REPO\"]}")
  MIG_ID=$(printf '%s' "$INIT" | json id)
  [ -n "$MIG_ID" ] || die "migration did not start:
$(printf '%s' "$INIT" | head -15)
       Check the token is CLASSIC with scopes repo + user (repo + admin:org for ORG=1)."
  echo "      MIGRATION_ID $MIG_ID"
  for i in $(seq 1 "$MAX_POLLS"); do
    STATE=$(api "$MIG_BASE/$MIG_ID" | json state)
    printf '      [%3d] %s\n' "$i" "${STATE:-unreadable}"
    case "$STATE" in
      exported) break ;;
      failed) die "GitHub reports the migration failed." ;;
    esac
    sleep "$POLL_SECONDS"
  done
  [ "$STATE" = "exported" ] || die "still not exported after $((MAX_POLLS * POLL_SECONDS / 60)) minutes. Check later:
       curl -L -H \"Authorization: Bearer \$GH_MIGRATION_TOKEN\" $MIG_BASE/$MIG_ID
       then download $MIG_BASE/$MIG_ID/archive"
  api --fail "$MIG_BASE/$MIG_ID/archive" -o "$ARCHIVE"
fi
echo "      downloaded."
echo

# --- 6. Verify ---------------------------------------------------------------------------
echo "[6/6] Verifying the archive..."
OK=1
v() { if [ "$2" = "$3" ]; then echo "      ok    $1: $2"; else echo "      FAIL  $1: $2 (expected $3)"; OK=0; fi; }
gzip -t "$ARCHIVE" 2>/dev/null && v "gzip integrity" ok ok || v "gzip integrity" broken ok
mkdir -p "$WORK/x"
tar -xzf "$ARCHIVE" -C "$WORK/x"
if [ "$PLATFORM" = "gitlab" ]; then
  # A GitLab export carries the repository as a git bundle.
  BUNDLE=$(find "$WORK/x" -maxdepth 3 -type f -name 'project.bundle' | head -1)
  [ -n "$BUNDLE" ] || die "no project.bundle found inside the archive."
  v "project.bundle" present present
  BARE="$WORK/bundle.git"
  git clone --quiet --bare "$BUNDLE" "$BARE"
  META=$(cd "$WORK/x" && ls -d ./* 2>/dev/null | sed 's#./##' | tr '\n' ' ')
else
  BARE=$(find "$WORK/x" -maxdepth 4 -type d -name '*.git' | head -1)
  [ -n "$BARE" ] || die "no repository found inside the archive."
  v "bare repo" "${BARE#"$WORK"/x/}" "repositories/$DEST_OWNER/$DEST_NAME.git"
  META=$(cd "$WORK/x" && ls ./*.json 2>/dev/null | sed 's#./##' | tr '\n' ' ')
fi
v "commits" "$(git -C "$BARE" rev-list --count --all)" "$COMMITS"
v "branches" "$(git -C "$BARE" for-each-ref --format='%(refname:short)' refs/heads | tr '\n' ' ')" "main "
v "run_instruction.md" "$(git -C "$BARE" cat-file -e main:run_instruction.md 2>/dev/null && echo present || echo missing)" present
v "AI tooling files" "$(git -C "$BARE" rev-list --objects --all | grep -ciE '(^| |/)(CLAUDE\.md|AGENTS\.md|GEMINI\.md|copilot-instructions\.md|\.cursorrules|\.clinerules)$|(^| |/)\.(cursor|claude|windsurf|remember)/' || true)" 0
git -C "$BARE" cat-file -e main:FEATURES.md 2>/dev/null && echo "      ok    FEATURES.md: present" || echo "      WARN  FEATURES.md: missing"
SIZE_BYTES=$(wc -c <"$ARCHIVE" | tr -d ' ')
[ "$SIZE_BYTES" -lt 6442450944 ] && v "size under 6 GB" yes yes || v "size under 6 GB" no yes
echo "      contents: $META"
SIZE=$(du -h "$ARCHIVE" | cut -f1)
SHA=$(sha256 "$ARCHIVE")
if [ "$PLATFORM" = "gitlab" ]; then ID_LABEL="Project id   "; else ID_LABEL="Migration id "; fi

cat >"$RECEIPT" <<EOF
Submission receipt: Apta Innovations Limited
--------------------------------------------
Seller repo   : $SRC_URL
Branch        : $SOURCE_BRANCH (delivered as main)
Export        : $KIND
New repo      : $WEB_URL
$ID_LABEL : $MIG_ID
Built         : $(date '+%Y-%m-%d %H:%M %Z')
Archive       : $(basename "$ARCHIVE")
Size          : $SIZE
SHA-256       : $SHA
Commits       : $COMMITS ($FIRST to $LAST)
Pull requests : $PRS (seller repo, saved as JSON beside the archive)
Repo check    : $CHECK
Archive check : $([ "$OK" = 1 ] && echo PASSED || echo FAILED)
EOF
echo
sed 's/^/      /' "$RECEIPT"
echo
echo "=============================================================="
if [ "$OK" = 1 ]; then
  echo " READY: $ARCHIVE"
  echo " Ready to deliver. The receipt is beside it."
else
  echo " NOT READY: see the FAIL lines above."
fi
echo
echo " The private repo $DEST stays on $GIT_HOST."
echo " Keep it until the submission is accepted."
echo "=============================================================="
[ "$OK" = 1 ]
