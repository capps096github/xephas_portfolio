#!/usr/bin/env bash
# ==============================================================================
# check-repo.sh: audit a git repository before it is sold
#
# Apta Innovations Limited. Full guide: https://xephas.me/code/prepare/
#
# WHAT IT DOES
#   Checks EVERY branch and tag of your repository, their current files AND
#   their full git history, for everything that must not ship with a sale: AI
#   tooling files, secrets, personal data, build output, machine-specific files
#   and home-folder paths. The export ships every branch and tag, so one dirty
#   branch fails the check. It prints a line per branch and tag, checks that
#   run_instruction.md is on every branch, reports GitHub's refs/pull/* on their
#   own, and reports the facts we ask for: commits, branches, authors, lines of
#   code.
#
# IT IS READ-ONLY
#   It never changes your files, your history or your remote. It only reads.
#
# USAGE
#   bash check-repo.sh <path-to-repo>
#
#   Check a fresh full copy of the remote (every branch, tag and pull ref):
#     git clone --mirror <your-repo-url> myrepo.git
#     bash check-repo.sh myrepo.git
#
#   After cleaning and force-pushing, check a NEW fresh copy the same way:
#     git clone --mirror <your-repo-url> check.git
#     bash check-repo.sh check.git
#
#   Save the report to paste into the form:
#     bash check-repo.sh check.git | tee check-report.txt
#
# NEEDS
#   git, plus cloc (https://github.com/AlDanial/cloc) or scc for the line count.
#   macOS/Linux terminal, or Git Bash / WSL on Windows.
#
# EXIT CODE
#   0 = no failures (warnings may still need a look), 1 = at least one failure.
# ==============================================================================

set -uo pipefail

if [ $# -lt 1 ]; then
  sed -n '2,37p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
fi

REPO="$1"
if ! git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: $REPO is not a git repository."
  exit 2
fi
REPO="$(cd "$REPO" && pwd)"
GIT_DIR="$(cd "$REPO" && cd "$(git rev-parse --git-dir)" && pwd)"
g() { git -C "$REPO" "$@"; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/check-repo.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

FAILS=0
WARNS=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAILS=$((FAILS + 1)); }
warn() { printf '  WARN  %s\n' "$1"; WARNS=$((WARNS + 1)); }
info() { printf '        %s\n' "$1"; }
# Print up to 10 lines of a file, indented, with a count of the rest.
show() {
  local f="$1" n
  n=$(wc -l <"$f" | tr -d ' ')
  head -10 "$f" | sed 's/^/          /'
  [ "$n" -gt 10 ] && echo "          ... and $((n - 10)) more"
  return 0
}

# --- Gather -------------------------------------------------------------------
# Every path that ever existed, in any commit on any branch or tag. GitHub's
# refs/pull/* are left out here and reported on their own in [10].
g rev-list --objects --branches --tags 2>/dev/null | awk 'NF>1 {sub(/^[^ ]+ /, ""); print}' | sort -u >"$TMP/paths"
# Every line ever added, in any commit. Text files only.
g log --branches --tags -p --no-color --no-ext-diff --format='commit %h' 2>/dev/null |
  grep -E '^\+' | grep -vE '^\+\+\+ ' >"$TMP/added"
HEAD_REF=$(g symbolic-ref --short HEAD 2>/dev/null || echo HEAD)
g ls-tree -r --name-only HEAD 2>/dev/null >"$TMP/tip" || : >"$TMP/tip"

echo "=============================================================="
echo " Repository check"
echo "=============================================================="
echo " Path         : $REPO"
echo " Remote       : $(g remote get-url origin 2>/dev/null || echo 'none')"
echo " Default      : $HEAD_REF"
echo " Branches     : $(g for-each-ref --format='%(refname:short)' refs/heads | tr '\n' ' ')"
echo " Tags         : $(g tag | wc -l | tr -d ' ')"
echo " Commits      : $(g rev-list --count --branches --tags) (all branches and tags)"
echo " First commit : $(g log --branches --tags --reverse --format=%ad --date=short | head -1)"
echo " Last commit  : $(g log --branches --tags -1 --format=%ad --date=short)"
echo " Authors      : $(g log --branches --tags --format='%aN <%aE>' | sort -u | wc -l | tr -d ' ')"
echo " .git size    : $(du -sh "$GIT_DIR" 2>/dev/null | cut -f1)"
echo " Files at tip : $(wc -l <"$TMP/tip" | tr -d ' ')"
echo " Generated    : $(date '+%Y-%m-%d %H:%M %Z')"
echo

# --- 0. Every branch and tag --------------------------------------------------
AI_RE='(^|/)(CLAUDE\.md|AGENTS\.md|GEMINI\.md|copilot-instructions\.md|\.cursorrules|\.clinerules|\.windsurfrules)$|(^|/)\.(cursor|claude|windsurf|remember|aider[^/]*)(/|$)|(^|/)llm-guides(/|$)'
SECRET_FILE_RE='(^|/)\.env(\.[^/]*)?$|\.(jks|keystore|p12|pfx|p8|pem|key|mobileprovision)$|(^|/)id_(rsa|dsa|ecdsa|ed25519)$|(^|/)(service[-_]?account[^/]*|[^/]*firebase-adminsdk[^/]*|credentials)\.json$|(^|/)key\.properties$|(^|/)\.npmrc$|(^|/)\.netrc$'
SECRET_RE='AKIA[0-9A-Z]{16}|sk-(proj-|ant-)?[A-Za-z0-9_-]{20,}|sk_live_[0-9A-Za-z]{16,}|rk_live_[0-9A-Za-z]{16,}|gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|xox[abprs]-[A-Za-z0-9-]{10,}|-----BEGIN ([A-Z]+ )?PRIVATE KEY-----|"private_key"[[:space:]]*:|AccountKey=[A-Za-z0-9+/=]{20,}|(storePassword|keyPassword)[[:space:]]*=[[:space:]]*[^[:space:]]+'
echo "[0] Every branch and tag (each one ships in the export)"
printf '        %-6s %-28s %8s %4s %6s %8s  %s\n' kind name commits AI secret-f secret-s run_instruction.md
g for-each-ref --format='%(refname)' refs/heads refs/tags >"$TMP/refs"
: >"$TMP/ri-missing"
while read -r ref; do
  kind=branch; case "$ref" in refs/tags/*) kind=tag ;; esac
  name="${ref#refs/*/}"
  n=$(g rev-list --count "$ref" 2>/dev/null || echo 0)
  g rev-list --objects "$ref" 2>/dev/null | awk 'NF>1 {sub(/^[^ ]+ /, ""); print}' | sort -u >"$TMP/refpaths"
  ai=$(grep -ciE "$AI_RE" "$TMP/refpaths" || true)
  sf=$(grep -iE "$SECRET_FILE_RE" "$TMP/refpaths" | grep -cviE '\.(example|sample|template|dist)$|\.env\.(example|sample|template)' || true)
  ss=$(g log -p --no-color --no-ext-diff --format= "$ref" 2>/dev/null | grep -E '^\+' | grep -cE "$SECRET_RE" || true)
  if g cat-file -e "$ref:run_instruction.md" 2>/dev/null; then ri=yes; else ri=MISSING; [ "$kind" = branch ] && echo "$name" >>"$TMP/ri-missing"; fi
  printf '        %-6s %-28s %8s %4s %6s %8s  %s\n' "$kind" "$name" "$n" "$ai" "$sf" "$ss" "$ri"
done <"$TMP/refs"
info "AI = AI tooling paths, secret-f = secret-type files, secret-s = credential strings,"
info "all counted through that ref's whole history. Every count must be 0 on every row."
info "Tags point at older commits, so run_instruction.md may be missing there; that's fine."
grep -iE '(^|/)(pre-sanitise|pre-clean|pre-rewrite|backup|bak)([/_-]|$)' "$TMP/refs" >"$TMP/backups" || true
if [ -s "$TMP/backups" ]; then
  warn "branches or tags that look like backups. The export ships every branch: delete them"
  info "from the remote before exporting, and keep your backup offline instead:"
  show "$TMP/backups"
fi
if [ "$(g rev-parse --is-bare-repository)" = "false" ]; then
  g for-each-ref --format='%(refname)' refs/remotes/origin | sed 's#^refs/remotes/origin/##' | grep -vx HEAD | sort -u >"$TMP/remote-branches" || true
  sed -n 's#^refs/heads/##p' "$TMP/refs" | sort -u | comm -23 "$TMP/remote-branches" - >"$TMP/unchecked" || true
  if [ -s "$TMP/unchecked" ]; then
    warn "branches that exist only as origin/<name> here were NOT checked. Check a mirror copy:"
    info "git clone --mirror <your-repo-url> check.git && bash check-repo.sh check.git"
    show "$TMP/unchecked"
  fi
fi
echo

# --- 1. AI tooling ------------------------------------------------------------
echo "[1] AI tooling files (tip and history)"
grep -iE "$AI_RE" "$TMP/paths" >"$TMP/ai" || true
if [ -s "$TMP/ai" ]; then
  fail "AI tooling files found in history ($(wc -l <"$TMP/ai" | tr -d ' ')):"
  show "$TMP/ai"
else
  pass "no AI tooling files in any commit"
fi
echo

# --- 2. Secret files ----------------------------------------------------------
echo "[2] Secret and credential files (history)"
grep -iE "$SECRET_FILE_RE" "$TMP/paths" | grep -viE '\.(example|sample|template|dist)$|\.env\.(example|sample|template)' >"$TMP/secretfiles" || true
if [ -s "$TMP/secretfiles" ]; then
  fail "secret-type files found in history ($(wc -l <"$TMP/secretfiles" | tr -d ' ')):"
  show "$TMP/secretfiles"
else
  pass "no .env, keystore, private key or service-account files in any commit"
fi
echo

# --- 3. Secret strings ---------------------------------------------------------
echo "[3] Secret strings (every line ever committed)"
grep -oE "$SECRET_RE" "$TMP/added" | sort | uniq -c | sort -rn >"$TMP/secrets" || true
if [ -s "$TMP/secrets" ]; then
  fail "possible live credentials found ($(wc -l <"$TMP/secrets" | tr -d ' ') distinct). Rotate them, then scrub:"
  show "$TMP/secrets"
else
  pass "no known credential patterns in history"
fi
grep -oE 'AIza[0-9A-Za-z_-]{35}' "$TMP/added" | sort -u >"$TMP/aiza" || true
if [ -s "$TMP/aiza" ]; then
  info "Note: $(wc -l <"$TMP/aiza" | tr -d ' ') Google API key(s) (AIza...) found. Firebase client config keys"
  info "are public identifiers and may stay; any other Google key (Maps server key,"
  info "YouTube, Gemini) is a credential and must be rotated and scrubbed."
fi
echo

# --- 4. Personal data -----------------------------------------------------------
echo "[4] Personal data, PII (every line ever committed; review by hand)"
grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' "$TMP/added" |
  grep -viE '@(example|test|localhost|domain|email|sentry|users\.noreply\.github)\.|noreply|no-reply|@[0-9.]+$|\.(png|jpg|jpeg|gif|svg|webp)$' |
  sort | uniq -c | sort -rn >"$TMP/emails" || true
{
  grep -oE '\+(256|254|255|250|234|233|27|1|44|91)[ -]?[0-9]{3}[ -]?[0-9]{3}[ -]?[0-9]{3,4}' "$TMP/added"
  grep -oE '(^|[^0-9.])07[0-9]{8}([^0-9]|$)' "$TMP/added" | tr -cd '0-9\n'
} | sort | uniq -c | sort -rn >"$TMP/phones" || true
if [ -s "$TMP/emails" ] || [ -s "$TMP/phones" ]; then
  warn "email addresses and phone numbers found. Real users' details must be removed;"
  info "your own work email, support addresses and vendor samples can stay."
  if [ -s "$TMP/emails" ]; then info "Emails ($(wc -l <"$TMP/emails" | tr -d ' ') distinct):"; show "$TMP/emails"; fi
  if [ -s "$TMP/phones" ]; then info "Phone numbers ($(wc -l <"$TMP/phones" | tr -d ' ') distinct):"; show "$TMP/phones"; fi
else
  pass "no email addresses or phone numbers found"
fi
grep -iE '\.(sql|sqlite|sqlite3|db|dump|bak|csv|xlsx)$' "$TMP/paths" >"$TMP/dumps" || true
if [ -s "$TMP/dumps" ]; then
  warn "data files found in history. Make sure none hold real user records:"
  show "$TMP/dumps"
fi
echo

# --- 5. Build output and binaries -------------------------------------------------
echo "[5] Build output, dependencies and large binaries (history)"
grep -E '(^|/)(node_modules|\.dart_tool|\.next|\.astro|\.firebase|\.gradle|Pods|__pycache__|\.venv|venv|\.pub-cache|DerivedData)/|(^|/)\.DS_Store$|\.(zip|tgz|tar\.gz|rar|7z|apk|aab|ipa|exe|dmg)$' "$TMP/paths" >"$TMP/build" || true
if [ -s "$TMP/build" ]; then
  fail "build output, dependencies or binaries in history ($(wc -l <"$TMP/build" | tr -d ' ') paths):"
  awk -F/ '{for (i=1;i<=NF;i++) if ($i ~ /^(node_modules|\.dart_tool|\.next|\.astro|\.firebase|\.gradle|Pods|__pycache__|\.venv|venv|\.pub-cache|DerivedData)$/) {out=$1; for (j=2;j<=i;j++) out=out"/"$j; print out"/"; next}} {print}' "$TMP/build" |
    sort | uniq -c | sort -rn >"$TMP/buildsum"
  show "$TMP/buildsum"
else
  pass "no dependency folders, build caches or packaged binaries in history"
fi
grep -E '(^|/)(build|dist|out|target)/' "$TMP/paths" | grep -vE '(^|/)(src|lib)/' >"$TMP/builddirs" || true
if [ -s "$TMP/builddirs" ]; then
  warn "build/, dist/, out/ or target/ folders in history. Fine if they are source; remove if they are output:"
  awk -F/ '{for (i=1;i<=NF;i++) if ($i ~ /^(build|dist|out|target)$/) {out=$1; for (j=2;j<=i;j++) out=out"/"$j; print out"/"; next}}' "$TMP/builddirs" |
    sort | uniq -c | sort -rn >"$TMP/builddirsum"
  show "$TMP/builddirsum"
fi
info "Largest files ever committed:"
g rev-list --objects --branches --tags | g cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' |
  awk '$1=="blob" && NF>2 {printf "%8.1f MB  %s\n", $2/1048576, substr($0, index($0,$3))}' |
  sort -rn | head -5 | sed 's/^/        /'
echo

# --- 6. Machine-specific files and home paths ----------------------------------------
echo "[6] Machine-specific files and home-folder paths"
grep -E '(^|/)(local\.properties|Generated\.xcconfig|flutter_export_environment\.sh|\.flutter-plugins|\.flutter-plugins-dependencies)$|(^|/)ephemeral/|(^|/)xcuserdata/|\.iml$|(^|/)\.idea/' "$TMP/paths" >"$TMP/local" || true
if [ -s "$TMP/local" ]; then
  fail "machine-specific files in history ($(wc -l <"$TMP/local" | tr -d ' ')):"
  show "$TMP/local"
else
  pass "no machine-specific generated files in history"
fi
grep -oE '/Users/[A-Za-z0-9._-]+/|/home/[A-Za-z0-9._-]+/|[Cc]:\\\\?Users\\\\?[A-Za-z0-9._-]+' "$TMP/added" |
  grep -vE '/Users/(you|yourname|username|user|me|runner|Shared)/|/home/(you|yourname|username|user|runner|node|ubuntu)/' |
  sort | uniq -c | sort -rn >"$TMP/home" || true
if [ -s "$TMP/home" ]; then
  fail "home-folder paths in history ($(awk '{s+=$1} END {print s}' "$TMP/home") lines):"
  show "$TMP/home"
else
  pass "no home-folder paths in history"
fi
echo

# --- 7. Stray repos and symlinks ------------------------------------------------------
echo "[7] Nested repositories and symlinks (tip)"
g ls-files -s 2>/dev/null | awk '$1=="160000" {print $4}' >"$TMP/submods" || true
if [ -s "$TMP/submods" ]; then
  warn "submodules or nested repos (their code is NOT included in the sale):"
  show "$TMP/submods"
else
  pass "no submodules or nested repos"
fi
: >"$TMP/badlinks"
g ls-tree -r HEAD 2>/dev/null | awk '$1=="120000" {print $3"\t"$4}' | while IFS="$(printf '\t')" read -r sha path; do
  target=$(g cat-file -p "$sha")
  case "$target" in
    /*) echo "$path -> $target" >>"$TMP/badlinks" ;;
    *..*)
      depth=$(printf '%s' "$path" | awk -F/ '{print NF-1}')
      ups=$(printf '%s' "$target" | grep -o '\.\./' | wc -l | tr -d ' ')
      [ "$ups" -gt "$depth" ] && echo "$path -> $target" >>"$TMP/badlinks"
      ;;
  esac
done
if [ -s "$TMP/badlinks" ]; then
  fail "symlinks pointing outside the repo (they break for the buyer):"
  show "$TMP/badlinks"
else
  pass "no symlinks pointing outside the repo"
fi
echo

# --- 8. Run instructions ------------------------------------------------------------
echo "[8] run_instruction.md at the repo root (every branch; details for $HEAD_REF)"
if [ -s "$TMP/ri-missing" ]; then
  fail "run_instruction.md missing at the tip of $(wc -l <"$TMP/ri-missing" | tr -d ' ') branch(es). Every branch ships, so commit it on each one BEFORE cleaning:"
  show "$TMP/ri-missing"
elif [ -s "$TMP/refs" ]; then
  pass "run_instruction.md at the tip of every branch"
fi
if grep -qx 'run_instruction.md' "$TMP/tip"; then
  RI_LINES=$(g show HEAD:run_instruction.md | wc -l | tr -d ' ')
  RI_MISSING=""
  for section in prerequisite build test troubleshoot; do
    g show HEAD:run_instruction.md | grep -qi "$section" || RI_MISSING="$RI_MISSING $section"
  done
  if [ -n "$RI_MISSING" ]; then
    warn "run_instruction.md ($RI_LINES lines) seems to be missing sections:$RI_MISSING"
  else
    pass "run_instruction.md present ($RI_LINES lines)"
  fi
elif [ -s "$TMP/ri-missing" ]; then
  info "Template and AI prompt: https://xephas.me/code/prepare/#ai-docs"
else
  fail "run_instruction.md missing from the root. Template and AI prompt: https://xephas.me/code/prepare/#ai-docs"
fi
grep -iE '^(readme|readme\.md)$' "$TMP/tip" >/dev/null && pass "README present" || warn "no README at the root"
if grep -iqx 'features.md' "$TMP/tip"; then
  pass "FEATURES.md present ($(grep -c '^- ' <(g show "HEAD:$(grep -ix 'features.md' "$TMP/tip")") | tr -d ' ') features listed)"
else
  warn "no FEATURES.md at the root. AI prompt: https://xephas.me/code/prepare/#ai-docs"
fi
echo

# --- 9. History and size --------------------------------------------------------------
echo "[9] History and size"
COMMITS=$(g rev-list --count --branches --tags)
if [ "$COMMITS" -lt 20 ]; then
  warn "only $COMMITS commits. Squashed or re-initialised histories don't qualify"
else
  pass "$COMMITS commits of history"
fi
if command -v cloc >/dev/null 2>&1 && [ "$(g rev-parse --is-bare-repository)" = "false" ]; then
  LOC=$(cd "$REPO" && cloc --vcs=git --quiet --csv . 2>/dev/null | awk -F, '$2=="SUM" {print $5}')
  LOC_TOOL=cloc
elif command -v cloc >/dev/null 2>&1; then
  # Bare or mirror clone: count the files at HEAD.
  mkdir -p "$TMP/tree" && g archive HEAD | tar -x -C "$TMP/tree" -f -
  LOC=$(cloc --quiet --csv "$TMP/tree" 2>/dev/null | awk -F, '$2=="SUM" {print $5}')
  LOC_TOOL=cloc
elif command -v scc >/dev/null 2>&1; then
  mkdir -p "$TMP/tree" && g archive HEAD | tar -x -C "$TMP/tree" -f -
  # scc CSV columns: Language,Lines,Code,Comments,Blanks,... so code is column 3.
  LOC=$(scc --format csv "$TMP/tree" 2>/dev/null | awk -F, 'NR>1 {s+=$3} END {print s}')
  LOC_TOOL=scc
else
  LOC=""
fi
if [ -z "$LOC" ]; then
  warn "line count skipped: install cloc (brew install cloc / choco install cloc / apt install cloc / npm install -g cloc) or scc"
elif [ "$LOC" -lt 30000 ]; then
  fail "$LOC lines of code ($LOC_TOOL, $HEAD_REF). The minimum is 30,000"
else
  pass "$LOC lines of code ($LOC_TOOL, $HEAD_REF)"
fi
echo


# --- 10. GitHub pull request refs ------------------------------------------------------
echo "[10] Pull request refs (refs/pull/*)"
PR_REFS=$(g for-each-ref --format='%(refname)' refs/pull 2>/dev/null)
if [ -z "$PR_REFS" ]; then
  info "No refs/pull/* in this copy. A git clone --mirror of a GitHub repo includes them."
  info "To list them without cloning:  git ls-remote <your-repo-url> 'refs/pull/*'"
else
  N_PR=$(printf '%s\n' "$PR_REFS" | wc -l | tr -d ' ')
  # shellcheck disable=SC2086 # ref names never contain spaces
  ONLY=$(g rev-list --count $PR_REFS --not --branches --tags 2>/dev/null || echo 0)
  info "$N_PR pull request ref(s). GitHub keeps them read-only: you can't delete or rewrite"
  info "them, and the export includes them. $ONLY commit(s) are reachable ONLY from them,"
  info "commits from before the clean-up: GitHub never rewrites these refs."
  if [ "$ONLY" != "0" ]; then
    # shellcheck disable=SC2086
    g rev-list --objects $PR_REFS --not --branches --tags 2>/dev/null | awk 'NF>1 {sub(/^[^ ]+ /, ""); print}' | sort -u >"$TMP/prpaths"
    grep -iE "$AI_RE|$SECRET_FILE_RE" "$TMP/prpaths" >"$TMP/prfiles" || true
    # shellcheck disable=SC2086
    g log -p --no-color --no-ext-diff --format= $PR_REFS --not --branches --tags 2>/dev/null |
      grep -E '^\+' | grep -oE "$SECRET_RE" | sort | uniq -c | sort -rn >"$TMP/prsecrets" || true
    if [ -s "$TMP/prfiles" ] || [ -s "$TMP/prsecrets" ]; then
      warn "pull request refs still hold AI tooling, secret files or credential strings."
      info "Rotate every real credential. Personal data here isn't fixed by rotation: paste this"
      info "section into the form, and we decide together on the handover call."
      [ -s "$TMP/prfiles" ] && show "$TMP/prfiles"
      [ -s "$TMP/prsecrets" ] && show "$TMP/prsecrets"
    else
      pass "no AI tooling, secret files or credential strings in commits only the pull request refs hold"
    fi
  fi
fi
echo
# --- Summary --------------------------------------------------------------------------
echo "=============================================================="
if [ "$FAILS" -eq 0 ]; then
  echo " RESULT: ready. $WARNS warning(s) to review."
else
  echo " RESULT: NOT ready. $FAILS failure(s), $WARNS warning(s)."
  echo " Clean up with clean-history.sh: https://xephas.me/code/prepare/"
fi
echo "=============================================================="
[ "$FAILS" -eq 0 ]
