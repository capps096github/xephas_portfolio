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
  new Page("/", "Portfolio", ["/visit", ""]),
  new Page("/community", "Community", ["/talks"]),
  new Page("/hire-me", "Hire Me"),
  new Page("/contact", "Contact"),
  // new Page("/projects", "Projects"),
  new Page("https://terms.xephas.me/", "Terms ➛"),
];

export const termsPages = [
  new Page("https://xephas.me/", "Go To Portfolio ➛"),
  new Page("/terms", "Terms"),
  new Page("/terms/design", "Design Terms"),
  new Page("/terms/software", "Software Terms"),
];
