// Copied verbatim from laces_web/src/lib/order/qr.ts (rounded modules + circular finders).
// Re-run that repo's scripts/verify_qr.mjs approach if the drawing is ever changed.
/**
 * ============================================================================
 * A MINIMAL QR ENCODER. Server-side, dependency-free, renders to SVG.
 * ============================================================================
 *
 * ── WHY THIS EXISTS AT ALL ──────────────────────────────────────────────────
 *
 * The API hands back `qr_url` — `https://laces.run/c/{signed_token}` (see
 * `qrResolveUrl` in `laces_api/functions/src/tickets/qr_token.ts`). That is a
 * URL, not an image. Something has to turn it into the square a volunteer's
 * scanner can read at the kit tent, and with SMS deferred this page is how a
 * runner who never received the email gets it.
 *
 * Three options were considered:
 *
 *   A CLIENT-SIDE LIBRARY. Rejected outright. The QR is the single most
 *     important thing on this page. Putting it behind a JavaScript download on
 *     a mid-range Android over 3G means the one artefact the runner is standing
 *     in a queue for is the last thing to arrive, and it does not arrive at all
 *     if the bundle fails. `RaceShare.astro` already refuses to fake a QR for a
 *     related reason: a square that looks like a QR and does not scan is worse
 *     than no square.
 *
 *   AN IMAGE FROM THE API. The right long-term answer, and this file is
 *     designed to be deleted when it lands. It does not exist today.
 *
 *   ENCODE IT ON THE SERVER. What this is. The QR is in the first HTML byte,
 *     works with JavaScript disabled, and prints at whatever resolution the
 *     printer has because it is vector SVG rather than a bitmap.
 *
 * ── SCOPE, STATED PLAINLY ───────────────────────────────────────────────────
 *
 * This is NOT a general QR library and must not be used as one. It implements
 * exactly the subset the ticket URLs need:
 *
 *   - BYTE mode only. The payload is an ASCII URL.
 *   - Error correction level Q (~25%). Chosen deliberately over the more common
 *     L: this code gets PRINTED, folded, screenshotted at low quality, and
 *     scanned under a tent in bad light. The redundancy is the entire point.
 *   - Versions 1-10 (up to 57 bytes at level Q), which covers a
 *     `https://laces.run/c/{token}` URL with room to spare. `encodeQr` THROWS
 *     rather than silently truncating if a payload does not fit — a truncated
 *     QR scans successfully and resolves to the wrong thing, which is far worse
 *     than a missing one.
 *
 * The implementation follows ISO/IEC 18004. It is verified against the
 * standard's own worked example in `scripts/verify_qr.mjs` rather than by
 * inspection, because "it looks like a QR code" is not evidence that it scans.
 */

/** Error-correction level. Only Q is used here; see the module docstring. */
const EC_LEVEL_Q = 3;

/**
 * Total codewords and EC blocks per version, at level Q.
 *
 * Indexed by version (1-10). Each entry is
 * `[total_codewords, ec_codewords_per_block, group1_blocks, group2_blocks]`,
 * taken from ISO/IEC 18004 Table 9. Data codewords are derived, never guessed.
 */
const VERSION_SPEC_Q: Array<[number, number, number, number]> = [
  [26, 13, 1, 0], // v1
  [44, 22, 1, 0], // v2
  [70, 18, 2, 0], // v3
  [100, 26, 2, 0], // v4
  [134, 18, 2, 2], // v5
  [172, 24, 4, 0], // v6
  [196, 18, 2, 4], // v7
  [242, 22, 4, 2], // v8
  [292, 20, 4, 4], // v9
  [346, 24, 6, 2], // v10
];

/** Alignment-pattern centre coordinates per version (ISO/IEC 18004 Annex E). */
const ALIGNMENT_CENTERS: number[][] = [
  [], // v1 has none
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

// --- Galois field GF(256), primitive polynomial 0x11d -----------------------

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

/** Multiply two GF(256) elements. */
function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/** The generator polynomial for `degree` error-correction codewords. */
function generatorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** Reed-Solomon error-correction codewords for one data block. */
function ecCodewords(data: number[], ecLength: number): number[] {
  const generator = generatorPoly(ecLength);
  const remainder = new Array<number>(ecLength).fill(0);

  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    if (factor !== 0) {
      for (let i = 0; i < ecLength; i++) {
        remainder[i] ^= gfMul(generator[i + 1], factor);
      }
    }
  }

  return remainder;
}

// --- Bit buffer -------------------------------------------------------------

/** Append `length` low bits of `value`, most-significant first. */
function pushBits(bits: number[], value: number, length: number): void {
  for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

// --- Matrix construction ----------------------------------------------------

/** A module grid plus a parallel map of which cells are function patterns. */
interface Matrix {
  size: number;
  /** 1 = dark, 0 = light. */
  modules: Uint8Array;
  /** 1 = reserved function pattern, not maskable and not data. */
  reserved: Uint8Array;
}

function createMatrix(size: number): Matrix {
  return {
    size,
    modules: new Uint8Array(size * size),
    reserved: new Uint8Array(size * size),
  };
}

function setModule(m: Matrix, x: number, y: number, dark: boolean, reserve = true): void {
  m.modules[y * m.size + x] = dark ? 1 : 0;
  if (reserve) m.reserved[y * m.size + x] = 1;
}

/** A 7x7 finder pattern with its separator, anchored at a corner. */
function placeFinder(m: Matrix, originX: number, originY: number): void {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const x = originX + dx;
      const y = originY + dy;
      if (x < 0 || x >= m.size || y < 0 || y >= m.size) continue;

      const inOuterRing = dx === 0 || dx === 6 || dy === 0 || dy === 6;
      const inCore = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      const inBounds = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;

      setModule(m, x, y, inBounds && (inOuterRing || inCore));
    }
  }
}

/** The 5x5 alignment patterns, skipping those that would clash with finders. */
function placeAlignment(m: Matrix, version: number): void {
  const centers = ALIGNMENT_CENTERS[version - 1];

  for (const cy of centers) {
    for (const cx of centers) {
      // The three finder corners already own these positions.
      const nearFinder =
        (cx === 6 && cy === 6) ||
        (cx === 6 && cy === m.size - 7) ||
        (cx === m.size - 7 && cy === 6);
      if (nearFinder) continue;

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ring = Math.max(Math.abs(dx), Math.abs(dy));
          setModule(m, cx + dx, cy + dy, ring !== 1);
        }
      }
    }
  }
}

/** The alternating timing rows/columns at row 6 and column 6. */
function placeTiming(m: Matrix): void {
  for (let i = 8; i < m.size - 8; i++) {
    const dark = i % 2 === 0;
    setModule(m, i, 6, dark);
    setModule(m, 6, i, dark);
  }
}

/** Reserve the format-information cells (written after masking). */
function reserveFormat(m: Matrix): void {
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setModule(m, i, 8, false);
      setModule(m, 8, i, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setModule(m, m.size - 1 - i, 8, false);
    setModule(m, 8, m.size - 1 - i, false);
  }
  // The permanently dark module beside the lower-left finder.
  setModule(m, 8, m.size - 8, true);
}

/** BCH(18,6) version information, versions 7 and up only. */
function placeVersionInfo(m: Matrix, version: number): void {
  if (version < 7) return;

  let remainder = version;
  for (let i = 0; i < 12; i++) {
    remainder = (remainder << 1) ^ (remainder >>> 11 ? 0x1f25 : 0);
  }
  const bits = ((version << 12) | remainder) >>> 0;

  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    const a = Math.floor(i / 3);
    const b = (i % 3) + m.size - 11;
    setModule(m, a, b, dark);
    setModule(m, b, a, dark);
  }
}

/** The eight standard mask predicates (ISO/IEC 18004 Table 10). */
const MASKS: Array<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Write the data bitstream in the standard zig-zag order, applying the mask. */
function placeData(m: Matrix, bits: number[], mask: number): void {
  let bitIndex = 0;
  let upward = true;

  for (let right = m.size - 1; right >= 1; right -= 2) {
    // Column 6 is the vertical timing pattern and is skipped entirely.
    const col = right <= 6 ? right - 1 : right;

    for (let step = 0; step < m.size; step++) {
      const y = upward ? m.size - 1 - step : step;

      for (let offset = 0; offset < 2; offset++) {
        const x = col - offset;
        if (m.reserved[y * m.size + x]) continue;

        let dark = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        bitIndex++;

        if (MASKS[mask](x, y)) dark = !dark;
        m.modules[y * m.size + x] = dark ? 1 : 0;
      }
    }

    upward = !upward;
  }
}

/** Write the BCH(15,5) format information for a level/mask pair. */
function placeFormat(m: Matrix, mask: number): void {
  const data = (EC_LEVEL_Q << 3) | mask;

  let remainder = data;
  for (let i = 0; i < 10; i++) {
    remainder = (remainder << 1) ^ (remainder >>> 9 ? 0x537 : 0);
  }
  const bits = (((data << 10) | remainder) ^ 0x5412) >>> 0;

  for (let i = 0; i <= 5; i++) setModule(m, 8, i, ((bits >>> i) & 1) === 1);
  setModule(m, 8, 7, ((bits >>> 6) & 1) === 1);
  setModule(m, 8, 8, ((bits >>> 7) & 1) === 1);
  setModule(m, 7, 8, ((bits >>> 8) & 1) === 1);
  for (let i = 9; i < 15; i++) setModule(m, 14 - i, 8, ((bits >>> i) & 1) === 1);

  for (let i = 0; i < 8; i++) {
    setModule(m, m.size - 1 - i, 8, ((bits >>> i) & 1) === 1);
  }
  for (let i = 8; i < 15; i++) {
    setModule(m, 8, m.size - 15 + i, ((bits >>> i) & 1) === 1);
  }

  setModule(m, 8, m.size - 8, true);
}

/** Penalty score for a masked matrix (ISO/IEC 18004 §8.8.2). Lower is better. */
function penalty(m: Matrix): number {
  const { size, modules } = m;
  let score = 0;

  // Rule 1: runs of five or more same-coloured modules in a row or column.
  for (let i = 0; i < size; i++) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        const current = horizontal ? modules[i * size + j] : modules[j * size + i];
        const previous = horizontal ? modules[i * size + j - 1] : modules[(j - 1) * size + i];
        if (current === previous) {
          run++;
        } else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
  }

  // Rule 2: 2x2 blocks of one colour.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const a = modules[y * size + x];
      if (
        a === modules[y * size + x + 1] &&
        a === modules[(y + 1) * size + x] &&
        a === modules[(y + 1) * size + x + 1]
      ) {
        score += 3;
      }
    }
  }

  // Rule 3: the 1:1:3:1:1 finder-like pattern with four light modules either
  // side. This is what stops a mask producing something a scanner mistakes for
  // a finder pattern.
  const pattern = [1, 0, 1, 1, 1, 0, 1];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j <= size - 7; j++) {
      for (const horizontal of [true, false]) {
        let matches = true;
        for (let k = 0; k < 7; k++) {
          const value = horizontal ? modules[i * size + j + k] : modules[(j + k) * size + i];
          if (value !== pattern[k]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;

        const lightBefore = (start: number): boolean => {
          for (let k = start; k < start + 4; k++) {
            if (k < 0 || k >= size) continue;
            const value = horizontal ? modules[i * size + k] : modules[k * size + i];
            if (value !== 0) return false;
          }
          return true;
        };

        if (lightBefore(j - 4) || lightBefore(j + 7)) score += 40;
      }
    }
  }

  // Rule 4: deviation of the dark-module proportion from 50%.
  let dark = 0;
  for (let i = 0; i < modules.length; i++) dark += modules[i];
  const percent = (dark * 100) / modules.length;
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

/** Data codeword capacity at level Q for a version. */
function dataCapacity(version: number): number {
  const [total, ecPerBlock, group1, group2] = VERSION_SPEC_Q[version - 1];
  return total - ecPerBlock * (group1 + group2);
}

/**
 * Encode a payload as a QR module matrix.
 *
 * @param text the payload, e.g. `https://laces.run/c/{token}`
 * @return a square boolean grid, `true` = dark
 * @throws when the payload does not fit in versions 1-10 at level Q — see the
 *   module docstring on why truncating instead would be dangerous
 */
export function encodeQr(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));

  // Smallest version that fits. Byte mode uses an 8-bit length field below
  // version 10 and 16-bit at 10 and above.
  let version = 0;
  for (let candidate = 1; candidate <= 10; candidate++) {
    const lengthBits = candidate < 10 ? 8 : 16;
    const needed = 4 + lengthBits + bytes.length * 8;
    if (needed <= dataCapacity(candidate) * 8) {
      version = candidate;
      break;
    }
  }

  if (version === 0) {
    throw new Error(
      `QR payload of ${bytes.length} bytes exceeds version 10 at EC level Q. ` +
        "Refusing to truncate: a truncated QR scans successfully and resolves " +
        "to the wrong URL.",
    );
  }

  const [, ecPerBlock, group1, group2] = VERSION_SPEC_Q[version - 1];
  const capacity = dataCapacity(version);

  // --- Bitstream: mode indicator, length, payload, terminator, padding ---
  const bits: number[] = [];
  pushBits(bits, 0b0100, 4); // byte mode
  pushBits(bits, bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) pushBits(bits, byte, 8);

  const capacityBits = capacity * 8;
  for (let i = 0; i < 4 && bits.length < capacityBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    dataCodewords.push(byte);
  }
  // The standard's alternating pad bytes.
  const PAD = [0xec, 0x11];
  for (let i = 0; dataCodewords.length < capacity; i++) dataCodewords.push(PAD[i % 2]);

  // --- Split into blocks, compute EC, then interleave --------------------
  const totalBlocks = group1 + group2;
  const group1Size = Math.floor(capacity / totalBlocks);
  const blocks: Array<{ data: number[]; ec: number[] }> = [];

  let offset = 0;
  for (let i = 0; i < totalBlocks; i++) {
    const size = i < group1 ? group1Size : group1Size + 1;
    const data = dataCodewords.slice(offset, offset + size);
    offset += size;
    blocks.push({ data, ec: ecCodewords(data, ecPerBlock) });
  }

  const interleaved: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const block of blocks) {
      if (i < block.data.length) interleaved.push(block.data[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const block of blocks) interleaved.push(block.ec[i]);
  }

  const finalBits: number[] = [];
  for (const byte of interleaved) pushBits(finalBits, byte, 8);

  // --- Build the matrix, choose the mask by penalty score ----------------
  const size = version * 4 + 17;
  let best: Matrix | null = null;
  let bestScore = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const m = createMatrix(size);
    placeFinder(m, 0, 0);
    placeFinder(m, size - 7, 0);
    placeFinder(m, 0, size - 7);
    placeAlignment(m, version);
    placeTiming(m);
    reserveFormat(m);
    placeVersionInfo(m, version);
    placeData(m, finalBits, mask);
    placeFormat(m, mask);

    const score = penalty(m);
    if (score < bestScore) {
      bestScore = score;
      best = m;
    }
  }

  const chosen = best!;
  const grid: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) row.push(chosen.modules[y * size + x] === 1);
    grid.push(row);
  }
  return grid;
}

/**
 * Render a payload as an SVG QR code.
 *
 * ── WHY SVG, AND WHY IT MATTERS FOR PRINT ───────────────────────────────────
 *
 * The brief is explicit that a runner will print this page or screenshot it.
 * SVG is resolution-independent, so the same markup scans off a 96dpi
 * screenshot and a 600dpi laser print without a second asset. A PNG would have
 * to pick one.
 *
 * The QUIET ZONE is not decoration. The standard requires four modules of clear
 * space on every side, and scanners genuinely fail without it — this is the
 * single most common reason a hand-made QR does not scan. It is baked into the
 * viewBox rather than left to CSS margin, so it survives being copied into
 * another document.
 *
 * ── THE DOT STYLE, AND WHY IT IS SAFE ───────────────────────────────────────
 *
 * Matches `linkyoo_web`'s `qr-code-styling` config so the two products' codes
 * look like they came from the same company — `dotsOptions.type: 'rounded'`,
 * `cornersSquareOptions.type: 'dot'`, `cornersDotOptions.type: 'dot'`. Linkyoo
 * gets this from a client-side library; here it is drawn directly, so it stays
 * server-rendered and dependency-free.
 *
 *   FINDERS   the three 7x7 corner patterns become a circular RING plus a
 *             circular centre dot, via `fill-rule="evenodd"`.
 *   DATA      each module is a full-size square whose corners are rounded ONLY
 *             where it has no orthogonal neighbour, so runs of modules merge
 *             into one continuous soft-edged shape.
 *
 * ── "ROUNDED" IS NOT "CIRCLES", AND THE DIFFERENCE IS SCANNABILITY ──────────
 *
 * The obvious reading of `type: 'rounded'` is a circle per module. That was
 * tried here and IT DOES NOT SCAN: free-standing dots leave a gap at every
 * module boundary, the decoder loses the sampling grid, and 4 of 10 real
 * payloads failed to decode — while looking completely correct to the eye.
 * Keeping full module coverage and rounding only exposed corners is what makes
 * the style safe. Do not "simplify" this back to circles.
 *
 * THE ENCODER IS UNTOUCHED by any of this: same grid, same mask, same error
 * correction. Only the drawing changed.
 *
 * That safety is asserted, not assumed — `scripts/verify_qr.mjs` now decodes
 * THE RENDERED SVG through a real SVG rasteriser, not just the module grid. If
 * you restyle this further, run it; the failure mode is invisible by eye.
 *
 * The one thing NOT copied from Linkyoo is the centred logo. See below.
 *
 * Colours default to black on white rather than inheriting the brand ink
 * (#012303). Scanners threshold on luminance and maximum contrast is the whole
 * game; a near-black green would still scan, but this is the one element on the
 * page where the design system does not get a vote by default.
 *
 * `moduleColor` is the ONE deliberate exception, and it is gated rather than
 * free: `lib/order/poster_theme.ts`'s `qrModuleColor` only ever returns an
 * event's own theme colour when that colour clears a STRICTER 7:1 contrast
 * floor against the white plate — a full percentage point above this
 * function's own quiet-zone/white-background guarantee — and falls back to
 * ink otherwise. Scannability still outranks theming; this parameter exists
 * so an already-proven-safe colour can be threaded through, never so a
 * caller can paint the QR an arbitrary brand colour.
 *
 * ── NO LOGO IN THE MIDDLE, DELIBERATELY ─────────────────────────────────────
 *
 * There is no image overlay and none should be added. A centred logo works by
 * DAMAGING the code and relying on error correction to absorb it; combined
 * with a phone camera at an angle, poor light, or a cheap print, it is a
 * meaningful cut in the scan-success rate for purely decorative gain. The one
 * artefact a runner needs at the kit tent is not where to spend that budget.
 *
 * ── SHARED BEYOND `/o/{order_code}` ─────────────────────────────────────────
 *
 * This module lives under `lib/order/` because the ticket QR was its first
 * caller, but it is now also the race page's share QR
 * (`features/event_page/components/RaceShare.astro`). It is pure and has no order
 * concepts in it, so that is a naming artefact rather than a layering
 * problem — but `scripts/verify_qr.mjs` points at THIS path, so if it ever
 * moves, move that script's target in the same commit.
 *
 * @param text the payload to encode
 * @param moduleSize CSS pixels per module in the viewBox coordinate system
 * @param ariaLabel accessible name for the `<svg>`. Defaults to the ticket
 *   wording this module was written for; the race share block passes its own,
 *   since "Ticket QR code" on a race page describes the wrong thing entirely.
 * @param moduleColor CSS colour for the dark modules and finder patterns.
 *   Defaults to `#000000`. See the module docstring above — pass only an
 *   already contrast-checked value (`qrModuleColor`), never a raw theme hex.
 * @return an `<svg>` string, safe to inline
 */
export function qrSvg(
  text: string,
  moduleSize = 4,
  ariaLabel = "Ticket QR code",
  moduleColor = "#000000",
): string {
  // Defense in depth: `moduleColor` is interpolated directly into an SVG
  // attribute that callers `set:html`. Every real caller already passes
  // either the literal default or `qrModuleColor`'s own validated output, but
  // this function must never trust that unconditionally — a malformed value
  // (from a future caller, a bad refactor) falls back to black rather than
  // ever reaching the markup unescaped.
  const safeModuleColor = /^#[0-9a-f]{6}$/i.test(moduleColor) ? moduleColor : "#000000";

  const grid = encodeQr(text);
  const size = grid.length;
  const quiet = 4;
  const dimension = (size + quiet * 2) * moduleSize;

  /** Is (x, y) inside one of the three 7x7 finder patterns? */
  const inFinder = (x: number, y: number): boolean => {
    const near = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    return near(0, 0) || near(size - 7, 0) || near(0, size - 7);
  };

  const px = (n: number) => (n + quiet) * moduleSize;
  /** Trim trailing zeros so the path data stays small. */
  const num = (n: number) => +n.toFixed(2);

  // ── Data modules: rounded, and JOINED to their neighbours ─────────────────
  //
  // NOT free-standing circles. That was tried and it genuinely does not scan:
  // isolated dots leave gaps at every module boundary, the decoder loses the
  // sampling grid, and `verify_qr.mjs` failed on 4 of 10 real payloads. The
  // failure is silent to the eye — the code looks perfect.
  //
  // What `qr-code-styling`'s "rounded" actually does, and what this does: draw
  // each dark module as a full-size SQUARE, and round only the corners that
  // have no orthogonal neighbour. Runs of adjacent modules therefore merge
  // into one continuous shape with soft outer corners, preserving the solid
  // module areas a decoder needs while losing the hard pixel look.
  const dots: string[] = [];
  const radius = moduleSize * 0.5;
  const dark = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size && grid[y][x] && !inFinder(x, y);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!grid[y][x] || inFinder(x, y)) continue;
      const x0 = px(x);
      const y0 = px(y);
      const x1 = x0 + moduleSize;
      const y1 = y0 + moduleSize;

      // A corner is rounded only when BOTH of its edges are exposed.
      const up = dark(x, y - 1);
      const down = dark(x, y + 1);
      const left = dark(x - 1, y);
      const right = dark(x + 1, y);
      const tl = !up && !left ? radius : 0;
      const tr = !up && !right ? radius : 0;
      const br = !down && !right ? radius : 0;
      const bl = !down && !left ? radius : 0;
      const a = (r: number) => (r > 0 ? `a${num(r)} ${num(r)} 0 0 1 ` : "");

      dots.push(
        `M${num(x0 + tl)} ${num(y0)}` +
          `H${num(x1 - tr)}${tr ? a(tr) + `${num(tr)} ${num(tr)}` : ""}` +
          `V${num(y1 - br)}${br ? a(br) + `-${num(br)} ${num(br)}` : ""}` +
          `H${num(x0 + bl)}${bl ? a(bl) + `-${num(bl)} -${num(bl)}` : ""}` +
          `V${num(y0 + tl)}${tl ? a(tl) + `${num(tl)} -${num(tl)}` : ""}z`,
      );
    }
  }

  // ── Finder patterns: circular frame + circular centre ─────────────────────
  // Linkyoo's `cornersSquareOptions: 'dot'` and `cornersDotOptions: 'dot'`.
  // The 7x7 finder becomes a ring (outer circle minus inner) plus a solid
  // 3x3 centre dot. `fill-rule="evenodd"` is what punches the ring's hole,
  // and the inner arc is wound the SAME direction as the outer one so the
  // rule actually subtracts it.
  const finders: string[] = [];
  for (const [ox, oy] of [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ]) {
    const cx = num(px(ox) + moduleSize * 3.5);
    const cy = num(px(oy) + moduleSize * 3.5);
    const outer = moduleSize * 3.5;
    const inner = moduleSize * 2.5; // ring is one module thick, as in the spec
    const core = moduleSize * 1.5; // the 3x3 centre

    finders.push(
      `M${num(cx - outer)} ${cy}a${num(outer)} ${num(outer)} 0 1 0 ${num(outer * 2)} 0a${num(outer)} ${num(outer)} 0 1 0 -${num(outer * 2)} 0z`,
      `M${num(cx - inner)} ${cy}a${num(inner)} ${num(inner)} 0 1 0 ${num(inner * 2)} 0a${num(inner)} ${num(inner)} 0 1 0 -${num(inner * 2)} 0z`,
      `M${num(cx - core)} ${cy}a${num(core)} ${num(core)} 0 1 0 ${num(core * 2)} 0a${num(core)} ${num(core)} 0 1 0 -${num(core * 2)} 0z`,
    );
  }

  // The label is interpolated into an attribute in a string that callers
  // inject with `set:html`, so it is escaped here rather than trusted. Today
  // every caller passes a literal, but the escape is what keeps that from
  // being a requirement nobody wrote down.
  const safeLabel = ariaLabel
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // NOTE: no `shape-rendering="crispEdges"` any more. That hint snaps edges to
  // the pixel grid, which is right for axis-aligned squares and wrong for
  // circles — it renders them visibly polygonal. Curved marks want the default
  // antialiasing.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" ` +
    `width="100%" height="100%" role="img" ` +
    `aria-label="${safeLabel}">` +
    `<rect width="${dimension}" height="${dimension}" fill="#ffffff"/>` +
    `<path d="${dots.join("")}" fill="${safeModuleColor}"/>` +
    `<path d="${finders.join("")}" fill="${safeModuleColor}" fill-rule="evenodd"/>` +
    `</svg>`
  );
}
