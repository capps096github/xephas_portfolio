// Apta Innovations source code acquisition pricing.
// One config drives both the public base-price calculator and the internal (?advanced) one.

export const ACQUISITION_PRICING = {
  version: "v3 (2026-10-15)",
  currency: "UGX",
  minimumLOC: 30_000,
  // Whole-repo rates: crossing a threshold reprices EVERY line (a deliberate jump at 50,000 and 100,000).
  flatTiers: [
    { upperLimit: 49_999, rate: 15 },
    { upperLimit: 99_999, rate: 16 },
  ],
  // From 100,000 the first 100,000 lines take UGX 17...
  progressiveBase: { lines: 100_000, rate: 17 },
  // ...and only the extra lines take the lower rates.
  progressiveRates: [
    { from: 100_001, to: 250_000, rate: 15 },
    { from: 250_001, to: Infinity, rate: 12 },
  ],
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

// LOC where the whole repo moves up a rate: 50,000 and 100,000.
export const RATE_JUMPS = ACQUISITION_PRICING.flatTiers.map((tier) => tier.upperLimit + 1);

export const MAX_QUALITY_BONUS = Math.max(...Object.values(ACQUISITION_PRICING.qualityBonuses));

export interface PriceLine {
  lines: number;
  rate: number;
  amount: number;
}

export interface PricingResult {
  eligible: boolean;
  linesOfCode: number;
  basePrice: number;
  breakdown: PriceLine[];
}

// The lines priced at each rate. Sums to `loc` for any eligible repo.
function priceLines(loc: number): PriceLine[] {
  const { flatTiers, progressiveBase, progressiveRates } = ACQUISITION_PRICING;
  const line = (lines: number, rate: number) => ({ lines, rate, amount: lines * rate });

  const flat = flatTiers.find((tier) => loc <= tier.upperLimit);
  if (flat) return [line(loc, flat.rate)];

  const lines = [line(progressiveBase.lines, progressiveBase.rate)];
  for (const tier of progressiveRates) {
    if (loc < tier.from) break;
    lines.push(line(Math.min(loc, tier.to) - tier.from + 1, tier.rate));
  }
  return lines;
}

export function calculateBasePrice(loc: number): PricingResult {
  if (!Number.isSafeInteger(loc) || loc < 0) {
    throw new Error("LOC must be a non-negative safe integer");
  }
  if (loc < ACQUISITION_PRICING.minimumLOC) {
    return { eligible: false, linesOfCode: loc, basePrice: 0, breakdown: [] };
  }
  const breakdown = priceLines(loc);
  const basePrice = breakdown.reduce((sum, l) => sum + l.amount, 0);
  return { eligible: true, linesOfCode: loc, basePrice, breakdown };
}

export interface AcquisitionOffer extends PricingResult {
  quality: QualityLevel;
  bonus: number;
  estimatedOffer: number;
}

export function calculateAcquisitionOffer(loc: number, quality: QualityLevel = "standard"): AcquisitionOffer {
  const pricing = calculateBasePrice(loc);
  if (!pricing.eligible) return { ...pricing, quality, bonus: 0, estimatedOffer: 0 };

  const estimatedOffer = Math.round(pricing.basePrice * (1 + ACQUISITION_PRICING.qualityBonuses[quality]));
  return { ...pricing, quality, bonus: estimatedOffer - pricing.basePrice, estimatedOffer };
}
