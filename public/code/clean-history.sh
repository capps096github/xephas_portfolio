#!/usr/bin/env bash
# ==============================================================================
# clean-history.sh: remove files and secrets from EVERY branch and tag of a
#                   repo, through its entire git history
#
# Apta Innovations Limited. Full guide: https://xephas.me/code/prepare/
#
# WHY
#   A sale includes the full .git history of every branch and tag: the export
#   has no branch filter. Anything that was ever committed on any of them ships,
#   even if a later commit deleted it and .gitignore now ignores it. The only
#   way out is to rewrite history, on every branch and tag at once, which is
#   what this script does, safely.
#
# USAGE
#   bash clean-history.sh <repo-url-or-path> [paths or globs to remove...]
#
#   Use the repo URL (a fresh copy of what is on GitHub/GitLab). A local path
#   works too, but only branches that exist in that clone are cleaned.
#
# EXAMPLES
#   See what would be removed, change nothing:
#     DRY_RUN=1 bash clean-history.sh https://github.com/<github-username>/<repo>.git .env build/
#
#   Remove files and folders from every commit on every branch and tag:
#     bash clean-history.sh https://github.com/<github-username>/<repo>.git .env android/app/build/ '*.jks'
#
#   Also replace secret strings everywhere in history (the file keeps existing):
#     SECRETS_FILE=secrets.txt bash clean-history.sh https://github.com/<github-username>/<repo>.git
#   secrets.txt holds one rule per line:   the-real-value==>YOUR_API_KEY
#   Example: https://xephas.me/code/secrets.example.txt
#
# ALWAYS REMOVED (turn off with DEFAULTS=0)
#   AI tooling: CLAUDE.md, AGENTS.md, GEMINI.md, copilot-instructions.md,
#   .cursorrules, .clinerules, .windsurfrules, .cursor/, .claude/, .windsurf/,
#   .aider*, .remember/, llm-guides/.  Machine files: .DS_Store,
#   local.properties, Generated.xcconfig, flutter_export_environment.sh,
#   ephemeral/, xcuserdata/.  Home paths: /Users/<name>/ and /home/<name>/
#   are rewritten to /Users/you/ and /home/you/.
#   Only the named FILE is removed. .github/copilot-instructions.md goes,
#   the rest of .github/ (your CI workflows) stays.
#
# WHAT IS KEPT
#   Every commit, with its message, author, author date and committer date.
#   Only the commit IDs change: an ID is a hash of the content. A commit whose
#   only change was a removed file stays, as an empty commit. To drop those
#   instead, set PRUNE_EMPTY=1 (the commit count then goes down; say so in the
#   form).
#
# SAFETY
#   1. Works on a fresh copy in ./<name>-clean.git. Your repo is never changed.
#   2. Never pushes. It prints the force-push commands, one per branch and tag,
#      each pinned to the SHA the remote holds now, for you to run yourself.
#      Make the backup first: https://xephas.me/code/prepare/#step-1
#   3. Verifies every branch and tag: same commits, authors and dates as
#      before, removed paths gone, and the files that differ at each tip.
#
# NEEDS
#   git, python3 and git-filter-repo:
#     brew install git-filter-repo   (macOS)
#     pip install git-filter-repo    (any OS)
#   macOS/Linux terminal, or Git Bash / WSL on Windows.
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  sed -n '2,61p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
fi

SOURCE="$1"; shift
REMOVE=("$@")
DRY_RUN="${DRY_RUN:-0}"
DEFAULTS="${DEFAULTS:-1}"
PRUNE_EMPTY="${PRUNE_EMPTY:-0}"
SECRETS_FILE="${SECRETS_FILE:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Local path or URL?
if [ -d "$SOURCE" ]; then
  SOURCE="$(cd "$SOURCE" && pwd)"
  NAME="$(basename "$SOURCE" .git)"
  REMOTE_URL="$(git -C "$SOURCE" remote get-url origin 2>/dev/null || echo '')"
else
  NAME="$(basename "$SOURCE" .git)"
  REMOTE_URL="$SOURCE"
fi
OUT="${OUT_DIR:-$PWD/${NAME}-clean.git}"

if [ "$PRUNE_EMPTY" = "1" ]; then
  PRUNE_ARGS=(--prune-empty always --prune-degenerate auto)
else
  PRUNE_ARGS=(--prune-empty never --prune-degenerate never)
fi

DEFAULT_REGEX=(
  '(?i)(^|.*/)(CLAUDE\.md|AGENTS\.md|GEMINI\.md|copilot-instructions\.md|\.cursorrules|\.clinerules|\.windsurfrules)$'
  '(^|.*/)\.(cursor|claude|windsurf|remember)/.*'
  '(^|.*/)\.aider[^/]*(/.*)?$'
  '(^|.*/)llm-guides/.*'
  '(^|.*/)\.DS_Store$'
  '(^|.*/)(local\.properties|Generated\.xcconfig|flutter_export_environment\.sh)$'
  '(^|.*/)(ephemeral|xcuserdata)/.*'
)

echo "=============================================================="
echo " History clean-up, every branch and tag: $NAME"
echo "=============================================================="
echo " Source   : $SOURCE"
echo " Output   : $OUT"
echo " Removing : ${REMOVE[*]:-(nothing extra)}"
[ "$DEFAULTS" = "1" ] && echo "            + AI tooling, machine files, home paths (DEFAULTS=1)"
[ -n "$SECRETS_FILE" ] && echo " Secrets  : $SECRETS_FILE"
[ "$PRUNE_EMPTY" = "1" ] && echo " Commits  : PRUNE_EMPTY=1, commits left empty are dropped"
[ "$DRY_RUN" = "1" ] && echo " MODE     : DRY RUN, nothing is rewritten"
echo "=============================================================="
echo

# --- Preflight ----------------------------------------------------------------
command -v python3 >/dev/null 2>&1 || { echo "ERROR: python3 not found."; exit 1; }
if ! git filter-repo --version >/dev/null 2>&1; then
  echo "ERROR: git-filter-repo not found. Install it:"
  echo "  brew install git-filter-repo    or    pip install git-filter-repo"
  exit 1
fi
if [ -n "$SECRETS_FILE" ]; then
  [ -f "$SECRETS_FILE" ] || { echo "ERROR: SECRETS_FILE not found: $SECRETS_FILE"; exit 1; }
  SECRETS_FILE="$(cd "$(dirname "$SECRETS_FILE")" && pwd)/$(basename "$SECRETS_FILE")"
fi
if [ -e "$OUT" ]; then
  if [ -f "$OUT/.clean-history" ]; then
    rm -rf "$OUT"
  else
    echo "ERROR: $OUT already exists and was not made by this script. Move it or set OUT_DIR."
    exit 1
  fi
fi

# --- Copy ---------------------------------------------------------------------
echo "[1/5] Copying every branch and tag (your original is not touched)..."
# --bare takes branches and tags only, not GitHub's read-only refs/pull/*
# (those can't be pushed back, so there is nothing to clean them into).
# --no-local forces a real copy, so nothing is shared with your original.
git clone --bare --no-local --quiet "$SOURCE" "$OUT"
touch "$OUT/.clean-history"
if [ -d "$SOURCE" ]; then
  # Branches that exist only as origin/<name> in your local clone.
  git -C "$OUT" fetch --quiet "$SOURCE" '+refs/remotes/origin/*:refs/remotes/src/*' 2>/dev/null || true
  git -C "$OUT" for-each-ref --format='%(refname)' refs/remotes/src | while read -r ref; do
    b="${ref#refs/remotes/src/}"
    [ "$b" = "HEAD" ] || git -C "$OUT" show-ref --verify --quiet "refs/heads/$b" ||
      git -C "$OUT" update-ref "refs/heads/$b" "$ref"
    git -C "$OUT" update-ref -d "$ref"
  done
fi
# Only branches and tags are cleaned and pushed back; drop anything else in the copy.
git -C "$OUT" for-each-ref --format='%(refname)' | while read -r ref; do
  case "$ref" in refs/heads/* | refs/tags/*) ;; *) git -C "$OUT" update-ref -d "$ref" ;; esac
done
git -C "$OUT" for-each-ref --format='%(refname)' refs/heads refs/tags >"$OUT/.refs"
N_HEADS=$(grep -c '^refs/heads/' "$OUT/.refs" || true)
N_TAGS=$(grep -c '^refs/tags/' "$OUT/.refs" || true)
BEFORE=$(git -C "$OUT" rev-list --count --branches --tags)
echo "      $BEFORE commits across $N_HEADS branch(es) and $N_TAGS tag(s):"
sed -n 's#^refs/heads/#        branch  #p; s#^refs/tags/#        tag     #p' "$OUT/.refs"
echo

# Record each ref's commits (author, dates, subject) before the rewrite.
mkdir -p "$OUT/.before"
while read -r ref; do
  f="$OUT/.before/$(printf '%s' "$ref" | tr '/' '_')"
  git -C "$OUT" log --format='%an|%ae|%ad|%cd|%s' --date=raw "$ref" >"$f" 2>/dev/null || : >"$f"
  git -C "$OUT" ls-tree -r "$ref" >"$f.tip" 2>/dev/null || : >"$f.tip"
done <"$OUT/.refs"

# --- Build the filter -----------------------------------------------------------
ARGS=(--force --invert-paths "${PRUNE_ARGS[@]}")
if [ "$DEFAULTS" = "1" ]; then
  for r in "${DEFAULT_REGEX[@]}"; do ARGS+=(--path-regex "$r"); done
fi
for p in ${REMOVE[@]+"${REMOVE[@]}"}; do
  case "$p" in
    *'*'* | *'?'* | *'['*) ARGS+=(--path-glob "$p") ;;
    *) ARGS+=(--path "${p%/}") ;;
  esac
done

REPLACE="$OUT/.clean-history-replacements"
: >"$REPLACE"
if [ "$DEFAULTS" = "1" ]; then
  printf '%s\n' 'regex:/Users/(?!you/|Shared/)[A-Za-z0-9._-]+/==>/Users/you/' \
    'regex:/home/(?!you/|runner/)[A-Za-z0-9._-]+/==>/home/you/' >>"$REPLACE"
fi
# git-filter-repo reads every line as a rule, so drop comments and blank lines.
if [ -n "$SECRETS_FILE" ]; then
  grep -vE '^[[:space:]]*(#|$)' "$SECRETS_FILE" >>"$REPLACE" || true
fi

# --- Report -------------------------------------------------------------------
echo "[2/5] Finding what will be removed (every branch and tag)..."
git -C "$OUT" rev-list --objects --branches --tags | awk 'NF>1 {sub(/^[^ ]+ /, ""); print}' | sort -u >"$OUT/.paths-before"
python3 - "$OUT/.paths-before" "$DEFAULTS" "${DEFAULT_REGEX[@]}" -- ${REMOVE[@]+"${REMOVE[@]}"} >"$OUT/.matches" <<'PY'
import re, sys, fnmatch
paths = open(sys.argv[1]).read().splitlines()
defaults = sys.argv[2] == "1"
rest = sys.argv[3:]
sep = rest.index("--")
regexes = [re.compile(r) for r in rest[:sep]] if defaults else []
user = rest[sep + 1:]
def hit(p):
    if any(r.match(p) for r in regexes):
        return True
    for u in user:
        if any(c in u for c in "*?["):
            if fnmatch.fnmatch(p, u):
                return True
        else:
            u = u.rstrip("/")
            if p == u or p.startswith(u + "/"):
                return True
    return False
for p in paths:
    if hit(p):
        print(p)
PY
N_MATCH=$(wc -l <"$OUT/.matches" | tr -d ' ')
echo "      $N_MATCH path(s) in history will be removed:"
head -25 "$OUT/.matches" | sed 's/^/        /'
[ "$N_MATCH" -gt 25 ] && echo "        ... and $((N_MATCH - 25)) more"
REPL_RULES=$(grep -c . "$REPLACE" || true)
echo "      $REPL_RULES string replacement rule(s) will be applied."
echo

if [ "$DRY_RUN" = "1" ]; then
  rm -rf "$OUT"
  echo "DRY RUN: stopping here. Run again without DRY_RUN=1 to rewrite."
  exit 0
fi
if [ "$N_MATCH" = "0" ] && [ "$REPL_RULES" = "0" ]; then
  rm -rf "$OUT"
  echo "Nothing to remove or replace. History is already clean for these rules."
  exit 0
fi

# --- Rewrite ------------------------------------------------------------------
echo "[3/5] Rewriting every branch and tag..."
# --invert-paths means REMOVE these paths. Without it, --path means "keep ONLY
# these", which would delete the rest of the repository. No --refs: every
# branch and tag in the copy is rewritten in the same pass.
[ "$N_MATCH" != "0" ] && git -C "$OUT" filter-repo "${ARGS[@]}" >/dev/null
[ "$REPL_RULES" != "0" ] && git -C "$OUT" filter-repo --force "${PRUNE_ARGS[@]}" --replace-text "$REPLACE" >/dev/null
git -C "$OUT" reflog expire --expire=now --all
git -C "$OUT" gc --prune=now --quiet
echo "      done."
echo

# --- Verify -------------------------------------------------------------------
echo "[4/5] Verifying each branch and tag..."
git -C "$OUT" for-each-ref --format='%(refname)' refs/heads refs/tags >"$OUT/.refs-after"
mkdir -p "$OUT/.after"
while read -r ref; do
  f="$OUT/.after/$(printf '%s' "$ref" | tr '/' '_')"
  git -C "$OUT" log --format='%an|%ae|%ad|%cd|%s' --date=raw "$ref" >"$f" 2>/dev/null || : >"$f"
  git -C "$OUT" ls-tree -r "$ref" >"$f.tip" 2>/dev/null || : >"$f.tip"
done <"$OUT/.refs-after"
AFTER=$(git -C "$OUT" rev-list --count --branches --tags)
git -C "$OUT" rev-list --objects --branches --tags | awk 'NF>1 {sub(/^[^ ]+ /, ""); print}' | sort -u >"$OUT/.paths-after"
HOME_LEFT=$(git -C "$OUT" log --branches --tags -p --no-color --format= 2>/dev/null |
  grep -E '^\+' | grep -oE '/Users/[A-Za-z0-9._-]+/|/home/[A-Za-z0-9._-]+/' |
  grep -cvE '/Users/(you|Shared)/|/home/(you|runner)/' || true)

set +e
python3 - "$OUT" "$PRUNE_EMPTY" "$BEFORE" "$AFTER" "$HOME_LEFT" "$DEFAULTS" <<'PY'
import os, sys
out, prune, before, after, home_left, defaults = sys.argv[1], sys.argv[2] == "1", int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6] == "1"
rc = 0
refs_before = open(os.path.join(out, ".refs")).read().split()
refs_after = set(open(os.path.join(out, ".refs-after")).read().split())
def key(ref): return ref.replace("/", "_")
def tip(path):
    res = {}
    for line in open(path, errors="replace"):
        meta, _, p = line.rstrip("\n").partition("\t")
        parts = meta.split()
        if len(parts) == 3 and parts[1] == "blob":
            res[p] = parts[2]
    return res

print(f"      Commits, all branches and tags: {after} (was {before})")
if not prune and after != before:
    print("      *** commit count changed. Do NOT push. ***"); rc = 1
elif prune and after != before:
    print(f"      {before - after} commit(s) dropped (PRUNE_EMPTY=1). Mention the number in the form.")

matches = set(open(os.path.join(out, ".matches")).read().splitlines())
left = sorted(matches & set(open(os.path.join(out, ".paths-after")).read().splitlines()))
if left:
    print(f"      *** {len(left)} removed path(s) still present. Do NOT push: ***")
    for p in left[:10]: print(f"        {p}")
    rc = 1
else:
    print("      Removed paths are gone from every commit on every branch and tag.")
if defaults:
    if home_left:
        print(f"      *** {home_left} home-folder path line(s) still in history. ***"); rc = 1
    else:
        print("      No home-folder paths left in history.")
print()

for ref in refs_before:
    name = ref.split("/", 2)[2]
    kind = "branch" if ref.startswith("refs/heads/") else "tag"
    if ref not in refs_after:
        print(f"      {kind} {name}: *** MISSING after the rewrite. Do NOT push. ***"); rc = 1; continue
    b = open(os.path.join(out, ".before", key(ref))).read().splitlines()
    a = open(os.path.join(out, ".after", key(ref))).read().splitlines()
    if prune:
        kept = "ok" if set(a) <= set(b) else "*** commits changed ***"
        if kept != "ok": rc = 1
        line = f"{len(a)} commits (was {len(b)}), authors/dates {kept}"
    else:
        same = a == b
        if not same: rc = 1
        line = f"{len(a)} commits, messages/authors/dates {'identical' if same else '*** DIFFER ***'}"
    tb, ta = tip(os.path.join(out, ".before", key(ref) + ".tip")), tip(os.path.join(out, ".after", key(ref) + ".tip"))
    gone = sorted(set(tb) - set(ta)); changed = sorted(p for p in set(tb) & set(ta) if tb[p] != ta[p])
    added = sorted(set(ta) - set(tb))
    if added: rc = 1
    ri = "run_instruction.md yes" if "run_instruction.md" in ta else "run_instruction.md MISSING"
    print(f"      {kind:6} {name}: {line}; tip: {len(gone)} removed, {len(changed)} changed; {ri}")
    for label, items in (("removed", gone), ("changed", changed), ("*** ADDED ***", added)):
        for p in items[:8]: print(f"          {label}: {p}")
        if len(items) > 8: print(f"          ... and {len(items) - 8} more {label}")
sys.exit(rc)
PY
VERIFY_RC=$?
set -e
rm -rf "$OUT/.before" "$OUT/.after" "$OUT"/.paths-before "$OUT"/.paths-after "$OUT"/.matches "$OUT"/.refs-after
echo
if [ "$VERIFY_RC" -ne 0 ]; then
  echo "=============================================================="
  echo " VERIFICATION FAILED. Do not push."
  echo " Nothing outside $OUT was changed."
  echo "=============================================================="
  exit 1
fi
echo "      Check the removed/changed lists above: nothing else should be there."
echo

if [ -f "$SCRIPT_DIR/check-repo.sh" ]; then
  echo "[5/5] Re-checking the cleaned copy with check-repo.sh..."
  echo
  bash "$SCRIPT_DIR/check-repo.sh" "$OUT" || true
else
  echo "[5/5] Download check-repo.sh next to this script to re-check automatically:"
  echo "      https://xephas.me/code/check-repo.sh"
fi

# --- Push commands ------------------------------------------------------------
# Each line is pinned to the SHA the remote holds right now (read-only ls-remote),
# so a push fails instead of overwriting something that changed since.
URL="${REMOTE_URL:-<your-repo-url>}"
REMOTE_REFS="$OUT/.remote-refs"
: >"$REMOTE_REFS"
if [ -n "$REMOTE_URL" ]; then
  git ls-remote --heads --tags "$REMOTE_URL" 2>/dev/null | grep -v '\^{}$' >"$REMOTE_REFS" || true
fi
remote_sha() { awk -v r="$1" '$2==r {print $1}' "$REMOTE_REFS"; }

echo
echo "=============================================================="
echo " Cleaned copy: $OUT"
echo " Nothing has been pushed."
echo
echo " 1. INSPECT IT FIRST"
echo "      git -C \"$OUT\" log --all --oneline | head -30"
echo "      bash check-repo.sh \"$OUT\""
echo
echo " 2. MAKE SURE YOUR BACKUP EXISTS (guide step 1). The push below overwrites"
echo "    the remote and can't be undone there; the backup is the way back."
echo
echo " 3. MERGE OR CLOSE OPEN PULL REQUESTS before pushing (guide step 3)."
echo
echo " 4. FORCE-PUSH EVERY BRANCH AND TAG IN PLACE (yours to run, from $OUT)."
echo "    Run the first line alone and check it, then the rest. A line fails"
echo "    with 'stale info' if the remote changed since this run: re-run the script."
echo
FIRST=1
LINES=()
while read -r ref; do
  sha=$(remote_sha "$ref")
  # Unknown remote: placeholder. Known remote without this ref: an empty lease
  # means "only if it doesn't exist there yet".
  [ -n "$sha" ] || [ -s "$REMOTE_REFS" ] || sha="<current-remote-sha>"
  LINES+=("git -C \"$OUT\" push --force-with-lease=$ref:$sha $URL $ref:$ref")
done <"$OUT/.refs"
for i in "${!LINES[@]}"; do
  if [ "$FIRST" = "1" ]; then
    echo "      ${LINES[$i]}"
    echo
    FIRST=0
  elif [ "$i" -lt $((${#LINES[@]} - 1)) ]; then
    echo "      ${LINES[$i]} && \\"
  else
    echo "      ${LINES[$i]}"
  fi
done
# Anything on the remote that this run did not clean would ship dirty.
if [ -s "$REMOTE_REFS" ]; then
  awk '{print $2}' "$REMOTE_REFS" | sort -u | comm -23 - <(sort -u "$OUT/.refs") >"$OUT/.not-cleaned" || true
  if [ -s "$OUT/.not-cleaned" ]; then
    echo
    echo "    *** On the remote but NOT cleaned by this run (they would ship as they are):"
    sed 's/^/          /' "$OUT/.not-cleaned"
    echo "    Re-run with the repo URL, or delete them from the remote if they are"
    echo "    backups:  git push $URL --delete <branch-or-tag>"
  fi
  rm -f "$OUT/.not-cleaned"
fi
cat <<EOF

 5. DELETE ANY BACKUP OR PRE-CLEAN BRANCHES FROM THE REMOTE before the export:
    the export ships every branch, so a backup there ships the old history.
      git push $URL --delete <backup-branch>
    Keep your offline backup (mirror or bundle) until the sale is done.

 6. AFTER THE PUSH
    - Every existing clone is stale. You and every collaborator must re-clone;
      a git pull would merge the old history back in.
    - Check a fresh copy:  git clone --mirror $URL check.git
                           bash check-repo.sh check.git
    - List the pull request refs and send the output with your report:
        git ls-remote $URL 'refs/pull/*'
      GitHub never rewrites them and you can't delete them, so they still hold
      each pull request's pre-clean files, and the export includes them.
      Rotating every secret makes those copies useless; personal data there
      is decided with you on the call.
    - Rotate every real secret you scrubbed: it still exists in your backup
      and may survive in refs/pull/*.
==============================================================
EOF
rm -f "$REMOTE_REFS"
