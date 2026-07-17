// ============================================================================
// Tech stack model
// ----------------------------------------------------------------------------
// Rendered as a grouped, looped grid on the landing page. Sourced from the CV
// (Programming Languages, Mobile/Web/Backend frameworks, CI/CD, Databases,
// diagramming, design tools, and Business Analysis skills) plus the
// AI-assisted tooling Cephas builds with today.
// ============================================================================

export interface TechGroup {
  /** Group heading, e.g. "Languages" */
  title: string;
  /** Individual technologies in this group */
  items: string[];
}

export const techStack: TechGroup[] = [
  {
    title: "AI Tooling",
    items: ["Claude Code", "Codex", "GitHub Copilot"],
  },
  {
    title: "Languages",
    items: ["Dart", "TypeScript", "JavaScript", "Python", "Java", "Kotlin", "PHP", "C", "C++"],
  },
  {
    title: "Mobile & Web",
    items: ["Flutter", "Astro", "Tailwind CSS", "Django"],
  },
  {
    title: "Backend & APIs",
    items: ["Express.js", "Node.js", "Firebase", "Google Cloud Functions"],
  },
  {
    title: "Data & Infra",
    items: ["Firestore (NoSQL)", "MySQL", "GitHub Actions", "Netlify", "Google Cloud"],
  },
  {
    title: "Embedded",
    items: ["Arduino"],
  },
  {
    title: "Diagramming",
    items: ["Mermaid JS", "Sequence Diagrams", "ER Models", "Data Flow Diagrams"],
  },
  {
    title: "Design",
    items: ["Figma", "Adobe Illustrator", "Canva"],
  },
  {
    title: "Business Analysis",
    items: [
      "Stakeholder Management",
      "User Stories",
      "Process Mapping",
      "API Analysis",
      "Wireframing",
      "UAT Testing",
      "Agile / Scrum",
      "Jira",
      "Confluence",
      "Business Documentation",
    ],
  },
];
