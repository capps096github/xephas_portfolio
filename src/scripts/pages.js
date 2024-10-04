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
  new Page("/projects", "Projects"),
  new Page("/community", "Community"),
  new Page("/cv", "CV (Resume)"),
  new Page("/hire-me", "Hire Me"),
  new Page("/contact", "Contact"),
  new Page("/terms", "Terms ➛"),
];

export const termsPages = [
  new Page("https://xephas.me/", "Go To Portfolio ➛"),
  new Page("/terms", "Terms"),
  new Page("/terms/design", "Design Terms"),
  new Page("/terms/software", "Software Terms"),
  new Page("/projects", "Projects"),
];
