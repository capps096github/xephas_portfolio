// Data for /code/export. The page (src/pages/code/export.astro) and its
// Markdown twin (src/pages/code/export.md.ts) both loop over these, so the
// two never drift apart. Screenshots live in public/images/code-export/ and
// were cropped so no account name, avatar or token is visible.

import { readFileSync } from "node:fs";
import { finishSend } from "./code_prepare";

export const IMG_DIR = "/images/code-export/";

// AI walkthrough prompt. Read from public/code/prompts/ at build time, like the
// /code/prepare prompts, so the page and the downloadable file never drift apart.
export const aiPrompt = {
  file: "prompts/export.prompt.md",
  title: "Export walkthrough",
  body: "Works out your route, checks that every branch and tag was cleaned in place and that run_instruction.md is on every branch, explains refs/pull/*, tells you which token to create, gives you the export commands for your repo, then verifies the archive with you.",
  text: readFileSync("public/code/prompts/export.prompt.md", "utf8").trim(),
};

// What the prompt makes the assistant promise. Shown above the prompt.
export const aiRules = [
  "It never asks for your token, prints it or saves it. You type it into your own shell with read -rs, so it doesn't show on screen or land in your history.",
  "It shows every command before running it, and only runs read-only ones on its own.",
  "It never starts an export, force-pushes, rewrites history, deletes a branch or commits without your yes to that exact command, every time.",
];

export type Shot = { src: string; w: number; h: number; alt: string };
export type Code = { label?: string; code: string };
export type Step = {
  title: string;
  body: string;
  note?: string;
  shots?: Shot[];
  codes?: Code[];
  /** Example response, shown as a plain block under the commands. */
  example?: { label: string; code: string };
};

const GH_ACCEPT = `-H "Accept: application/vnd.github+json"`;
const GH_AUTH = `-H "Authorization: Bearer <YOUR_TOKEN>"`;
const GH_USER_V = `-H "X-GitHub-Api-Version: 2022-11-28"`;
const GH_ORG_V = `-H "X-GitHub-Api-Version: 2026-03-10"`;

export const intro =
  "The archive we need for the handover is a .tar.gz of your repository with its full commit history, plus its pull requests with their reviews and comments. There are two ways to get it. If you can export the repository yourself (you own it on GitHub, or have the Maintainer role or higher on GitLab), you can use GitHub's Migration API or GitLab's project export. If you can't or would rather not, invite us with Read access (GitHub) or the Reporter role (GitLab) and we build it with you on the handover call.";

// The two ways to the archive. The page shows them side by side; the Markdown lists them.
export const routes = [
  {
    id: "route-a",
    label: "Route A",
    title: "You run the export",
    who: "GitHub: you own the repository on your account, or it's in an organisation where you are an Owner or have the Migrator role. GitLab: you have the Maintainer role or higher on the project.",
    body: "You create a token and run three API calls, following the GitHub or GitLab steps below. The export packs the whole repository: every branch, tag and pull request ref, with the pull requests inside. That is why /code/prepare has you clean every branch and tag in place first. Your branches and tags ship clean. GitHub never rewrites pull request refs (refs/pull/*), so they ship with each pull request's files from before the clean-up: see the last item under Before you start. This route delivers the full record.",
    prs: "Pull requests: inside the archive, as pull_requests_*.json files (merge requests in a GitLab export).",
    href: "#github",
    cta: "Export it yourself",
  },
  {
    id: "route-b",
    label: "Route B",
    title: "We build it on the call",
    who: "You can't export it yourself: on GitHub you are a collaborator rather than the owner, or have neither organisation role; on GitLab your role is below Maintainer. Or you would rather not handle tokens.",
    body: "GitHub only exports repositories the caller owns (or an organisation Owner or Migrator), and GitLab needs the Maintainer role or higher, so we take the export on our side. You invite us with Read access (GitHub) or the Reporter role (GitLab). On the handover call, while you watch, we copy one branch (your default branch, or the one you name), check it, save your pull requests, put the branch into a new private repository on our account as main and run the same export there, then unpack and verify the archive. The archive holds that one branch, delivered as main: your other branches and tags are not in it, so route B earns less than route A. Use it only when route A isn't possible. You never create a token.",
    prs: "Pull requests: saved with their reviews and comments in a separate JSON file beside the archive, not inside it.",
    href: "#route-b-steps",
    cta: "What you do for route B",
  },
];

// Route B, from the seller's side. No commands: we run them on the call.
export const routeBSteps = [
  { title: "Finish the clean-up", body: "Follow /code/prepare until check-repo.sh reports RESULT: ready on a fresh copy of the repo, and paste that report into the form." },
  { title: "Invite us with Read access", body: "Read (GitHub) or Reporter (GitLab) is all we need. We never push to your repository or change it." },
  { title: "Join the handover call", body: "We build the archive while you watch: copy the branch, check it, save the pull requests, export, verify. That branch is delivered as main; no other branch or tag goes in. You get a receipt with the archive's SHA-256 fingerprint." },
  { title: "Remove our access", body: "Once the archive is verified, you can remove us from the repository." },
];

// Read before starting. Each is short; the page shows them as a list.
export const beforeYouStart = [
  "Both routes start from a finished clean-up on /code/prepare: every branch and tag cleaned and force-pushed in place, any backup branches deleted from GitHub, and a check-repo.sh report on a fresh mirror clone that ends RESULT: ready.",
  "Write run_instruction.md and commit it at the root of every branch, then push, before you clean the history and before anyone exports. Every branch ships, so each branch tip needs it. The archive contains only what is committed. A file added after the clean-up means running the clean-up again, then the export again.",
  "Route A only: on GitHub, a user export works only for repositories your account owns. Collaborator access is not enough, and GitHub rejects the request (typically 422 Validation Failed). For a repository in an organisation, you must be an Owner of the organisation or have the Migrator role. On GitLab, you need the Maintainer role or higher. If none applies, use route B.",
  "Secrets quoted in a pull request description or review comment, including the diff snippets shown in review comments, survive a history clean: the clean-up rewrites git, not pull requests. Edit or delete them on GitHub or GitLab before the export, and search the pull request JSON before you send the archive (the Verify step shows how).",
  "Pull request refs (refs/pull/*) ship as GitHub holds them: never rewritten, so they keep each pull request's files from before the clean-up, and you can't delete them. Rotating every credential (step 6 on /code/prepare) makes any secret there useless. Personal data there isn't fixed by rotation: send us what check-repo.sh reports in section [10], and we decide together on the handover call.",
  "Never paste your token into a chat, an email or a form. You only use it in your own terminal, and you can delete it on GitHub or GitLab once the archive is downloaded.",
];

// What the finished archive must hold. Checked in the "Verify the archive" step.
export const mustContain = [
  { title: "Full commit history", body: "The git repository (repositories/<owner>/<repo>.git in a GitHub export, project.bundle in a GitLab one) with every branch and tag and every commit, unsquashed." },
  { title: "Pull requests", body: "With their reviews and comments. Route A: pull_requests_*.json inside the archive. Route B: a JSON file beside it." },
  { title: "run_instruction.md", body: "At the root of every branch, committed before the clean-up. It sits inside the git repository, not loose in the archive." },
];

export const githubSteps: Step[] = [
  {
    title: "Create a personal access token (classic)",
    body: "Sign in to GitHub, click your profile photo in the top right, then Settings. Scroll to the bottom of the left sidebar and click Developer settings. Open Personal access tokens, then Tokens (classic). Click Generate new token, then Generate new token (classic). Give it a name such as Migration API Token and set an expiry date.",
    shots: [
      { src: "gh-1-settings.webp", w: 538, h: 1000, alt: "GitHub profile menu with Settings highlighted" },
      { src: "gh-2-developer-settings.webp", w: 592, h: 1158, alt: "GitHub settings sidebar with Developer settings highlighted at the bottom" },
      { src: "gh-3-tokens-classic.webp", w: 1400, h: 321, alt: "GitHub Developer settings: Personal access tokens, Tokens (classic), with the Generate new token button" },
    ],
  },
  {
    title: "Tick the scopes",
    body: "Repository on your own account: tick repo and user. Repository in an organisation: tick repo and admin:org.",
    note: "Organisation repositories: you must be an Owner of the organisation, or have the Migrator role. An Owner can grant it: https://docs.github.com/en/migrations/ado/granting-the-migrator-role",
    shots: [
      { src: "gh-4-scopes-user.webp", w: 1200, h: 1094, alt: "New personal access token (classic) form with a name, a 30-day expiry, and the repo and user scopes ticked" },
      { src: "gh-5-scopes-org.webp", w: 1400, h: 1149, alt: "New personal access token (classic) form with the repo and admin:org scopes ticked, for an organisation repository" },
    ],
  },
  {
    title: "Copy the token now",
    body: "Click Generate token and copy it straight away. GitHub won't show it again once you leave the page. It replaces <YOUR_TOKEN> in every command below.",
    shots: [
      { src: "gh-6-copy-token.webp", w: 1400, h: 492, alt: "GitHub showing a newly created token, hidden here, with the message to copy it now" },
    ],
  },
  {
    title: "Start the export",
    body: "Send a POST request to the Migration API. Replace username/repo with your GitHub username and repository name (for an organisation, <YOUR_ORG_NAME> and the repository name only).",
    codes: [
      {
        label: "Repository on your account",
        code: `curl -L -X POST ${GH_ACCEPT} \\
  ${GH_AUTH} \\
  ${GH_USER_V} \\
  -d '{"lock_repositories":false, "repositories":["username/repo"]}' \\
  https://api.github.com/user/migrations`,
      },
      {
        label: "Repository in an organisation",
        code: `curl -L -X POST ${GH_ACCEPT} \\
  ${GH_AUTH} \\
  ${GH_ORG_V} \\
  https://api.github.com/orgs/<YOUR_ORG_NAME>/migrations \\
  -d '{"lock_repositories":false, "repositories":["repo"]}'`,
      },
    ],
    example: {
      label: "The response is JSON. The first \"id\" is your MIGRATION_ID; note it down.",
      code: `{
  "id": 12345678,
  "owner": { "login": "username", ... },
  "state": "pending",
  "lock_repositories": false,
  "exclude_git_data": false,
  ...
}`,
    },
  },
  {
    title: "Wait until the state is exported",
    body: "GitHub builds the archive in the background. Run the command below with your MIGRATION_ID. If \"state\" is \"pending\" or \"exporting\", wait a minute and run it again. When it says \"exported\", the archive is ready. Large repositories can take a while.",
    codes: [
      {
        label: "Repository on your account",
        code: `curl -L ${GH_ACCEPT} \\
  ${GH_AUTH} \\
  ${GH_USER_V} \\
  https://api.github.com/user/migrations/<MIGRATION_ID>`,
      },
      {
        label: "Repository in an organisation",
        code: `curl -L ${GH_ACCEPT} \\
  ${GH_AUTH} \\
  ${GH_ORG_V} \\
  https://api.github.com/orgs/<YOUR_ORG_NAME>/migrations/<MIGRATION_ID>`,
      },
    ],
    example: {
      label: "Ready when you see:",
      code: `  "id": 12345678,
  ...
  "state": "exported",`,
    },
  },
  {
    title: "Download the archive",
    body: "Send the final request to download the .tar.gz. Replace <your_archive_name> with the repository name. GitHub also emails you \"[GitHub] Your data export is ready to download\" with a download link, if you prefer the browser. The archive stays available for seven days.",
    codes: [
      {
        label: "Repository on your account",
        code: `curl -L ${GH_ACCEPT} \\
  ${GH_AUTH} \\
  ${GH_USER_V} \\
  https://api.github.com/user/migrations/<MIGRATION_ID>/archive -o <your_archive_name>.tar.gz`,
      },
      {
        label: "Repository in an organisation",
        code: `curl -L ${GH_ACCEPT} \\
  ${GH_AUTH} \\
  ${GH_ORG_V} \\
  https://api.github.com/orgs/<YOUR_ORG_NAME>/migrations/<MIGRATION_ID>/archive -o <your_archive_name>.tar.gz`,
      },
    ],
  },
  {
    title: "Verify the archive",
    body: "Check what is inside before you send it. Run these from the folder holding the archive, with check-repo.sh downloaded next to it.",
    codes: [
      {
        label: "1. Pull requests and history are there",
        code: `# Number of pull request files. 0 is only right if the repo has no pull requests.
tar -tzf <your_archive_name>.tar.gz | grep -c 'pull_requests_'

# The git repository. Must print one line.
tar -tzf <your_archive_name>.tar.gz | grep -m1 -E 'repositories/[^/]+/[^/]+\\.git/'`,
      },
      {
        label: "2. Every branch and tag, and nothing extra",
        code: `mkdir export-check && tar -xzf <your_archive_name>.tar.gz -C export-check
GITDIR="$(echo export-check/repositories/*/*.git)"

# Every branch, tag and pull request ref in the archive
git --git-dir="$GITDIR" for-each-ref --format='%(refname)'`,
      },
      {
        label: "3. run_instruction.md on every branch",
        code: `for ref in $(git --git-dir="$GITDIR" for-each-ref --format='%(refname)' refs/heads); do
  printf '%s  %s commits  run_instruction.md: ' "$ref" "$(git --git-dir="$GITDIR" rev-list --count "$ref")"
  git --git-dir="$GITDIR" cat-file -e "$ref:run_instruction.md" 2>/dev/null && echo yes || echo MISSING
done`,
      },
      {
        label: "4. The same check as before, on the archive itself",
        code: `bash check-repo.sh "$GITDIR" | tee archive-check.txt`,
      },
      {
        label: "5. No secrets in the pull requests",
        code: `# Must print nothing. Any file it names needs a look before you send the archive.
grep -lEi 'sk_live|sk_test|AKIA[0-9A-Z]{16}|ghp_|github_pat_|glpat-|PRIVATE KEY|password' export-check/*.json`,
      },
    ],
    note: "The ref list in 2 must show every branch and tag you cleaned, and none of your backup or pre-clean branches: if one is there, its old history is in the archive, so delete it on GitHub and export again. refs/pull/* are expected: GitHub adds one per pull request, never rewrites them, and only GitHub can remove them, so they hold pre-clean files. check-repo.sh reports what they hold in section [10]; send us that, and we decide together on the handover call. Don't send the archive if any branch shows run_instruction.md MISSING, the check in 4 doesn't end RESULT: ready, or 5 names a file you haven't checked.",
  },
];

export const gitlabSteps: Step[] = [
  {
    title: "Create a personal access token (legacy)",
    body: "Click your avatar in the top right, then Preferences. Open Access, then Personal access tokens, and click Generate token. Choose Legacy token, give it a name and an expiry date, tick api and write_repository, then click Generate token. Copy it straight away; GitLab won't show it again.",
    shots: [
      { src: "gl-1-preferences.webp", w: 484, h: 511, alt: "GitLab user menu with Preferences highlighted" },
      { src: "gl-2-access-tokens.webp", w: 1400, h: 431, alt: "GitLab user settings: Personal access tokens selected in the sidebar, with the Generate token button highlighted" },
      { src: "gl-3-legacy-token.webp", w: 1400, h: 244, alt: "GitLab Generate token menu with Legacy token highlighted" },
      { src: "gl-4-scopes.webp", w: 1400, h: 882, alt: "GitLab legacy token form with a name, an expiry date, and the write_repository and api scopes ticked" },
    ],
  },
  {
    title: "Start the export",
    body: "Replace username and repo_name with yours; the / between them is written %2F. A 202 Accepted reply means GitLab has started building the archive.",
    codes: [
      {
        code: `curl --request POST --header "PRIVATE-TOKEN: <YOUR_TOKEN>" \\
  "https://gitlab.com/api/v4/projects/username%2Frepo_name/export"`,
      },
    ],
  },
  {
    title: "Wait until export_status is finished",
    body: "If export_status is queued or started, wait a minute and run it again. When it is finished, copy the \"id\" (your project ID) or the api_url from the response.",
    codes: [
      {
        code: `curl --request GET --header "PRIVATE-TOKEN: <YOUR_TOKEN>" \\
  "https://gitlab.com/api/v4/projects/username%2Frepo_name/export"`,
      },
    ],
    example: {
      label: "Ready when you see:",
      code: `{"id":12345678, ..., "export_status":"finished",
 "_links":{"api_url":"https://gitlab.com/api/v4/projects/12345678/export/download", ...}}`,
    },
  },
  {
    title: "Download the archive",
    body: "Use the project ID from the previous step. Then check it the same way as on GitHub: project.bundle holds the history, the merge requests sit in the project tree, and every branch and tag you cleaned must be there, each branch with run_instruction.md. Search the merge request files for secrets too.",
    codes: [
      {
        code: `curl --request GET --header "PRIVATE-TOKEN: <YOUR_TOKEN>" \\
  -o <your_archive_name>.tar.gz \\
  "https://gitlab.com/api/v4/projects/<PROJECT_ID>/export/download"

# History and merge requests are there
tar -tzf <your_archive_name>.tar.gz | grep -c 'project\\.bundle'
tar -tzf <your_archive_name>.tar.gz | grep -c 'merge_requests'   # 0 only if there are none

# Branches and run_instruction.md
mkdir gl-check && tar -xzf <your_archive_name>.tar.gz -C gl-check
git clone --bare --quiet gl-check/project.bundle gl-check/repo.git
git --git-dir=gl-check/repo.git for-each-ref --format='%(refname)'
for ref in $(git --git-dir=gl-check/repo.git for-each-ref --format='%(refname)' refs/heads); do
  printf '%s  run_instruction.md: ' "$ref"
  git --git-dir=gl-check/repo.git cat-file -e "$ref:run_instruction.md" 2>/dev/null && echo yes || echo MISSING
done
bash check-repo.sh gl-check/repo.git | tee archive-check.txt`,
      },
    ],
  },
];

// The final card: what goes in the check-report form from this page.
export const exportFinishSend = [
  ...finishSend.map((x) => x.replaceAll("step 11", "step 11 on /code/prepare")),
  "Route A: your Verify the archive results (the pull_requests_ count, the ref list, the run_instruction.md line per branch, the check-repo.sh output for the archive and the secrets search)",
];

export const faqs = [
  {
    q: "422 Validation Failed when I start the export",
    a: "Typically, your account doesn't own the repository. A user export only covers repositories you own; collaborator access is rejected. If it's in an organisation, use the organisation commands, with an Owner or Migrator account. If neither works for you, use route B.",
  },
  {
    q: "My token starts with github_pat_",
    a: "That's a fine-grained token. The Migration API needs a classic token (it starts with ghp_). Create one under Tokens (classic).",
  },
  {
    q: "Does run_instruction.md travel with the archive?",
    a: "Only if it's committed in the repo. Write it, commit it at the root of every branch and push before you clean the history and before you export. If you add it afterwards, you have to run the clean-up and the export again.",
  },
  {
    q: "Which route should I pick?",
    a: "Route A whenever you can export the repository yourself; route B only when you can't. They don't deliver the same thing. Route A packs the whole repository: every branch and tag, the issues, and the pull requests inside the archive as pull_requests_*.json. That full record is what the sale pays for. Route B delivers one branch only, as main; your other branches and tags are not included, and the pull requests come in a JSON file beside the archive, in a different format from route A's. So route B earns less.",
  },
  {
    q: "Why are there refs/pull/* in my archive?",
    a: "GitHub adds a read-only ref for each pull request and never rewrites it, and the export includes them, so they keep each pull request's files from before your clean-up. You can't delete them. Rotating every credential first makes any secret there useless; personal data isn't fixed by rotation. Tell us what check-repo.sh reports in section [10], and we decide together on the handover call.",
  },
  {
    q: "Does the export change my repository?",
    a: "No. lock_repositories is false, so the repository stays usable while GitHub builds the archive. Nothing is deleted or moved.",
  },
  {
    q: "The state stays on exporting",
    a: "Large repositories take longer. Keep checking every few minutes. If it says failed, start a new export.",
  },
  {
    q: "Can I delete the token afterwards?",
    a: "Yes. Once the archive is downloaded and verified, delete the token on GitHub or GitLab.",
  },
];
