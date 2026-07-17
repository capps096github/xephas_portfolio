// ============================================================================
// Community timeline model
// ----------------------------------------------------------------------------
// Reuses the existing CommunityContribution data (contributions.ts) and
// projects it onto a chronological timeline. Each entry gets a sortable
// numeric key derived from its human date string, then the array is sorted
// newest-first. The /community page loops over `timeline`.
// ============================================================================

import type { CommunityContribution } from "./community";
import { contributions, cupertino, stackoverflow } from "./contributions";

export interface TimelineEntry extends CommunityContribution {
  /** Sortable key: YYYYMM (approx). Higher = more recent. */
  sortKey: number;
  /** Year bucket shown on the timeline spine, e.g. "2025". */
  year: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Best-effort parse of the free-form `date` strings used across the data.
// Handles "Thursday, 28th August 2025", "2022 - To Date", "Launched: 2022",
// "21st October 2023 - 4th November 2023", "2022 - 2023", etc.
function parseSort(date: string): { sortKey: number; year: string } {
  const lower = date.toLowerCase();

  // "to date" / "current" → treat as now so ongoing work floats to the top.
  const ongoing = /to date|current|present/.test(lower);

  // Collect all 4-digit years; use the latest one mentioned.
  const years = (date.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number);
  const year = ongoing
    ? new Date().getFullYear()
    : years.length
      ? Math.max(...years)
      : new Date().getFullYear();

  // First month name found in the string.
  let month = 0;
  for (const key of Object.keys(MONTHS)) {
    if (lower.includes(key)) {
      month = MONTHS[key];
      break;
    }
  }
  if (ongoing) month = 12;

  return { sortKey: year * 100 + month, year: String(year) };
}

function toEntry(c: CommunityContribution): TimelineEntry {
  return { ...c, ...parseSort(c.date) };
}

// Merge talks/trainings/events with the standing open-source + profile items,
// then sort newest → oldest.
export const timeline: TimelineEntry[] = [
  cupertino,
  stackoverflow,
  ...contributions,
]
  .map(toEntry)
  .sort((a, b) => b.sortKey - a.sortKey);
