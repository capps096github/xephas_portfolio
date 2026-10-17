You are documenting this repository for a buyer who will take it over. Write a
file named run_instruction.md at the ROOT of the repository.

The reader is an experienced developer who has never seen this project and has
none of my accounts, API keys, cloud projects or machine setup. From this file
alone, they must be able to install, configure, build, run and test every part
of the project.

HOW TO WORK
1. Read the repository before writing anything. Inspect the manifests and
   config files: package.json, pubspec.yaml, build.gradle, Podfile, Cargo.toml,
   go.mod, requirements.txt, pyproject.toml, Dockerfile, docker-compose.yml,
   Makefile, firebase.json, .github/workflows/*, .env.example files, and the
   README. Work out which parts exist (mobile app, web, API, desktop, workers)
   and which folder each lives in.
2. Take versions from the code: engines fields, SDK constraints, lockfiles,
   .nvmrc, .tool-versions, CI workflow setup steps. Never guess a version. If a
   version cannot be found, write "not pinned" and the version CI uses, if any.
3. Take commands from the code: package.json scripts, Makefile targets, CI
   steps. Only write commands that exist. Do not invent scripts.
4. Find every value a new owner must supply: environment variables, API keys,
   Firebase/Google/AWS project ids, OAuth client ids, signing keys, webhook
   secrets. Search for process.env, dotenv, String.fromEnvironment,
   os.environ, BuildConfig, Info.plist keys and config files. Name each one,
   the file(s) it goes in, and where a new owner gets their own value.
5. Never copy a real secret, password, personal email or phone number into the
   file. Use placeholders such as YOUR_STRIPE_SECRET_KEY.

THE FILE MUST HAVE THESE SECTIONS, IN THIS ORDER
1. What this is: one paragraph on what the product does, then a table of
   parts: | Part | Folder | Stack |
2. Prerequisites: a table of | Tool | Version | Install | for every tool
   needed, with exact versions.
3. Credentials and configuration: a table of | Placeholder | File(s) | What it
   is | Where to get your own |, then numbered setup steps. Say which files a
   CLI tool generates (and the command, e.g. flutterfire configure), which are
   edited by hand, and how to confirm the setup worked.
4. Build, run and test: one subsection per part, with exact commands in code
   blocks, run from the repo root (cd into the folder first), including the
   local URL or port each part runs on.
5. Quick start: the shortest numbered path from a fresh clone to something
   running.
6. Deployment: how it is deployed, based on the CI workflows and config files
   that exist. Skip this section if nothing in the repo shows deployment.
7. Troubleshooting: a table of | Symptom | Cause | Fix | with at least five
   real problems a new developer is likely to hit with this stack and this
   setup, such as missing env vars, emulator ports, CocoaPods, code
   generation, or Node or SDK version mismatches.

RULES
- Every claim must be true of this repository. If you are unsure about
  something, check the file. If it cannot be determined, say so plainly
  rather than guess.
- Plain Markdown. No emojis. No marketing language.
- Create or change ONLY run_instruction.md. Do not create any other file.
  In particular, do not create CLAUDE.md, AGENTS.md, GEMINI.md,
  .cursorrules, copilot-instructions.md, or any .claude/, .cursor/ or
  similar folder, and do not edit code.
- Do not commit. I will review the file and commit it myself.

When you are done, list anything you could not determine, so I can fill it in.
