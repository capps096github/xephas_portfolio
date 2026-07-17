// ============================================================================
// Navigation model
// ----------------------------------------------------------------------------
// The FloatingNav loops over these instead of hardcoding each <a>. Links point
// to on-page anchors for the landing page and routes for standalone pages.
// ============================================================================

export interface NavLink {
  label: string;
  href: string;
}

export interface NavCta {
  label: string;
  href: string;
  external?: boolean;
}

export const navLinks: NavLink[] = [
  { label: "Projects", href: "/#personal" },
  { label: "Community", href: "/community" },
  { label: "Tech Stack", href: "/#tech-stack" },
  { label: "Terms", href: "/terms" },
];

// Bold, prominent primary action (mirrors the old navbar's "Book a call").
export const navCta: NavCta = {
  label: "Book a call",
  href: "https://wa.me/256758294212",
  external: true,
};
