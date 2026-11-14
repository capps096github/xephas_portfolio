# xephas_portfolio changelog

Changes to the xephas.me portfolio site, newest first.

## Unreleased

### 2026-11-14

#### Added

- `/code/prepare`: a "Copy page" menu in the hero, like laces_web. The main button copies the whole page as Markdown (for pasting into any AI); the chevron opens Copy page, View as Markdown, and Open in ChatGPT / Claude / Perplexity (each pre-asked to read the page's `.md`). Works as plain links with JavaScript off. New: `src/components/CopyPageMenu.astro`, `src/pages/code/prepare.md.ts` (serves `/code/prepare.md`, built from the same data as the page, including the two AI prompts in full, with `{github-username}` / `{repo-name}` placeholders). Verified: `npm run build` passes (17 pages), `dist/code/prepare.md` output read; NOT checked in a browser (clipboard copy and AI links untested).

#### Changed

- `/code/prepare`: page data (steps, checklist, downloads, FAQ, prompts) moved word for word out of `prepare.astro` into `src/scripts/code_prepare.ts` so the page and its Markdown twin share one source. No visual change intended; built page still has 8 steps with anchors.
- `/code/prepare`: the steps now start with a new step 1, "Create a new branch to work on: sale-prep" (`git switch -c sale-prep main`, then push), so sellers never work on or rewrite their main branch. Following steps now use it: the check clones `sale-prep`, the two docs are committed and pushed to it, `clean-history.sh` runs with `SOURCE_BRANCH=sale-prep`, and the push step (also in the checklist) pushes `sale-prep:refs/heads/cleaned_version`. The old "selling another branch" example was dropped as redundant. All steps after 1 moved down one number, and the step/checklist cross-links (`checkSteps`/`stepChecks`) were renumbered to match. Key file: `src/pages/code/prepare.astro`. Verified: `npm run build`. The commands were NOT run against a real repo: I confirmed from `public/code/clean-history.sh` that `SOURCE_BRANCH` is honoured, nothing more.
- `/code/prepare` "Step by step" intro: now says the steps prepare the repo for submission (from its current state to a cleaned branch ready to submit). Key file: `src/pages/code/prepare.astro`. Verified: `npm run build`; not checked in a browser.
- `/code/prepare`: steps and checklist items now link to each other. Each step shows "Checklist: 02 · 03" and each checklist item shows "Done in steps: 04 · 06", jumping to `#step-N` / `#check-N` (new ids, with scroll offset for the floating nav). The mapping lives in `checkSteps` / `stepChecks` in `src/pages/code/prepare.astro`; step 1 (install) has no link. I derived the mapping from what each command does (e.g. `clean-history.sh` handles AI files and machine paths automatically). Verified: `npm run build`; link targets not clicked through in a browser.
- `/code/prepare`: the "Step by step" section now comes before the checklist (order: handover, steps, checklist, scripts, run_instruction, AI docs, FAQ). Section moved unchanged in `src/pages/code/prepare.astro`; anchors `#steps` and `#checklist` still work. Verified: `npm run build`; not checked in a browser.
- `/code/prepare`: inline text links (script names, "the form", "See the checklist", "Download the scripts", checklist links) are now blue (`#1a56db`, darker on hover) instead of the hover underline, so they are recognisable as links. The breadcrumb and the pill buttons are unchanged. Files: `src/components/RichText.astro`, `src/pages/code/prepare.astro`. Verified: `npm run build`; not checked in a browser.
- `/code/prepare` last step ("Invite us with Read access"): added a bordered, bold "Required" note that sellers must submit the clean `check-repo.sh` report (ending `RESULT: ready`) in the form before messaging us, as the handover call can't be booked without it. Key file: `src/pages/code/prepare.astro`. Verified: `npm run build`; not checked in a browser.
- `/code/prepare`: every "the form" in the page text now links to the check-report Tally form (https://tally.so/r/BEdoGN, opens in a new tab). The auto-linking of handle, script names and the form moved into a new `src/components/RichText.astro`, used by `src/pages/code/prepare.astro`. Verified: `npm run build` (17 pages); the built page has 7 links to the form. Not checked in a browser. The older `TALLY_URL` in `src/scripts/code_offer.ts` is a different form and was left alone.
- `/code/prepare` "Step by step": added a paragraph telling sellers to generate and copy the commands and scripts from that section instead of doing things manually, so they don't have to redo work. Key file: `src/pages/code/prepare.astro`. Not built or checked in a browser.

#### Fixed

- `/code/prepare`: script and file names in the handover and step text (`check-repo.sh`, `clean-history.sh`, `build-archive.sh`, `secrets.example.txt`, `run_instruction.template.md`) are now links to their files in `public/code/`, so readers can find them. Key file: `src/pages/code/prepare.astro` (`withHandle`/`fileLinks`). Verified: `npm run build` (17 pages) and the built HTML contains the links. Names inside the dark command blocks are not linked; step 1 already lists the download URLs.

### 2026-11-03

#### Added

- A "Decision: buying these six" section above the summary table in `docs/acquisitions/Code_Acquisition_Payout_Estimates_2026-11-02.md` (gitignored). It records the decision to buy Malaika Doctors Backend, Afrasia Bank Admin Portal, SalaPay, app.regulate-api.com, Senats Booking Manager and EdgeKeeper, with each one's estimated payout, ask and lowest price, and what still has to be cleared. Later the same day Matigo Examinations Board System was added, making it "buying these seven": total estimate ≤ UGX 7,075,969 against asks of 19,749,046 (lowest 14,465,000), with Matigo's "849" ask read as 849,046. Figures copied from the existing table and added up by hand. Nothing was re-run through the calculator.

#### Changed

- The shortlist table in `docs/acquisitions/Code_Acquisition_Shortlist_2026-11-02.md` (gitignored) now has a Commits column and a Pull requests column, plus subtotal and total rows for both. The figures are what each person typed into the Tally form, copied from the CSV export. They were NOT checked against the repos.

### 2026-11-02

#### Added

- Internal code-acquisition notes in `docs/acquisitions/`. `Code_Acquisition_Shortlist_2026-11-02.md` ranks the 13 Tally submissions by hand-written-code value, gives each a payout estimate and a follow-up message, and has totals. `Code_Acquisition_Payout_Estimates_2026-11-02.md` has the detailed per-project analysis. Every price comes from `calculateAcquisitionOffer()` in `src/scripts/code_rate.ts` (rate card v5), run with Node. The hand-written line counts are estimates from the submitted cloc output and were NOT checked against the repos.

#### Changed

- `.gitignore` now ignores `docs/acquisitions/`. The GitHub repo is public and these notes name applicants and their asking prices. Verified with `git check-ignore`.

## 2026-11-01

### Changed

- `personSchema.sameAs` (`src/scripts/constants.js`) now starts with the Wikidata item `https://www.wikidata.org/wiki/Q141960259` and `https://laces.run/about`, the founder section on laces.run (which links back here). NOT verified by a build (see below).
- **The canonical origin is now `https://xephas.me/`**, not `https://xephasme.web.app/`. `baseUrl` in `src/scripts/constants.js` feeds every page's `<link rel="canonical">` (via `src/components/Head.astro`, `baseUrl + canonicalPath`), `og:url`, the share images, the manifest link and the `Person` / `WebSite` JSON-LD `url`. So search engines now consolidate on the custom domain, and the Laces site and Wikidata (Q141960259) can point at the same URL. NOT verified by a build: `node_modules` is not installed in this checkout and `npm install` was not run. After `npm install && npm run build`, check `dist/index.html` for `<link rel="canonical" href="https://xephas.me/">` and grep `dist` for `xephasme.web.app` (expect only project links to other `.web.app` sites).

### Fixed

- `npm run deploy` failed with "Unable to detect the web framework in use". Firebase's web-frameworks detection needs `node_modules` (missing here) and only supports Astro 2–4, but the site is on Astro 7. The site is fully static, so `firebase.json` now serves `dist/` as plain hosting (`"public": "dist"`, `cleanUrls`), with no `source` or `frameworksBackend`. The `deploy` script in `package.json` now runs `astro build` before `firebase deploy --only hosting:xephasme`. Verified: `npm install` and `npm run build` succeed (17 pages in `dist/`), and `dist/index.html` has the `https://xephas.me/` canonical. The deploy itself was NOT run.

### Deploy notes

- Deploy with `npm run deploy` (Firebase Hosting `xephasme`). xephas.me already answers 200 for this site (checked 2026-11-01). Then add xephas.me as a property in Google Search Console if it is not there, and request indexing of `/`. The web.app host keeps serving the same pages, which is fine now that they canonicalise to xephas.me.
