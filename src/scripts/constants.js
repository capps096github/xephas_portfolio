
export const baseUrl = "https://xephasme.web.app/";
// export const baseUrl = "https://xephas.me/";
export const siteManifest = baseUrl + "manifest.json";

// OG / social share cover image (actual file is 1920x1080)
export const coverImage = baseUrl + "images/xephas-og.png?v=" + Date.now();
export const coverImageWidth = "1920";
export const coverImageHeight = "1080";
export const coverImageAlt =
  "X3PH★S — Mugisa Brian Cephas, Software Engineer, Business Analyst and UI/UX Designer";

// title
export const title = "Mugisa Brian (Cephas) | A Designer and Developer of Experiences";

// code name
export const codeName = "Mugisa Brian ( X3PH★S )";

export const description =
  "Mugisa Brian (Cephas), aka Xephas — Ugandan software engineer, business analyst and UI/UX designer with 5+ years building secure, cross-platform Flutter apps for institutions worldwide.";


//   these are the keywords that will be used to search engine optimization for the website
export const keywords = "Mugisa Brian Cephas, Xephas, Cephas, Mugisa Brian, Mugisa, Brian, Software Engineer, Flutter Developer, UI/UX Designer, Graphics Designer, Web Developer, Mobile App Developer, Cross-Platform App Developer, Android Developer, iOS Developer, Web Designer, Web Developer, Mobile App Designer, Mobile App Developer, Business Analyst, Business Analysis, Requirements Gathering, Process Mapping, Mermaid JS";

// ---------------------------------------------------------------------------
// Structured data (JSON-LD) — consumed by Head.astro for AEO/GEO.
// sameAs mirrors src/scripts/social.ts; knowsAbout mirrors src/scripts/tech_stack.ts.
// Kept as plain objects (not JSON.stringify'd) so Head.astro controls serialization.
// ---------------------------------------------------------------------------
export const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Mugisa Brian Cephas",
  alternateName: ["Xephas", "X3PH★S", "Cephas"],
  url: baseUrl,
  image: coverImage,
  jobTitle: "Software Engineer, Business Analyst & UI/UX Designer",
  description:
    "Ugandan software engineer specializing in cross-platform app development with Flutter, and UI/UX & graphics designer with 5+ years of experience, plus 2 years as a business analyst on mobile money apps.",
  email: "mailto:hello@xephas.me",
  telephone: "+256758294212",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Kampala",
    addressRegion: "Central Region",
    addressCountry: "UG",
  },
  nationality: "Ugandan",
  sameAs: [
    "https://github.com/capps096github",
    "https://www.linkedin.com/in/xephasofficial/",
    "https://twitter.com/xephas_official",
    "https://www.youtube.com/channel/UC6RbQ3pYu1myT41ZX052hIA",
    "https://www.instagram.com/xephas_official/",
    "https://stackoverflow.com/users/19142356/mugisa-brian-cephas",
    "https://medium.com/@xephas_official",
    "https://play.google.com/store/apps/dev?id=8238184494150117614",
  ],
  knowsAbout: [
    "Flutter",
    "Dart",
    "Cross-Platform App Development",
    "Android Development",
    "iOS Development",
    "TypeScript",
    "JavaScript",
    "Astro",
    "Tailwind CSS",
    "Node.js",
    "Firebase",
    "UI/UX Design",
    "Graphics Design",
    "Figma",
    "Business Analysis",
    "Requirements Gathering",
    "Process Mapping",
    "User Stories",
    "UAT Testing",
    "Agile/Scrum",
    "Mermaid JS",
  ],
  worksFor: {
    "@type": "Organization",
    name: "Xephas",
    url: baseUrl,
  },
  founderOf: {
    "@type": "Organization",
    name: "Apta Innovations Limited",
  },
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: title,
  alternateName: "Xephas",
  url: baseUrl,
  description,
  author: {
    "@type": "Person",
    name: "Mugisa Brian Cephas",
  },
  inLanguage: "en",
};

//   year
export const year = new Date().getFullYear();

// Astro makes component-level data available through the `` prefix.
// developer
export const developer = {
  author: codeName,
  copyright: `${codeName}`,
  copyrightYear: `© ${year}`,
  handle: "@xephas_official",
  openSourced: "Open Sourced on GitHub",
  repoUrl:"https://github.com/capps096github/xephas_portfolio",
  footerDev: "Brian Cephas' Signature Touch",
  footerCollaborator: "Jovic Biralo",
  footerUrl: "https://github.com/capps096github",
  footerCollaboratorUrl: "https://biralo256.github.io",
};

// name of my CV, it keeps changing though
export const cvFileName= "MUGISA BRIAN (CEPHAS) - CV as of 11th June 2024.pdf";