// Data for /code/prepare. The page (src/pages/code/prepare.astro) and its
// Markdown twin (src/pages/code/prepare.md.ts) both loop over these, so the
// two never drift apart.
import { readFileSync } from "node:fs";
import { githubHandle } from "./constants.js";

export const branch = "cleaned_version";
// Working branch the seller creates first, so nothing below touches their main branch.
export const workBranch = "sale-prep";

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
    body: "Read-only audit of your repo and its full history: AI tooling files, secrets, personal data, build output, home-folder paths, run instructions and line count. Its report goes in the form.",
  },
  {
    file: "clean-history.sh",
    title: "clean-history.sh",
    body: `Rewrites history on a copy, never on your repo, then prints the command that pushes it to a new ${branch} branch. Removes AI tooling, machine files and home paths by default.`,
  },
  {
    file: "build-archive.sh",
    title: "build-archive.sh",
    body: `What we run on the handover call. It copies ${branch} with Read access only, exports pull requests, re-checks, packs and verifies the archive.`,
  },
  {
    file: "run_instruction.template.md",
    title: "run_instruction.md template",
    body: "Fill it in and save it as run_instruction.md at the root of your repo: prerequisites, credentials, build/run/test commands, quick start, troubleshooting.",
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
  { n: "02", title: "You clean", body: `You follow the steps below and push the result to a new branch, ${branch}. Your other branches stay as they are.` },
  { n: "03", title: "You submit the check", body: `You paste the check-repo.sh report for your cleaned branch into the form and invite ${githubHandle} on GitHub with Read access.` },
  { n: "04", title: "Handover call", body: "On a call, we run build-archive.sh while you watch. It packs and verifies the archive and prints a receipt." },
  { n: "05", title: "Payment", body: "Once the archive passes, payment is released on the call. You get the receipt with the archive's SHA-256 fingerprint." },
];

// Commands below carry these tokens; the username/repo fields above the steps fill them in.
export const TOKEN_RE = /(__USER__|__REPO__)/;
export const tokenFor = { __USER__: { key: "user", placeholder: "{github-username}" }, __REPO__: { key: "repo", placeholder: "{repo-name}" } } as const;

export const steps = [
  {
    title: `Create a new branch to work on: ${workBranch}`,
    body: `Do this first, in your own clone of the repo. Everything on this page (adding the two docs, cleaning, checking) is done on ${workBranch}, so your main branch and your working code are never rewritten or lost. The cleaning itself runs on a separate copy, and the result is pushed as another new branch, ${branch}.`,
    code: `cd path/to/__REPO__
git switch -c ${workBranch} main
git push -u origin ${workBranch}`,
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
    title: `Check ${workBranch}`,
    body: "This copy is only for checking; it doesn't touch your repo. The report shows every file and string that needs to go, with counts.",
    code: `git clone --bare --single-branch --branch ${workBranch} https://github.com/__USER__/__REPO__.git __REPO__.git
bash check-repo.sh __REPO__.git | tee before.txt`,
  },
  {
    title: "Add run_instruction.md and FEATURES.md",
    body: `Write both at the root of ${workBranch}, by hand from the template or with the AI prompts further down this page. Review them, then commit them and push them to ${workBranch} before you clean so they are part of the cleaned history. A buyer must be able to build and run the project from run_instruction.md alone.`,
    link: { href: "#ai-docs", label: "AI prompts for both files" },
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
    body: "List the files and folders to remove from every commit: the ones the report flagged. AI tooling, .DS_Store, machine files and home paths are removed automatically. A dry run shows what would go and changes nothing.",
    code: `SOURCE_BRANCH=${workBranch} DRY_RUN=1 SECRETS_FILE=secrets.txt bash clean-history.sh \\
  https://github.com/__USER__/__REPO__.git  .env  android/app/build/  '*.jks'  seed-data/`,
  },
  {
    title: "Clean",
    body: `Run it again without DRY_RUN. It works on a copy named after your repo (your-repo-clean.git), keeps only the branch you're selling, rewrites it, verifies it and runs check-repo.sh on the result. Repeat until the check passes.`,
    code: `SOURCE_BRANCH=${workBranch} SECRETS_FILE=secrets.txt bash clean-history.sh \\
  https://github.com/__USER__/__REPO__.git  .env  android/app/build/  '*.jks'  seed-data/`,
  },
  {
    title: `Push it to a new branch: ${branch}`,
    body: `This adds one branch holding the cleaned history. Nothing is force-pushed, your other branches and pull requests are untouched, and ${branch} is the only branch we copy. Never merge it into your other branches: that would bring the removed files back.`,
    code: `git -C __REPO__-clean.git push https://github.com/__USER__/__REPO__.git ${workBranch}:refs/heads/${branch}`,
  },
  {
    title: "Check what you pushed",
    body: "Check a fresh copy of the new branch. When it reads RESULT: ready, paste the full report into the form. Explain any warnings that are fine, such as your own support email.",
    code: `git clone --bare --single-branch --branch ${branch} https://github.com/__USER__/__REPO__.git check.git
bash check-repo.sh check.git | tee report.txt`,
  },
  {
    title: "Invite us with Read access",
    body: `On GitHub: Settings > Collaborators > Add people, add ${githubHandle} (github.com/${githubHandle}) with the Read role. On GitLab or Bitbucket, message us for the account to invite, with the Reporter or Read role. Then message us to book the handover call. Delete secrets.txt: it holds your real secrets.`,
    note: "Required: submit your clean report in the form before you message us. That means the full check-repo.sh output for the branch you pushed, ending RESULT: ready. We can't book the handover call without it.",
    code: `# Invite this GitHub user with the Read role
${githubHandle}

# Your repo's collaborator settings
https://github.com/__USER__/__REPO__/settings/access`,
  },
];

// The checklist sellers tick off before inviting us. Codes use String.raw so regex backslashes survive.
// Cross-links between the step-by-step list and the checklist (1-based numbers).
// checkSteps[i]: the steps that do checklist item i+1. stepChecks[i]: the checklist items step i+1 covers.
export const checkSteps: number[][] = [[7], [5, 7], [5, 7], [6, 7], [7], [6, 7], [4], [7], [8], [8], [9], [10]];
export const stepChecks: number[][] = [[], [], [1, 2, 3, 4, 5, 6], [7], [2, 3], [1, 4, 5, 6], [1, 2, 3, 4, 5, 6, 8], [9, 10], [11], [12]];
export const pad = (n: number) => String(n).padStart(2, "0");

export const checklist: { title: string; body: string; items?: string[]; code?: string; codeNote?: string; link?: { href: string; label: string } }[] = [
  {
    title: "Remove AI tooling files from the repo and its history",
    body: "Remove only the file, never the whole .github/ folder: it also holds your CI workflows, which we want.",
    items: ["CLAUDE.md, AGENTS.md, GEMINI.md", ".github/copilot-instructions.md, .cursorrules, .clinerules", ".cursor/, .claude/, .aider*, .windsurf*, llm-guides/, .remember/"],
    codeNote: "Check: this must print nothing.",
    code: String.raw`git rev-list --objects --all | awk '{print $2}' | grep -iE '(^|/)(CLAUDE\.md|AGENTS\.md|copilot-instructions\.md|\.cursorrules|\.clinerules)|(^|/)\.(cursor|claude|aider|windsurf|remember)/|llm-guides/'`,
  },
  {
    title: "Remove secrets and credentials from the repo and its history",
    body: "Rotate (cancel and reissue) every key that was ever committed, so the old copy in history is dead. Firebase client config (AIza... in google-services.json or firebase_options.dart) is a public identifier and may stay. To replace a secret string but keep the file, list it in secrets.txt for clean-history.sh.",
    items: [".env files and service-account JSON", "Keystores and certificates: .jks, .keystore, .p12, .p8, .pem, private-key blocks", "API keys (sk-..., AKIA...), tokens, signing and keystore passwords"],
  },
  {
    title: "Remove real user data (PII) from the repo and its history",
    body: "Replace it with obvious placeholders such as user@example.com. Personal data can't be rotated like a key, so it must be rewritten out of history. Sample data from third-party docs, like a number in a Stripe README, is fine.",
    items: ["Real names, emails, phone numbers, addresses, ID numbers", "Test logins with real passwords", "Database dumps and exports, uploaded user files"],
  },
  {
    title: "Remove build output, dependencies and large binaries from history",
    body: "Dependencies and generated files bloat the history and aren't your code.",
    items: ["node_modules/, build/, dist/, .dart_tool/, .next/, .astro/, .firebase/", "ios/Pods/, android/app/.cxx/, target/, __pycache__/, .venv/, .DS_Store", "Committed .zip, .tgz, .apk or .ipa files"],
    codeNote: "Find the biggest files ever committed:",
    code: String.raw`git rev-list --objects --all | git cat-file --batch-check='%(objectsize) %(rest)' | sort -rn | head -20`,
  },
  {
    title: "Remove machine-specific files and your home-folder paths",
    body: "These only work on your machine and break for anyone else.",
    items: ["local.properties, Generated.xcconfig, flutter_export_environment.sh, ephemeral/ folders", "Symlinks that point outside the repo", "Absolute paths like /Users/yourname/ or /home/yourname/"],
    codeNote: "Check: this must print 0.",
    code: String.raw`git log -p --all | grep -cE '/Users/|/home/'`,
  },
  {
    title: "Remove folders that belong to other projects",
    body: "If the repo was ever a monorepo or shared with another product, remove the other projects' folders from history. Ship only the project you're selling. Also remove stray nested .git folders that aren't the real repo.",
  },
  {
    title: "Add run_instruction.md and FEATURES.md at the repo root",
    body: "Write them before you rewrite history, so they sit in the final history. The AI prompts on this page write both from your actual code.",
    items: ["Prerequisites with versions (e.g. Flutter 3.24, Node 20)", "Credential setup: every placeholder, and where a new owner gets their own value", "Build, run and test commands for each part (app, web, API)", "A quick start, from a fresh clone to a running app", "Troubleshooting for the errors a new developer is likely to hit", "FEATURES.md: every implemented feature, grouped by area"],
    link: { href: "#ai-docs", label: "AI prompts for both files" },
  },
  {
    title: "Keep the full commit history, unsquashed",
    body: "Rewrite with clean-history.sh (git-filter-repo). Don't squash, and don't copy the files into a new repo with one \"initial commit\". The commit count may drop slightly where a commit contained only removed files. That's expected; tell us how many.",
  },
  {
    title: `Push the cleaned code to a new branch: ${branch}`,
    body: `Push it to the same repo as a new branch. Don't force-push over main and don't move it to a new repo. ${branch} is the only branch we copy; your pull requests stay on the repo and we export them on the call. Never merge ${branch} into your other branches: that brings the removed files back.`,
    code: `git -C __REPO__-clean.git push https://github.com/__USER__/__REPO__.git ${workBranch}:refs/heads/${branch}`,
  },
  {
    title: `Don't change ${branch} after you submit`,
    body: "We deliver the branch exactly as you checked it. Keep working on your other branches if you like.",
  },
  {
    title: "Do a final check on a fresh clone",
    body: "Check a fresh copy of only the branch you pushed. Paste the full report into the form. It must end with RESULT: ready; explain any warnings that are fine, such as your own support email.",
    code: `git clone --bare --single-branch --branch ${branch} https://github.com/__USER__/__REPO__.git check.git
bash check-repo.sh check.git | tee report.txt`,
  },
  {
    title: "Invite us with Read access",
    body: `GitHub: Settings > Collaborators > Add people, add ${githubHandle}, role Read. Then message us on WhatsApp to book the handover call.`,
  },
];

export const remove = [
  "AI tooling: CLAUDE.md, AGENTS.md, .cursor/, .claude/, .github/copilot-instructions.md, .cursorrules, .aider*, llm-guides/",
  "Secrets: .env files, keystores, .pem/.p12/.p8 keys, service-account JSON, API keys, signing passwords",
  "Personal data: real names, emails, phone numbers, test logins, database dumps, user uploads",
  "Build output: node_modules/, build/, dist/, .dart_tool/, .next/, Pods/, .firebase/, .apk, .ipa, .zip",
  "Machine files: local.properties, Generated.xcconfig, ephemeral/, .DS_Store, /Users/<name>/ paths",
  "Folders that belong to other projects, and symlinks pointing outside the repo",
];

export const keep = [
  "The full commit history: never squash, never re-initialise",
  ".github/workflows/: CI is evidence of real practice",
  "Tests, docs, README and your .env.example files",
  "Firebase client config (google-services.json, firebase_options.dart): public identifiers, not secrets",
  "Your own work or support email, and sample data from vendor docs",
  "Your pull requests: they stay on the repo and we export them on the call",
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
    q: `Why a separate ${branch} branch?`,
    a: "Cleaning rewrites history, so every commit gets a new ID. Pushing that to a new branch means nothing you have is overwritten: your main branch, your teammates' clones and your pull requests all keep working. We copy only the new branch.",
  },
  {
    q: "The commit count went down. Is that a problem?",
    a: "No. git-filter-repo drops commits whose only change was a removed file, for example a commit that only added CLAUDE.md. Tell us the before and after numbers in the form.",
  },
  {
    q: "Do I lose my pull requests?",
    a: "No. Pull requests live on GitHub, not in git, so they stay on your repo. On the call we export them, with reviews and comments, into the archive.",
  },
  {
    q: "Can I keep working on my project?",
    a: `Yes, on your other branches. Don't push to ${branch} after you submit the report: we deliver that branch exactly as you checked it.`,
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
