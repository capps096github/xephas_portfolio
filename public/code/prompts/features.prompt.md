You are writing a complete feature inventory of this repository for a buyer
who is evaluating it. Write a file named FEATURES.md at the ROOT of the
repository.

HOW TO WORK
1. Read the code, not just the README. Go through every module, screen, route,
   API endpoint, cloud function, database model, background job, integration
   and test folder. Work out which parts exist (mobile app, web, API, desktop,
   workers) and which folder each lives in.
2. List only features that are implemented in the code. A feature that is
   planned, stubbed, behind a TODO, or only described in docs does not count.
   If something is partly built, list it with "(partial)" at the end.
3. Look past the screens for engineering features too: authentication and
   roles, multi-tenancy, offline support, payments and webhooks, caching,
   validation, security rules, server-side checks, data migrations,
   notifications, analytics, localisation, theming, CI/CD, test suites and
   operational scripts.

FORMAT (follow it exactly)
- Start with "# <Product name>: Feature List".
- Then one short paragraph: what the product is, who it is for, and which
  parts and stacks it is built from.
- Then one "## <Feature area>" heading per area, for example "## Job cards",
  "## Payments", "## Authentication and access control", "## Offline and
  connectivity", "## Testing". Order areas from the core product features
  to the supporting engineering ones.
- Under each heading, bullets only. One feature per bullet, one line each,
  specific and concrete. Write "Invoice create, edit, approve and delete" or
  "Server-derived status computed from the checklist, never client-supplied",
  not "Invoice management" or "Robust status handling".
- If the repository has several parts (e.g. app/, web/, api/), keep one
  combined list, and put the part in brackets where it matters:
  "- Stripe webhook signature verification [api]".
- End with a "## Codebase facts" section: parts and folders, main languages
  and frameworks, the test frameworks and roughly how many test files, and
  the CI workflows that exist.

RULES
- Every bullet must be true of this repository. If you are unsure, check the
  code. Never invent features.
- No marketing language, no emojis, no prose paragraphs beyond the intro.
- Never include real secrets, customer names, emails or phone numbers.
- Create or change ONLY FEATURES.md. Do not create any other file. In
  particular, do not create CLAUDE.md, AGENTS.md, GEMINI.md, .cursorrules,
  copilot-instructions.md, or any .claude/, .cursor/ or similar folder, and
  do not edit code.
- Do not commit. I will review the file and commit it myself.
- Never run git commit, push, cherry-pick, merge, force-push or any history
  rewrite on your own. If I ask for help with one, show me the exact command
  and run it only after I say yes to that exact command.

AFTER YOU WRITE IT
The sale ships EVERY branch and tag, so FEATURES.md must be committed at the root
of every branch, before the history clean-up. Once I have reviewed it, give me
the commands (do not run them): commit it on my default branch and push, then,
for each other branch from `git branch -r`, one at a time:
  git switch <branch> && git cherry-pick <default-branch> && git push origin <branch>
Tell me to do this before running clean-history.sh (guide:
https://xephas.me/code/prepare/#steps).

When you are done, tell me how many feature areas and bullets you wrote, and
list anything you were unsure about.
