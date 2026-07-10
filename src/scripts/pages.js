// Page Class
class Page {
  constructor(href, label, otherUrls = []) {
    this.href = href;
    this.label = label;
    this.otherUrls = otherUrls.concat(href);
  }

}
// define data types js constructors
// check if list contains a given item
// add script tags to astro pages
// PWAs in astro
export const pages = [
  new Page("/", "Bio", ["/visit", ""]),
  new Page("/#personal", "Personal"),
  new Page("/#clients", "Client Work"),
  new Page("/#tech-stack", "Tech Stack"),
  new Page("/community", "Community"),
  new Page("/sch-projects", "School Projects"),
  new Page("/terms", "Terms"),
];

export const termsPages = [
  new Page("/terms", "Terms"),
  new Page("/terms/design", "Design Terms"),
  new Page("/terms/software", "Software Terms"),
];
