// Data for /code/prepare. The page (src/pages/code/prepare.astro) and its
// Markdown twin (src/pages/code/prepare.md.ts) both loop over these, so the
// two never drift apart.
import { readFileSync } from "node:fs";
import { githubHandle } from "./constants.js";

// The repo is cleaned IN PLACE: every branch and tag is rewritten and
// force-pushed back, so the export carries every branch, tag and pull request.
// A full backup (step 1) is the safety net.

// AI prompts for the two docs. Read from public/code/prompts/ at build time so the
// page and the downloadable files never drift apart.
export const prompts = [
  {
    file: "prompts/run_instruction.prompt.md",
    title: "run_instruction.md",
    body: "Reads your manifests, config, scripts and CI, then writes install, credential, build/run/test, quick start and troubleshooting sections with real versions and commands.",
  },
  {
    file: "prompts/features.prompt.md",
    title: "FEATURES.md",
    body: "Goes through every module, route, endpoint and model, then lists every implemented feature, grouped by area, one concrete bullet each.",
  },
].map((p) => ({ ...p, text: readFileSync(`public/code/${p.file}`, "utf8").trim() }));

// Files live in public/code/.
export const downloads = [
  {
    file: "check-repo.sh",
    title: "check-repo.sh",
    body: "Read-only audit of every branch and tag and their full history: a line per branch and tag, AI tooling files, secrets, personal data, build output, home-folder paths, run instructions, pull request refs and line count. Its report goes in the form.",
  },
  {
    file: "clean-history.sh",
    title: "clean-history.sh",
    body: "Rewrites every branch and tag on a copy, never on your repo, keeping every commit with its author and date. It verifies each branch and tag, then prints the force-push commands for you to run.",
  },
  {
    file: "run_instruction.template.md",
    title: "run_instruction.md template",
    body: "Fill it in and save it as run_instruction.md at the root of your repo, on every branch: prerequisites, credentials, build/run/test commands, quick start, troubleshooting.",
  },
  {
    file: "secrets.example.txt",
    title: "secrets.example.txt",
    body: "Example rules for replacing secret strings everywhere in your history while keeping the files that held them.",
  },
  {
    file: "prompts/run_instruction.prompt.md",
    title: "run_instruction prompt",
    body: "Paste into Claude Code, Cursor, Copilot or any AI coding assistant opened in your repo. It writes run_instruction.md from your actual code.",
  },
  {
    file: "prompts/features.prompt.md",
    title: "FEATURES.md prompt",
    body: "Same, for FEATURES.md: a complete inventory of every implemented feature, grouped by area.",
  },
];

export const handover = [
  { n: "01", title: "Shortlisted", body: "We contact you once your project is shortlisted and a price is agreed." },
  { n: "02", title: "You clean", body: "You back up the repo, then clean every branch and tag and force-push them back in place, following the steps below." },
  { n: "03", title: "You submit the check", body: `You paste the check-repo.sh report for the cleaned repo, with its pull request refs, into the form and invite ${githubHandle} on GitHub with Read access.` },
  { n: "04", title: "Handover call", body: "On a call, we export the archive from your cleaned repository together, verify it and print a receipt." },
  { n: "05", title: "Payment", body: "Once the archive passes, payment is released on the call. You get the receipt with the archive's SHA-256 fingerprint." },
];

// Commands below carry these tokens; the username/repo fields above the steps fill them in.
export const TOKEN_RE = /(__USER__|__REPO__)/;
export const tokenFor = { __USER__: { key: "user", placeholder: "{github-username}" }, __REPO__: { key: "repo", placeholder: "{repo-name}" } } as const;

const REPO_URL = "https://github.com/__USER__/__REPO__.git";

export const steps: { title: string; body: string; note?: string; code?: string; link?: { href: string; label: string } }[] = [
  {
    title: "Make a full backup first",
    body: "Before anything else, copy the whole repository (every branch, tag and pull request ref) to a folder outside your project. The clean-up later overwrites your branches on GitHub, and this copy is the only way back. Keep it until the sale is done, and never push it anywhere: it holds the old history, secrets included.",
    code: `mkdir -p ~/sale-backup
git clone --mirror ${REPO_URL} ~/sale-backup/__REPO__-backup.git

# Or as one file, from your own clone (fetch first so every branch is in it):
cd path/to/__REPO__ && git fetch --all --tags
git bundle create ~/sale-backup/__REPO__.bundle --all
git bundle verify ~/sale-backup/__REPO__.bundle`,
  },
  {
    title: "Install the tools",
    body: "You need git, Python 3, git-filter-repo and cloc. On Windows, use Git Bash or WSL.",
    code: `# macOS
brew install git-filter-repo cloc

# Linux
sudo apt install git-filter-repo cloc     # or: pip install git-filter-repo

# Then download the scripts into one folder
mkdir sale-tools && cd sale-tools
curl -O https://xephas.me/code/check-repo.sh
curl -O https://xephas.me/code/clean-history.sh
curl -O https://xephas.me/code/secrets.example.txt`,
  },
  {
    title: "Merge or close open pull requests",
    body: "The clean-up rewrites every branch. A pull request that is still open when its branch is rewritten can close itself or show a diff that makes no sense. Merge or close every open one first. Merged and closed pull requests keep their record, reviews and comments.",
    code: `# With the GitHub CLI, or open the Pull requests tab
gh pr list --repo __USER__/__REPO__ --state open
https://github.com/__USER__/__REPO__/pulls`,
  },
  {
    title: "Check every branch and tag",
    body: "Take a fresh, full copy of what is on GitHub; checking it changes nothing. The report starts with a line per branch and tag, then lists every file and string that needs to go, with counts. The export ships every branch and tag, so every one of them has to pass.",
    code: `git clone --mirror ${REPO_URL} __REPO__.git
bash check-repo.sh __REPO__.git | tee before.txt`,
  },
  {
    title: "Add run_instruction.md and FEATURES.md to every branch",
    body: "Write both at the root of your default branch, by hand from the template or with the AI prompts further down this page, review them and commit. Then put the same commit on every other branch: every branch ships, so each branch tip needs them. Push every branch. Do this before you clean, so the files are part of the cleaned history. A new owner must be able to build and run the project from run_instruction.md alone.",
    link: { href: "#ai-docs", label: "AI prompts for both files" },
    code: `cd path/to/__REPO__
git switch main
# write run_instruction.md and FEATURES.md, then:
git add run_instruction.md FEATURES.md
git commit -m "Add run instructions and feature list"
git push origin main

# Then on each other branch, one at a time:
git switch <branch>
git cherry-pick main        # or: git merge main
git push origin <branch>`,
  },
  {
    title: "Rotate secrets, then list them",
    body: "Cancel and reissue every API key, token and password the report found, so the old values are dead. Then copy secrets.example.txt to secrets.txt and add one rule per secret or piece of personal data, real value ==> placeholder.",
    code: `cp secrets.example.txt secrets.txt
# edit secrets.txt, one rule per line:
#   sk_live_51Hxxxx==>YOUR_STRIPE_SECRET_KEY
#   jane.doe@gmail.com==>user@example.com`,
  },
  {
    title: "Dry run",
    body: "List the files and folders to remove from every commit: the ones the report flagged. AI tooling, .DS_Store, machine files and home paths are removed automatically. It works on a fresh copy of every branch and tag; a dry run shows what would go and changes nothing.",
    code: `DRY_RUN=1 SECRETS_FILE=secrets.txt bash clean-history.sh \\
  ${REPO_URL}  .env  android/app/build/  '*.jks'  seed-data/`,
  },
  {
    title: "Clean every branch and tag",
    body: "Run it again without DRY_RUN. It rewrites every branch and tag in one pass, on a copy named after your repo (your-repo-clean.git), never on your repo. Every commit stays, with its message, author and date; only the commit IDs change. Repeat until it passes.",
    code: `SECRETS_FILE=secrets.txt bash clean-history.sh \\
  ${REPO_URL}  .env  android/app/build/  '*.jks'  seed-data/`,
  },
  {
    title: "Verify each branch and tag",
    body: "clean-history.sh prints a line per branch and tag and re-runs check-repo.sh on the copy. Every branch and tag must show its messages, authors and dates as identical; in the check's table every count must be 0 on every row, and run_instruction.md must be on every branch. Run the check again yourself if you change anything.",
    code: `bash check-repo.sh __REPO__-clean.git | tee after.txt`,
  },
  {
    title: "Force-push every branch and tag in place",
    body: "This replaces each branch and tag on GitHub with its cleaned version, and your pull requests stay attached to the repo. clean-history.sh prints one line per branch and tag, each pinned to the commit GitHub holds now, so a push fails instead of overwriting something that changed. Run the first line alone and check it, then the rest. Then delete any backup or pre-clean branches from GitHub, since the export ships every branch. After this, every existing clone is stale: you and every collaborator must re-clone, and a git pull would merge the old history back in.",
    note: "You can't undo this on GitHub. Make sure the backup from step 01 exists and opens before you push.",
    code: `# What GitHub holds now
git ls-remote --heads --tags ${REPO_URL}

# One line per branch and tag (clean-history.sh prints them all), e.g.:
git -C __REPO__-clean.git push --force-with-lease=refs/heads/main:<current-sha> \\
  ${REPO_URL} refs/heads/main:refs/heads/main

# Delete backup branches from GitHub, if you made any there
git push ${REPO_URL} --delete <backup-branch>`,
  },
  {
    title: "Check what is on GitHub now, and the pull request refs",
    body: "Check a new fresh copy. When it reads RESULT: ready, paste the full report and the refs/pull list into the form. GitHub keeps a read-only ref for every pull request (refs/pull/<n>/head). It never rewrites them, you can't delete them, and the export includes them, so they still hold each pull request's files from before the clean-up. Rotating every credential (step 06) makes any secret left there useless. Personal data there isn't fixed by rotation: check-repo.sh reports what those refs hold in section [10], and we decide together on the handover call.",
    code: `git clone --mirror ${REPO_URL} check.git
bash check-repo.sh check.git | tee report.txt
git ls-remote ${REPO_URL} 'refs/pull/*' | tee pull-refs.txt`,
  },
  {
    title: "Invite us with Read access",
    body: `On GitHub: Settings > Collaborators > Add people, add ${githubHandle} (github.com/${githubHandle}) with the Read role. On GitLab or Bitbucket, message us for the account to invite, with the Reporter or Read role. Then message us to book the handover call. Delete secrets.txt: it holds your real secrets.`,
    note: "Required: submit your clean report in the form before you message us. That means the full check-repo.sh output for a fresh copy of the repo after the force-push, ending RESULT: ready, plus the refs/pull list. We can't book the handover call without it.",
    code: `# Invite this GitHub user with the Read role
${githubHandle}

# Your repo's collaborator settings
https://github.com/__USER__/__REPO__/settings/access`,
  },
];

// The checklist sellers tick off before inviting us. Codes use String.raw so regex backslashes survive.
// Cross-links between the step-by-step list and the checklist (1-based numbers).
// checkSteps[i]: the steps that do checklist item i+1. stepChecks is derived from it,
// so the two directions can't drift apart.
export const checkSteps: number[][] = [[1], [3], [4, 7, 8, 9], [4, 6, 8, 9], [4, 6, 8, 9], [4, 7, 8, 9], [8, 9], [4, 7, 8], [5], [8, 9], [10], [11], [11], [12]];
export const stepChecks: number[][] = steps.map((_, s) =>
  checkSteps.flatMap((sts, c) => (sts.includes(s + 1) ? [c + 1] : [])),
);
export const pad = (n: number) => String(n).padStart(2, "0");

export const checklist: { title: string; body: string; items?: string[]; code?: string; codeNote?: string; link?: { href: string; label: string } }[] = [
  {
    title: "Make a full backup of the repository",
    body: "A mirror clone or a bundle of every branch, tag and pull request ref, kept in a folder outside the project until the sale is done. Never push it back to GitHub.",
  },
  {
    title: "Merge or close every open pull request",
    body: "Before the rewrite. An open pull request whose branch is rewritten can close itself or show a broken diff. Merged and closed ones keep their record.",
  },
  {
    title: "Remove AI tooling files from every branch, tag and their history",
    body: "Remove only the file, never the whole .github/ folder: it also holds your CI workflows, which we want.",
    items: ["CLAUDE.md, AGENTS.md, GEMINI.md", ".github/copilot-instructions.md, .cursorrules, .clinerules", ".cursor/, .claude/, .aider*, .windsurf*, llm-guides/, .remember/"],
    codeNote: "Check (in a mirror clone): this must print nothing.",
    code: String.raw`git rev-list --objects --branches --tags | awk '{print $2}' | grep -iE '(^|/)(CLAUDE\.md|AGENTS\.md|copilot-instructions\.md|\.cursorrules|\.clinerules)|(^|/)\.(cursor|claude|aider|windsurf|remember)/|llm-guides/'`,
  },
  {
    title: "Remove secrets and credentials from every branch, tag and their history",
    body: "Rotate (cancel and reissue) every key that was ever committed, so the old copy in history, in your backup and in any pull request ref is dead. Firebase client config (AIza... in google-services.json or firebase_options.dart) is a public identifier and may stay. To replace a secret string but keep the file, list it in secrets.txt for clean-history.sh.",
    items: [".env files and service-account JSON", "Keystores and certificates: .jks, .keystore, .p12, .p8, .pem, private-key blocks", "API keys (sk-..., AKIA...), tokens, signing and keystore passwords"],
  },
  {
    title: "Remove real user data (PII) from every branch, tag and their history",
    body: "Replace it with obvious placeholders such as user@example.com. Personal data can't be rotated like a key, so it must be rewritten out of history. Sample data from third-party docs, like a number in a Stripe README, is fine.",
    items: ["Real names, emails, phone numbers, addresses, ID numbers", "Test logins with real passwords", "Database dumps and exports, uploaded user files"],
  },
  {
    title: "Remove build output, dependencies and large binaries from history",
    body: "Dependencies and generated files bloat the history and aren't your code.",
    items: ["node_modules/, build/, dist/, .dart_tool/, .next/, .astro/, .firebase/", "ios/Pods/, android/app/.cxx/, target/, __pycache__/, .venv/, .DS_Store", "Committed .zip, .tgz, .apk or .ipa files"],
    codeNote: "Find the biggest files ever committed on any branch or tag:",
    code: String.raw`git rev-list --objects --branches --tags | git cat-file --batch-check='%(objectsize) %(rest)' | sort -rn | head -20`,
  },
  {
    title: "Remove machine-specific files and your home-folder paths",
    body: "These only work on your machine and break for anyone else.",
    items: ["local.properties, Generated.xcconfig, flutter_export_environment.sh, ephemeral/ folders", "Symlinks that point outside the repo", "Absolute paths like /Users/yourname/ or /home/yourname/"],
    codeNote: "Check: this must print 0.",
    code: String.raw`git log -p --branches --tags | grep -cE '/Users/|/home/'`,
  },
  {
    title: "Remove folders that belong to other projects",
    body: "If the repo was ever a monorepo or shared with another product, remove the other projects' folders from history. Ship only the project you're selling. Also remove stray nested .git folders that aren't the real repo.",
  },
  {
    title: "Add run_instruction.md and FEATURES.md to every branch",
    body: "Commit them on every branch before you rewrite history: every branch ships, so each branch tip needs them, and they must sit in the cleaned history. The AI prompts on this page write both from your actual code.",
    items: ["Prerequisites with versions (e.g. Flutter 3.24, Node 20)", "Credential setup: every placeholder, and where a new owner gets their own value", "Build, run and test commands for each part (app, web, API)", "A quick start, from a fresh clone to a running app", "Troubleshooting for the errors a new developer is likely to hit", "FEATURES.md: every implemented feature, grouped by area"],
    link: { href: "#ai-docs", label: "AI prompts for both files" },
  },
  {
    title: "Keep the full commit history, unsquashed",
    body: "Rewrite with clean-history.sh (git-filter-repo). Every commit stays with its message, author and date; only the commit IDs change. Don't squash, and don't copy the files into a new repo with one \"initial commit\".",
  },
  {
    title: "Force-push every cleaned branch and tag in place",
    body: "Push every branch and tag back to the same repo with the commands clean-history.sh prints. Then delete any backup or pre-clean branches from GitHub, since the export ships every branch. Tell every collaborator to re-clone: an old clone must not pull or push.",
  },
  {
    title: "Do a final check on a fresh mirror clone, with the pull request refs",
    body: "Check a new fresh copy of the whole repo. Paste the full report into the form, with the git ls-remote 'refs/pull/*' list. It must end with RESULT: ready; explain any warnings that are fine, such as your own support email.",
    code: `git clone --mirror ${REPO_URL} check.git
bash check-repo.sh check.git | tee report.txt
git ls-remote ${REPO_URL} 'refs/pull/*' | tee pull-refs.txt`,
  },
  {
    title: "Don't push to the repo after you submit",
    body: "We export the repo exactly as you checked it. Anything pushed after your check isn't checked, and the export ships every branch.",
  },
  {
    title: "Invite us with Read access",
    body: `GitHub: Settings > Collaborators > Add people, add ${githubHandle}, role Read. Then message us on WhatsApp to book the handover call.`,
  },
];

// The final step, shown as a blue card at the bottom of /code/prepare and
// /code/export. Built from the existing steps and handover text, not new claims.
export const CHECK_FORM_URL = "https://tally.so/r/BEdoGN";
export const finishSend = [
  "The full check-repo.sh output for a fresh copy of the repo after the force-push (step 11), ending RESULT: ready",
  "The refs/pull list from step 11: git ls-remote <your-repo-url> 'refs/pull/*'",
  "A short note on any warning that is fine, such as your own support email",
];
export const finishNext = [
  {
    title: steps[11].title,
    body: `On GitHub: Settings > Collaborators > Add people, add ${githubHandle} with the Read role. On GitLab or Bitbucket, message us for the account to invite, with the Reporter or Read role.`,
  },
  { title: "Book the handover call", body: "Then message us to book the handover call. We can't book it without your clean report." },
  { title: handover[3].title, body: handover[3].body },
  { title: handover[4].title, body: handover[4].body },
];

// The export: the short version. Full commands and screenshots on /code/export.
export const exportSummary = {
  lead: "Everything above gets the repo ready. The archive is what the sale delivers: one .tar.gz with the full commit history, plus the pull requests with their reviews and comments, built with GitHub's Migration API or GitLab's project export. GitHub only exports repositories the caller owns (or an organisation Owner or Migrator), and GitLab needs the Maintainer role or higher, so there are two routes to it. Pick one once the checklist is done.",
  routeA: {
    title: "Route A: you run the export",
    who: "GitHub: you own the repository, or it's in an organisation where you are an Owner or have the Migrator role. GitLab: you have the Maintainer role or higher.",
    body: "You create a token and run three API calls, below in brief. The export packs the whole repository: every branch, tag and pull request ref. Your branches and tags ship clean. The pull request refs ship as they are and may still hold pre-clean files (see below). Pull requests end up inside the archive as pull_requests_*.json. This is the route that delivers the full record.",
  },
  routeB: {
    title: "Route B: we build it on the call",
    who: "You can't export it yourself (a GitHub collaborator without either organisation role, or below Maintainer on GitLab), or you would rather not handle tokens.",
    body: "You invite us with Read access on GitHub, or the Reporter role on GitLab (step 12). On the handover call, while you watch, we copy one branch (your default branch, or the one you name), check it, save your pull requests, put the branch into a new private repository on our account as main and run the same export there, then verify the archive. The archive holds that one branch, delivered as main: your other branches and tags are not in it, so route B earns less than route A. Use it only when route A isn't possible. Pull requests are saved with their reviews and comments in a JSON file beside the archive, not inside it. You never create a token.",
  },
  points: [
    { title: "Token", body: "A classic personal access token. Your own account: scopes repo and user. An organisation: repo and admin:org. Copy it straight away." },
    { title: "Start", body: "POST to /user/migrations (or /orgs/<YOUR_ORG_NAME>/migrations) and note the \"id\" in the reply: your MIGRATION_ID." },
    { title: "Wait", body: "GET /user/migrations/<MIGRATION_ID> (or /orgs/<YOUR_ORG_NAME>/migrations/<MIGRATION_ID>) until \"state\" is \"exported\"." },
    { title: "Download", body: "GET /user/migrations/<MIGRATION_ID>/archive (or /orgs/<YOUR_ORG_NAME>/migrations/<MIGRATION_ID>/archive) to save the .tar.gz, or use the link GitHub emails you." },
  ],
  pullNote: "What the archive can still hold: GitHub never rewrites pull request refs (refs/pull/*), and the export includes them, so they keep each pull request's files from before the clean-up. You can't delete them. Rotating every credential (step 06) makes any secret there useless. Personal data there isn't fixed by rotation: send us what check-repo.sh reports in section [10] and the refs/pull list (step 11), and we decide together on the handover call.",
  warning: "Route A only: a user export works only for repositories your account owns. Collaborator access is rejected (typically 422 Validation Failed). For a repository in an organisation, you must be an Owner of the organisation or have the Migrator role. Otherwise, use route B.",
  inside: [
    "The full commit history: the git repository, unsquashed",
    "The pull requests, with reviews and comments: inside the archive (route A) or in a JSON file beside it (route B)",
    "run_instruction.md at the root of the repo",
  ],
  runNote: "run_instruction.md travels inside the archive only if it is committed. Write it and commit it on every branch (step 05) before you clean the history and before anyone exports, on either route. If you add it afterwards, you redo the clean-up and the export.",
  code: `# 1. Start (your account; organisations use /orgs/<YOUR_ORG_NAME>/migrations)
curl -L -X POST -H "Accept: application/vnd.github+json" \\
  -H "Authorization: Bearer <YOUR_TOKEN>" -H "X-GitHub-Api-Version: 2022-11-28" \\
  -d '{"lock_repositories":false, "repositories":["username/repo"]}' \\
  https://api.github.com/user/migrations

# 2. Repeat until "state" is "exported"
curl -L -H "Accept: application/vnd.github+json" \\
  -H "Authorization: Bearer <YOUR_TOKEN>" -H "X-GitHub-Api-Version: 2022-11-28" \\
  https://api.github.com/user/migrations/<MIGRATION_ID>

# 3. Download
curl -L -H "Accept: application/vnd.github+json" \\
  -H "Authorization: Bearer <YOUR_TOKEN>" -H "X-GitHub-Api-Version: 2022-11-28" \\
  https://api.github.com/user/migrations/<MIGRATION_ID>/archive -o <your_archive_name>.tar.gz`,
};

export const remove = [
  "AI tooling: CLAUDE.md, AGENTS.md, .cursor/, .claude/, .github/copilot-instructions.md, .cursorrules, .aider*, llm-guides/",
  "Secrets: .env files, keystores, .pem/.p12/.p8 keys, service-account JSON, API keys, signing passwords",
  "Personal data: real names, emails, phone numbers, test logins, database dumps, user uploads",
  "Build output: node_modules/, build/, dist/, .dart_tool/, .next/, Pods/, .firebase/, .apk, .ipa, .zip",
  "Machine files: local.properties, Generated.xcconfig, ephemeral/, .DS_Store, /Users/<name>/ paths",
  "Folders that belong to other projects, and symlinks pointing outside the repo",
  "Backup or pre-clean branches on GitHub: keep your backup offline instead",
];

export const keep = [
  "The full commit history of every branch and tag: never squash, never re-initialise",
  ".github/workflows/: CI is evidence of real practice",
  "Tests, docs, README and your .env.example files",
  "Firebase client config (google-services.json, firebase_options.dart): public identifiers, not secrets",
  "Your own work or support email, and sample data from vendor docs",
  "Your pull requests: they stay attached to the repo because you push in place, and the export includes them with reviews and comments",
];

export const runInstruction = [
  { title: "Prerequisites", body: "Every tool with the exact version you build with: Node 20, Flutter 3.24, Xcode 16." },
  { title: "Credentials", body: "Every placeholder you added, the file it lives in, and where a new owner gets their own value." },
  { title: "Build, run, test", body: "Exact commands for each part (app, web, API), run from the repo root." },
  { title: "Quick start", body: "The shortest path from a fresh clone to something running, in order." },
  { title: "Troubleshooting", body: "The errors a new developer will hit first, and the fix for each." },
];

export const faqs = [
  {
    q: "Why clean every branch in place?",
    a: "The export ships the whole repository: every branch, tag and pull request. That full record is what the sale pays for, so delivering a single branch earns less. Cleaning in place keeps every branch and keeps your pull requests attached to the repo. The backup from step 1 is your safety net.",
  },
  {
    q: "Will the commit count change?",
    a: "No. clean-history.sh keeps every commit with its message, author and date; only the commit IDs change. A commit whose only change was a removed file stays, as an empty commit. To drop those instead, run it with PRUNE_EMPTY=1 and tell us the before and after numbers.",
  },
  {
    q: "Do I lose my pull requests?",
    a: "No. Pull requests live on GitHub, not in git, and stay attached to the repo because you push in place. Merge or close open ones first (step 3). The export includes them, with reviews and comments.",
  },
  {
    q: "What are refs/pull/* and why can't I delete them?",
    a: "GitHub keeps a read-only ref for each pull request's head commit and never rewrites it, and the export includes them. So they still hold each pull request's files from before the clean-up, and only GitHub can delete them. Rotating every credential (step 6) makes any secret there useless. Personal data there isn't fixed by rotation: send us what check-repo.sh reports in section [10] and the git ls-remote list from step 11, and we decide together on the handover call.",
  },
  {
    q: "What about my collaborators?",
    a: "After the force-push, every existing clone is stale. Tell them to re-clone, and not to pull or push from an old clone: that would merge the old history back in.",
  },
  {
    q: "Can I keep working on my project?",
    a: "Not on this repository between the force-push and the handover call: anything pushed after your check isn't checked. Afterwards, work from a fresh clone.",
  },
  {
    q: "Something went wrong. How do I undo it?",
    a: "Your backup from step 1 holds the original history. Message us before you restore anything, so the right branches go back.",
  },
  {
    q: "When can I remove your access?",
    a: "Any time after payment. Once the archive is built and verified on the call, we no longer need the repo.",
  },
  {
    q: "Can I use AI to write run_instruction.md and FEATURES.md?",
    a: "Yes. Use the prompts on this page, then check every line against your code. AI-written docs are fine. What we can't accept is a codebase that was entirely AI-generated.",
  },
  {
    q: "The check flags something that's fine.",
    a: "Warnings are for you to review, not automatic failures. Explain them in the form, for example: \"0758... is our public support line\".",
  },
];
