// Apta Innovations source code acquisition pricing, rate card v6 (2026-11-14).
// One config drives the public calculator (/code/calc), the /code price examples and the
// internal (?advanced) evaluation.
//
// ── MODEL: closed form, O(1), no network ─────────────────────────────────────────────
//   likely = UGX 1,100,000 x (LOC / 100,000)^0.744 x (1 + history credit)
//   history credit = min(35%, commits credit + pull request credit + branch credit), where
//     commits        up to +18%: 18% x min(1, ln(1 + commits) / ln(1,001))  full credit at 1,000
//     pull requests  up to +15%: 15% x min(1, ln(1 + PRs) / ln(101))        full credit at 100
//     branches       up to +4%:   4% x min(1, ln(branches) / ln(10))        1 branch = 0, full at 10
//   (the three add to 37%; the 35% total cap only binds when all three are near full).
//   low / high = likely x exp(-/+ 0.235), i.e. x0.79 / x1.26 (the leave-one-out error spread).
//   Inputs are clamped: LOC 1,000..10,000,000, commits 0..1,000,000, PRs 0..100,000,
//   branches 1..10,000. Every step is non-decreasing, so more of any input never lowers
//   the estimate. Eligibility (30,000 lines) is a separate business rule, unchanged.
//
// ── CALIBRATION: the owner's 13 accepted sale outcomes (2026-10-01) ────────────────
//   Per outcome: final fee, source LOC at HEAD, commits across all refs, branches, PR refs.
//   Fitted in log space: ln fee = a + b ln LOC + ln(1 + credit); a and b by least squares
//   with the credit weights held fixed. LOC exponent b = 0.744 with the credits below
//   (0.792 LOC only; 0.744-0.792 over every candidate). b < 1: price per line falls as
//   repos grow, as it did in the outcomes. Rank correlation of fee with LOC 0.95; with
//   commits 0.62, branches 0.62, PR refs 0.38.
//
//   Leave-one-out (13 folds, a and b refit each fold), absolute % error, median / mean:
//     rate card v5 shape, scaled to the same data   24.8% / 33.5%  (7 of 13 under 30,000 lines)
//     LOC only                                      17.1% / 19.8%  (log RMSE 0.238)
//     ridge-fitted credits (lambda 0.05)            17.1% / 19.8-20.0%  (commits 0%, PRs ~1%)
//     fixed commits / PRs / branches credits, total cap 35%:
//        6 /  5 / 4%                                16.2% / 20.1%
//       10 /  8 / 4%                                15.6% / 20.4%
//       12 / 10 / 4%                                16.1% / 20.6%
//       14 / 12 / 4%                                16.8% / 20.7%
//       16 / 13 / 4%                                16.7% / 20.8%
//     CHOSEN 18 / 15 / 4%                           16.8% / 21.1%  (log RMSE 0.235)
//   Back-test of the chosen model on the 13, in sample: median 15.1%, mean 17.8%; the
//   largest outcome is under by 18.9% (24% LOC only), worst error +47.6%.
//   9 of 13 leave-one-out outcomes fall inside the low..high band.
//
//   The commit and PR weights are the OWNER'S DECISION, not a finding. Ridge sets the commit
//   credit to zero and the PR credit to ~1%. The largest outcome leads on lines, commits, PRs
//   and branches at once, and it is a single point, so the data cannot show that commits or
//   PRs caused its fee. Measured cost of these weights against LOC only: +1.3 points mean
//   leave-one-out error (19.8% -> 21.1%) and -0.3 median (17.1% -> 16.8%). Gain: the
//   largest outcome's underprediction shrinks from 24% to 19% in sample, because the fit
//   lowers the exponent to absorb most of the credit. The credits are for history depth,
//   review record and breadth, not a measured effect.
//
//   Level: anchored so that a 100,000-line repository with no history credit is
//   UGX 1,100,000. Over 30,000..1,000,000 lines this matches rate card v5 on average
//   (mean log difference -0.9%); repositories with history sit above it by their credit.
//   The fit sets the shape only.
//   So v6 is level-neutral against v5 ONLY at zero history credit. A typical seller (median
//   credit 12.2% across the 13 calibration repos) lands about 11% above v5 on average over
//   30,000..1,000,000 lines. Full history (35%) is up to about +100% over v5 at 30,000 lines,
//   +24% at 100,000, and the largest absolute gap is about UGX +2.36M near 2.2M lines.
//
//   Refit the exponent, credits and band as new accepted outcomes arrive, and update this block.

export const ACQUISITION_PRICING = {
  version: "v6 (2026-11-14)",
  currency: "UGX",
  minimumLOC: 30_000,
  // Price of a reference repository with no history credit; sets the level.
  referenceLOC: 100_000,
  priceAtReference: 1_100_000,
  // Elasticity of price to lines of code (fitted).
  locExponent: 0.744,
  // Clamp ranges for the model inputs.
  limits: {
    loc: { min: 1_000, max: 10_000_000 },
    commits: { min: 0, max: 1_000_000 },
    pullRequests: { min: 0, max: 100_000 },
    branches: { min: 1, max: 10_000 },
  },
  // Each credit grows with the log of the count and is full at `fullAt`.
  historyCredits: {
    commits: { max: 0.18, fullAt: 1_000 },
    pullRequests: { max: 0.15, fullAt: 100 },
    branches: { max: 0.04, fullAt: 10 },
  },
  maxHistoryCredit: 0.35,
  // Half-width of the low..high band in log space (leave-one-out RMSE).
  bandLog: 0.235,
  // Estimates are rounded to this many UGX.
  roundTo: 1_000,
  qualityBonuses: {
    standard: 0,
    good: 0.1,
    excellent: 0.15,
    exceptional: 0.2,
  },
} as const;

export type QualityLevel = keyof typeof ACQUISITION_PRICING.qualityBonuses;

export const QUALITY_LEVELS: { key: QualityLevel; label: string; description: string }[] = [
  { key: "standard", label: "Standard", description: "Meets minimum technical requirements" },
  { key: "good", label: "Good", description: "Clean architecture, maintainable code, documentation" },
  { key: "excellent", label: "Excellent", description: "Complete, well-structured full-stack project" },
  { key: "exceptional", label: "Exceptional", description: "Highly sophisticated architecture and engineering" },
];

export const MAX_QUALITY_BONUS = Math.max(...Object.values(ACQUISITION_PRICING.qualityBonuses));

export const MAX_HISTORY_CREDIT = Math.min(
  ACQUISITION_PRICING.maxHistoryCredit,
  Object.values(ACQUISITION_PRICING.historyCredits).reduce((sum, c) => sum + c.max, 0),
);

export interface RepoSize {
  loc: number;
  commits?: number | null;
  pullRequests?: number | null;
  branches?: number | null;
}

export interface HistoryCredits {
  commits: number;
  pullRequests: number;
  branches: number;
  total: number;
}

export interface Estimate {
  eligible: boolean;
  // Inputs after clamping (what the estimate was computed on).
  linesOfCode: number;
  commits: number;
  pullRequests: number;
  branches: number;
  // LOC-only value, before the history credit.
  basePrice: number;
  credits: HistoryCredits;
  low: number;
  likely: number;
  high: number;
}

const clamp = (n: number | null | undefined, min: number, max: number) => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : min;
  return Math.min(max, Math.max(min, v));
};

const roundPrice = (n: number) => Math.round(n / ACQUISITION_PRICING.roundTo) * ACQUISITION_PRICING.roundTo;

// 0..1: how much of a credit a count earns. Log-shaped, full at `fullAt`.
const share = (count: number, fullAt: number) => Math.min(1, Math.log1p(count) / Math.log1p(fullAt));

export function historyCredits(commits: number, pullRequests: number, branches: number): HistoryCredits {
  const { historyCredits: c, maxHistoryCredit } = ACQUISITION_PRICING;
  const credits = {
    commits: c.commits.max * share(commits, c.commits.fullAt),
    pullRequests: c.pullRequests.max * share(pullRequests, c.pullRequests.fullAt),
    // One branch is the baseline: count the branches beyond it.
    branches: c.branches.max * share(branches - 1, c.branches.fullAt - 1),
  };
  const total = Math.min(maxHistoryCredit, credits.commits + credits.pullRequests + credits.branches);
  return { ...credits, total };
}

// LOC-only value in UGX, unrounded.
function locValue(loc: number) {
  const { priceAtReference, referenceLOC, locExponent } = ACQUISITION_PRICING;
  return priceAtReference * Math.pow(loc / referenceLOC, locExponent);
}

export function estimateValue(size: RepoSize): Estimate {
  const { limits, minimumLOC, bandLog } = ACQUISITION_PRICING;
  const linesOfCode = clamp(size.loc, limits.loc.min, limits.loc.max);
  const commits = clamp(size.commits, limits.commits.min, limits.commits.max);
  const pullRequests = clamp(size.pullRequests, limits.pullRequests.min, limits.pullRequests.max);
  const branches = clamp(size.branches, limits.branches.min, limits.branches.max);

  const credits = historyCredits(commits, pullRequests, branches);
  const base = locValue(linesOfCode);
  const likely = base * (1 + credits.total);

  return {
    eligible: Number.isFinite(size.loc) && size.loc >= minimumLOC,
    linesOfCode,
    commits,
    pullRequests,
    branches,
    basePrice: roundPrice(base),
    credits,
    low: roundPrice(likely * Math.exp(-bandLog)),
    likely: roundPrice(likely),
    high: roundPrice(likely * Math.exp(bandLog)),
  };
}

export interface AcquisitionOffer extends Estimate {
  quality: QualityLevel;
  bonus: number;
  estimatedOffer: number;
}

// Internal view: the likely value plus the quality bonus.
export function calculateAcquisitionOffer(size: RepoSize, quality: QualityLevel = "standard"): AcquisitionOffer {
  const estimate = estimateValue(size);
  if (!estimate.eligible) return { ...estimate, quality, bonus: 0, estimatedOffer: 0 };
  const estimatedOffer = roundPrice(estimate.likely * (1 + ACQUISITION_PRICING.qualityBonuses[quality]));
  return { ...estimate, quality, bonus: estimatedOffer - estimate.likely, estimatedOffer };
}
