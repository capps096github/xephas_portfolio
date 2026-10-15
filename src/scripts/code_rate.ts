// Apta Innovations source code acquisition rate card.
// The calculator page shows only the result (offer + grade), never these tiers.

export const MIN_LOC = 30_000;
export const MAX_GRADED_LOC = 1_000_000;

// Progressive rate: each tier prices only the lines that fall inside it.
const RATE_TIERS = [
  { upTo: 100_000, perLine: 15 },
  { upTo: 250_000, perLine: 12 },
  { upTo: Infinity, perLine: 10 },
];

// Grades D..U are 50,000-line bands starting at 100,000; U also holds exactly 1,000,000.
const BANDED_GRADES = "DEFGHIJKLMNOPQRSTU";

export type Offer =
  | { status: "empty" }
  | { status: "ineligible"; loc: number; grade: "A" }
  | { status: "priced"; loc: number; grade: string; price: number }
  | { status: "negotiable"; loc: number; grade: "V"; price: number };

export function basePrice(loc: number): number {
  let price = 0;
  let floor = 0;
  for (const tier of RATE_TIERS) {
    if (loc <= floor) break;
    price += (Math.min(loc, tier.upTo) - floor) * tier.perLine;
    floor = tier.upTo;
  }
  return price;
}

export function gradeFor(loc: number): string {
  if (loc < MIN_LOC) return "A";
  if (loc < 50_000) return "B";
  if (loc < 100_000) return "C";
  if (loc > MAX_GRADED_LOC) return "V";
  const band = Math.min(Math.floor((loc - 100_000) / 50_000), BANDED_GRADES.length - 1);
  return BANDED_GRADES[band];
}

export function offerFor(loc: number | null): Offer {
  if (loc === null) return { status: "empty" };
  if (loc < MIN_LOC) return { status: "ineligible", loc, grade: "A" };
  if (loc > MAX_GRADED_LOC) return { status: "negotiable", loc, grade: "V", price: basePrice(MAX_GRADED_LOC) };
  return { status: "priced", loc, grade: gradeFor(loc), price: basePrice(loc) };
}
