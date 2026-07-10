// ============================================================================
// Landing-page project model
// ----------------------------------------------------------------------------
// A single interface drives BOTH the Personal and Client project sections on
// the landing page. Components loop over these arrays instead of hardcoding
// markup per project — add a project here and it renders everywhere.
// ============================================================================

export interface ProjectMeta {
  /** Small caps label, e.g. "Client" or "Duration" */
  label: string;
  /** The value; may contain simple inline markup handled by the component */
  value: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface LandingProject {
  /** Display name / headline */
  name: string;
  /** Reference code shown top-right, e.g. "P–01 · SINCE 2019" or "C–01" */
  code: string;
  /** One-paragraph description */
  description: string;
  /** Path (relative to /public) to the project screenshot/art */
  image: string;
  /** Alt text for the image */
  imageAlt: string;
  /** When true the image renders on the left, text on the right */
  imageLeft?: boolean;
  /** Personal cards: single caption line under the description */
  caption?: string;
  /** Client cards: structured meta grid (Client / Duration / Type / Scope) */
  meta?: ProjectMeta[];
  /** Optional external link (label shown with a trailing arrow-up-right icon) */
  link?: ProjectLink;
}

// ---------------------------------------------------------------------------
// 01 — Personal Projects
// Live platforms Cephas designs, builds and maintains himself.
// ---------------------------------------------------------------------------
export const personalProjects: LandingProject[] = [
  {
    name: "Calcut",
    code: "P–01 · SINCE 2020",
    description:
      "A free, fully-fledged cross-platform app trusted by 7,000+ students in Uganda to calculate their cut-off points (academic weights) in split seconds and discover the university courses they qualify for — based on their A'level subject combinations.",
    image: "/images/projects/calcut.png",
    imageAlt: "Calcut app — cut-off points and course suggestions screens",
    imageLeft: false,
    caption: "7,000+ students · Android, iOS & Web",
    link: { label: "calcut.app", href: "https://calcut.app" },
  },
  {
    name: "Linkyoo",
    code: "P–02 · SINCE 2024",
    description:
      "One link + QR code for everything you sell. Businesses build a page in minutes to showcase products and menus, receive orders and get paid — then share a single link-in-bio or QR across WhatsApp, Instagram, TikTok and more, turning social media into a real sales channel.",
    image: "/images/projects/linkyoo.png",
    imageAlt: "Linkyoo app — shareable business profile and menu",
    imageLeft: true,
    caption: "Live · used by businesses & creators · Android, iOS & Web",
    link: { label: "linkyoo.me", href: "https://linkyoo.me" },
  },
];

// ---------------------------------------------------------------------------
// 02 — Client Projects
// Delivered under formal contracts; clients available as referees.
// ---------------------------------------------------------------------------
export const clientProjects: LandingProject[] = [
  {
    name: "GRM — Grievance Redress Mechanism",
    code: "C–01",
    description:
      "A secure channel for citizens and project beneficiaries to submit grievances, complaints and corruption reports — with structured grievance management, status tracking and administrative oversight for timely resolution and transparency.",
    image: "/images/projects/grm.png",
    imageAlt: "GRM Anti-Corruption app across desktop, tablet and mobile",
    imageLeft: false,
    meta: [
      {
        label: "Client",
        value:
          "Government of Sierra Leone (sub-contracted)",
      },
      { label: "Duration", value: "Aug 2024 – Jan 2025 (6 months)" },
      { label: "Type", value: "Accountability & reporting app (Android, iOS, Windows)" },
      {
        label: "Scope",
        value:
          "Secure auth · grievance submission & tracking · dashboards & reporting · offline access · docs & training",
      },
    ],
  },
  {
    name: "CHW Training App",
    code: "C–02",
    description:
      "A cross-platform web and mobile app supporting the training of Community Health Workers — structured learning content, offline access, progress tracking, and administrative tools for monitoring performance and managing programs.",
    image: "/images/projects/chw.png",
    imageAlt: "CHW training app — learning content across devices",
    imageLeft: true,
    meta: [
      { label: "Client", value: "GHE Consulting, Kampala" },
      { label: "Duration", value: "Oct 2024 – Feb 2025 (5 months)" },
      { label: "Type", value: "Training & learning app (Web, Android & iOS)" },
      {
        label: "Scope",
        value:
          "Learning content · offline access · progress tracking · admin CMS · docs & training",
      },
    ],
  },
  {
    name: "WalletSense AI",
    code: "C–03",
    description:
      "An AI-powered fintech app that learns user spending patterns to suggest the most effective ways to save — helping people achieve more from their finances. First working version live on Apple's TestFlight.",
    image: "/images/projects/walletsense.png",
    imageAlt: "WalletSense AI fintech app screens",
    imageLeft: false,
    meta: [
      { label: "Client", value: "Emva Group (emvagroup.com)" },
      { label: "Duration", value: "2026" },
      { label: "Type", value: "AI fintech app (Web, Android & iOS)" },
      {
        label: "Scope",
        value:
          "Architecture · core screens · MVP build · TestFlight iterations · polish & delivery",
      },
    ],
  },
];
