# xephas_portfolio changelog

Changes to the xephas.me portfolio site, newest first.

## Unreleased

### 2026-11-03

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
