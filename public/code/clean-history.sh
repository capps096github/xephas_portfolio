#!/usr/bin/env bash
# ==============================================================================
# clean-history.sh: remove files and secrets from a repo's ENTIRE git history
#
# Apta Innovations Limited. Full guide: https://xephas.me/code/prepare/
#
# WHY
#   A sale includes the full .git history. Anything that was ever committed
#   ships with it, even if a later commit deleted it and .gitignore now ignores
#   it. .gitignore has no effect on history. The only way out is to rewrite
#   history, which is what this script does, safely.
#
# USAGE
#   bash clean-history.sh <repo-url-or-path> [paths or globs to remove...]
#
# EXAMPLES
#   See what would be removed, change nothing:
#     DRY_RUN=1 bash clean-history.sh https://github.com/<github-username>/<repo>.git .env build/
#
#   Remove files and folders from every commit:
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
# SAFETY
#   1. Works on a fresh copy in ./<name>-clean.git. Your repo is never changed.
#   2. Never pushes. It prints the command that pushes the cleaned history to a
#      NEW branch named cleaned_version. Your existing branches stay as they are.
#   3. Verifies: removed paths are gone from every commit, and lists every file
#      that differs at the tip so you can confirm nothing else was lost.
#
# NEEDS
#   git, python3 and git-filter-repo:
#     brew install git-filter-repo   (macOS)
#     pip install git-filter-repo    (any OS)
#   macOS/Linux terminal, or Git Bash / WSL on Windows.
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  sed -n '2,49p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
fi

SOURCE="$1"; shift
REMOVE=("$@")
DRY_RUN="${DRY_RUN:-0}"
# The branch to deliver (default: the repo's default branch), and where it goes.
SOURCE_BRANCH="${SOURCE_BRANCH:-}"
TARGET_BRANCH="cleaned_version"
DEFAULTS="${DEFAULTS:-1}"
SECRETS_FILE="${SECRETS_FILE:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Local path or URL?
if [ -d "$SOURCE" ]; then
  SOURCE="$(cd "$SOURCE" && pwd)"
  NAME="$(basename "$SOURCE" .git)"
  REMOTE_URL="$(git -C "$SOURCE" remote get-url origin 2>/dev/null || echo '<your-repo-url>')"
else
  NAME="$(basename "$SOURCE" .git)"
  REMOTE_URL="$SOURCE"
fi
OUT="${OUT_DIR:-$PWD/${NAME}-clean.git}"

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
echo " History clean-up: $NAME"
echo "=============================================================="
echo " Source   : $SOURCE"
echo " Output   : $OUT"
echo " Removing : ${REMOVE[*]:-(nothing extra)}"
[ "$DEFAULTS" = "1" ] && echo "            + AI tooling, machine files, home paths (DEFAULTS=1)"
[ -n "$SECRETS_FILE" ] && echo " Secrets  : $SECRETS_FILE"
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
echo "[1/5] Copying the repo (your original is not touched)..."
# --bare takes branches and tags only, not GitHub's read-only pull/* refs.
# --no-local forces a real copy, so nothing is shared with your original.
git clone --bare --no-local --quiet "$SOURCE" "$OUT"
touch "$OUT/.clean-history"
if [ -d "$SOURCE" ]; then
  # Branches that exist only as origin/<name> in your local repo.
  git -C "$OUT" fetch --quiet "$SOURCE" '+refs/remotes/origin/*:refs/remotes/src/*' 2>/dev/null || true
  git -C "$OUT" for-each-ref --format='%(refname)' refs/remotes/src | while read -r ref; do
    b="${ref#refs/remotes/src/}"
    [ "$b" = "HEAD" ] || git -C "$OUT" show-ref --verify --quiet "refs/heads/$b" ||
      git -C "$OUT" update-ref "refs/heads/$b" "$ref"
    git -C "$OUT" update-ref -d "$ref"
  done
fi
[ -n "$SOURCE_BRANCH" ] || SOURCE_BRANCH=$(git -C "$OUT" symbolic-ref --short HEAD)
git -C "$OUT" show-ref --verify --quiet "refs/heads/$SOURCE_BRANCH" ||
  { echo "ERROR: branch $SOURCE_BRANCH not found. Set SOURCE_BRANCH=<branch>."; exit 1; }
git -C "$OUT" symbolic-ref HEAD "refs/heads/$SOURCE_BRANCH"
# Keep only the branch being delivered, so the clean-up, the check and the
# delivery all cover exactly the same history. (Scratch copy only.)
git -C "$OUT" for-each-ref --format='%(refname)' refs/heads refs/tags | while read -r ref; do
  [ "$ref" = "refs/heads/$SOURCE_BRANCH" ] || git -C "$OUT" update-ref -d "$ref"
done
BEFORE=$(git -C "$OUT" rev-list --count --all)
BRANCHES=$(git -C "$OUT" for-each-ref --format='%(refname:short)' refs/heads | tr '\n' ' ')
echo "      $BEFORE commits, branches: $BRANCHES"
echo

# --- Build the filter -----------------------------------------------------------
ARGS=(--force --invert-paths)
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
echo "[2/5] Finding what will be removed..."
git -C "$OUT" rev-list --objects --all | awk 'NF>1 {sub(/^[^ ]+ /, ""); print}' | sort -u >"$OUT/.paths-before"
git -C "$OUT" ls-tree -r HEAD >"$OUT/.tip-before" 2>/dev/null || : >"$OUT/.tip-before"
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
echo "[3/5] Rewriting history..."
# --invert-paths means REMOVE these paths. Without it, --path means "keep ONLY
# these", which would delete the rest of the repository.
[ "$N_MATCH" != "0" ] && git -C "$OUT" filter-repo "${ARGS[@]}" >/dev/null
[ "$REPL_RULES" != "0" ] && git -C "$OUT" filter-repo --force --replace-text "$REPLACE" >/dev/null
git -C "$OUT" reflog expire --expire=now --all
git -C "$OUT" gc --prune=now --quiet
echo "      done."
echo

# --- Verify -------------------------------------------------------------------
echo "[4/5] Verifying..."
AFTER=$(git -C "$OUT" rev-list --count --all)
echo "      Commits: $AFTER (was $BEFORE)"
if [ "$AFTER" != "$BEFORE" ]; then
  echo "      $((BEFORE - AFTER)) commit(s) dropped because they ONLY touched removed files."
  echo "      That is expected. Mention the number when you submit."
fi
git -C "$OUT" rev-list --objects --all | awk 'NF>1 {sub(/^[^ ]+ /, ""); print}' | sort -u >"$OUT/.paths-after"
STILL=$(comm -12 "$OUT/.matches" "$OUT/.paths-after" | wc -l | tr -d ' ')
if [ "$STILL" != "0" ]; then
  echo "      *** $STILL removed path(s) still present. Do NOT push: ***"
  comm -12 "$OUT/.matches" "$OUT/.paths-after" | head -10 | sed 's/^/        /'
  exit 1
fi
echo "      Removed paths are gone from every commit."
git -C "$OUT" ls-tree -r HEAD >"$OUT/.tip-after" 2>/dev/null || : >"$OUT/.tip-after"
python3 - "$OUT/.tip-before" "$OUT/.tip-after" <<'PY'
import sys
def load(f):
    out = {}
    for line in open(f, errors="replace"):
        meta, _, path = line.rstrip("\n").partition("\t")
        parts = meta.split()
        if len(parts) == 3 and parts[1] == "blob":
            out[path] = parts[2]
    return out
before, after = load(sys.argv[1]), load(sys.argv[2])
gone = sorted(set(before) - set(after))
changed = sorted(p for p in set(before) & set(after) if before[p] != after[p])
print(f"      Files at the tip of the default branch: {len(after)} (was {len(before)})")
for label, items in (("removed", gone), ("changed by string replacement", changed)):
    if items:
        print(f"      {len(items)} file(s) {label}. Check this list, nothing else should be here:")
        for p in items[:30]:
            print(f"        {p}")
        if len(items) > 30:
            print(f"        ... and {len(items) - 30} more")
PY
rm -f "$OUT"/.paths-before "$OUT"/.paths-after "$OUT"/.matches "$OUT"/.tip-before "$OUT"/.tip-after
echo

if [ -f "$SCRIPT_DIR/check-repo.sh" ]; then
  echo "[5/5] Re-checking the cleaned copy with check-repo.sh..."
  echo
  bash "$SCRIPT_DIR/check-repo.sh" "$OUT" || true
else
  echo "[5/5] Download check-repo.sh next to this script to re-check automatically:"
  echo "      https://xephas.me/code/check-repo.sh"
fi

cat <<EOF

==============================================================
 Cleaned copy: $OUT
 Nothing has been pushed.

 1. INSPECT IT FIRST
      git -C "$OUT" log --oneline | head -30
      bash check-repo.sh "$OUT"

 2. PUSH IT TO A NEW BRANCH NAMED $TARGET_BRANCH (yours to run)
      git -C "$OUT" push $REMOTE_URL $SOURCE_BRANCH:refs/heads/$TARGET_BRANCH

    This adds one branch, $TARGET_BRANCH, holding the cleaned history of
    $SOURCE_BRANCH ($AFTER commits). Your other branches, your pull requests
    and your own clone are not changed. $TARGET_BRANCH is the only branch
    copied into the sale archive.

    To deliver another branch: SOURCE_BRANCH=<branch> bash clean-history.sh ...

 3. CHECK WHAT YOU PUSHED (a fresh copy of only that branch)
      git clone --bare --single-branch --branch $TARGET_BRANCH $REMOTE_URL check.git
      bash check-repo.sh check.git

    Never merge $TARGET_BRANCH into your other branches: it shares no
    commits with them, and a merge would bring the removed files back.
    If a real secret was ever committed, rotate it: it still exists in
    your original branches.
==============================================================
EOF
