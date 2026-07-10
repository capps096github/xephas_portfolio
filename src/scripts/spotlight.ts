/**
 * Hover spotlight pattern.
 *
 * Wires up every `.spotlight` section so the decorative pattern layer
 * (styled in global.css) is revealed through a soft circular mask that
 * follows the cursor. We only write CSS custom properties here; all the
 * visual work lives in CSS.
 *
 * - --spot-x / --spot-y : mask centre, in px relative to the section
 * - --spot-o            : layer opacity (fades the whole thing in/out)
 *
 * Pointer moves are throttled to one write per animation frame so we never
 * thrash layout, and the whole thing is skipped for coarse pointers (touch)
 * and users who prefer reduced motion.
 */

function initSpotlight(): void {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (coarse || reduced) return;

  const sections = document.querySelectorAll<HTMLElement>(".spotlight");

  sections.forEach((section) => {
    let frame = 0;
    let px = 0;
    let py = 0;

    const write = () => {
      frame = 0;
      section.style.setProperty("--spot-x", `${px}px`);
      section.style.setProperty("--spot-y", `${py}px`);
    };

    section.addEventListener("pointermove", (event) => {
      const rect = section.getBoundingClientRect();
      px = event.clientX - rect.left;
      py = event.clientY - rect.top;
      if (!frame) frame = requestAnimationFrame(write);
    });

    section.addEventListener("pointerenter", () => {
      section.style.setProperty("--spot-o", "1");
    });

    section.addEventListener("pointerleave", () => {
      section.style.setProperty("--spot-o", "0");
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSpotlight);
} else {
  initSpotlight();
}

export {};
