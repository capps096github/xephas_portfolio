You are helping me produce the archive for the sale of this repository: a
.tar.gz with the full commit history and the pull requests, made with GitHub's
Migration API or GitLab's project export. The full guide is at
https://xephas.me/code/export/ and the plain-text version at
https://xephas.me/code/export.md. Read it first if you can.

SAFETY RULES. FOLLOW THESE ABOVE EVERYTHING ELSE
1. Never ask me for a token, never print one, never write one to a file, and
   never commit one. I type my token into my own shell myself (see TOKEN
   below). Refer to it only as $MIGRATION_TOKEN.
2. Show me every command before you run it, and say what it does. Run
   read-only commands only (git status, git log, git branch, git ls-remote,
   git ls-tree, tar -t, grep). For anything else, give me the command and let
   me run it.
3. Never start an export (any POST to a migrations or export endpoint) on
   your own. I run it myself, or you run it only after I say yes to that exact
   command, every time.
4. Never force-push, rewrite or clean history, delete a branch or tag, change
   git config, commit or push on your own. If I ask for help with one of
   these, show me the exact command and run it only after I say yes to that
   exact command, every time.
5. If something looks wrong (a secret, an uncleaned branch, a missing file),
   stop and tell me. Don't try to fix it on your own.

WHAT TO DO, IN ORDER
1. Work out where the repo lives. Run `git remote -v` and tell me the host
   (GitHub or GitLab) and the owner/repo path.

2. Work out which route applies. Ask me, don't guess:
   - Route A (I run the export): on GitHub I own the repo on my own account,
     or it is in an organisation where I am an Owner or have the Migrator
     role. On GitLab I have the Maintainer role or higher on the project.
   - Route B (they build it on the handover call): I am only a collaborator,
     I have neither organisation role, I am below Maintainer on GitLab, or I
     would rather not handle tokens. Route B delivers one branch only, so it
     earns less than route A: tell me that, and suggest route A if I could
     get the owner role. For route B I only invite them with Read access
     (GitHub) or the Reporter role (GitLab), and the rest of this prompt is
     just the checks in step 3. Stop after step 3.

3. Check the repo before any export. The export ships every branch, tag and
   pull request ref, so the guide has me clean every branch and tag IN PLACE
   first (https://xephas.me/code/prepare/):
   - List every branch and tag on the remote with
     `git ls-remote --heads --tags origin`. Ask me to confirm each one was
     cleaned and force-pushed with clean-history.sh. If I haven't done the
     clean-up yet, stop and point me to the guide's steps; don't clean
     anything yourself.
   - Flag any branch that looks like a backup (pre-sanitise, pre-clean,
     backup...). It would ship the old history: I must delete it from the
     remote before exporting, and keep my backup offline.
   - Ask whether a fresh `git clone --mirror` checked with check-repo.sh ends
     RESULT: ready. If not, stop.
   - Check that run_instruction.md is committed at the root of EVERY branch
     (every branch tip ships). After `git fetch origin` (give it to me to run
     if the remote-tracking refs are stale), run for each branch:
     `git ls-tree -r --name-only origin/<branch> | grep -x run_instruction.md`.
     If it is missing on any branch, stop: it must be committed on every
     branch before the history clean-up and before the export, so I have to
     add it and redo the clean-up. Point me to
     https://xephas.me/code/prepare/#run-instruction.
   - Ask me to run `git ls-remote origin 'refs/pull/*'` and tell me what it
     means: GitHub never rewrites these and I can't delete them, and the
     export includes them, so they still hold each pull request's files from
     before the clean-up. Do not tell me the archive is fully clean. Rotating
     every credential makes any secret there useless; personal data there is
     NOT fixed by rotation. I report what check-repo.sh section [10] shows,
     and the decision is made on the handover call.

4. Route A only: the token. Tell me exactly which token to create:
   - GitHub: a classic personal access token (it starts with ghp_; tokens
     starting github_pat_ don't work). Scopes: repo and user for a repo on my
     account; repo and admin:org for an organisation repo.
   - GitLab: a legacy personal access token with api and write_repository.
   Then tell me to load it into my shell myself, without it showing on screen
   or landing in my shell history:
     read -rs MIGRATION_TOKEN && export MIGRATION_TOKEN

5. Route A only: the export commands. Give me the exact commands for my case,
   with my owner/repo filled in, using "$MIGRATION_TOKEN" for the token. Use
   placeholders like <MIGRATION_ID> and <PROJECT_ID> where I have to copy a
   value from a response. GitHub, repo on my account (organisations use
   /orgs/<YOUR_ORG_NAME>/migrations with "X-GitHub-Api-Version: 2026-03-10"
   and only the repo name in "repositories"):
     start:    POST https://api.github.com/user/migrations
               body {"lock_repositories":false, "repositories":["owner/repo"]}
               headers Accept: application/vnd.github+json,
                       Authorization: Bearer $MIGRATION_TOKEN,
                       X-GitHub-Api-Version: 2022-11-28
               then read the "id" in the response: that is <MIGRATION_ID>
     wait:     GET .../migrations/<MIGRATION_ID> until "state" is "exported"
     download: GET .../migrations/<MIGRATION_ID>/archive -o <name>.tar.gz
   GitLab:
     start:    POST https://gitlab.com/api/v4/projects/<owner>%2F<repo>/export
               header PRIVATE-TOKEN: $MIGRATION_TOKEN (expect 202 Accepted)
     wait:     GET the same URL until "export_status" is "finished"
     download: GET https://gitlab.com/api/v4/projects/<PROJECT_ID>/export/download
   Remind me: I run the start command myself, or you run it only after I say
   yes to it.

6. Verify the downloaded archive with me. Give me these, explain what each
   result means, and read the output with me:
   - GitHub: `tar -tzf <name>.tar.gz | grep -c 'pull_requests_'` (0 is only
     right if the repo has no pull requests), and the git repository under
     repositories/<owner>/<repo>.git.
   - Unpack it into a new folder (export-check), then list every ref with
     `git --git-dir=<path to the .git folder> for-each-ref --format='%(refname)'`.
     It must show every branch and tag I cleaned. A backup or pre-clean
     branch there means its old history is in the archive: tell me not to
     send it. refs/pull/* are expected: explain that they hold pre-clean
     files, that rotation covers secrets but not personal data, and that
     what section [10] reports goes to the handover call.
   - For every branch in that list, check run_instruction.md at its tip with
     `git --git-dir=<...> cat-file -e <branch-ref>:run_instruction.md` and
     count its commits with `rev-list --count <branch-ref>`.
   - Run `bash check-repo.sh <path to the .git folder>` on the archive itself
     and read the per-branch table and section [10] with me. It must end
     RESULT: ready.
   - Search the pull request JSON for secrets, since secrets quoted in a pull
     request or review comment survive a history clean:
     `grep -lEi 'sk_live|sk_test|AKIA[0-9A-Z]{16}|ghp_|github_pat_|glpat-|PRIVATE KEY|password' export-check/*.json`
     It must print nothing. If it names a file, show me the matching lines with
     the secret value masked, and stop.
   - GitLab: check project.bundle and merge_requests are in the archive, then
     `git clone --bare export-check/project.bundle export-check/repo.git` (I
     run it) and do the same ref, run_instruction.md and check-repo.sh checks.

7. Finish with a short summary: the route, the branches and tags in the
   archive, the number of refs/pull/* and what check-repo.sh said about them, the commit count, the number of pull request files, whether
   run_instruction.md is there, and anything I still need to fix. Remind me to
   delete the token on GitHub or GitLab once the archive is verified.
