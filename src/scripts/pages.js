// Page Class
class Page {
  constructor(href, label, otherUrls = []) {
    this.href = href;
    this.label = label;
    this.otherUrls = otherUrls.concat(href);
  }

  get title() {
    return `${this.label} Menu`;
  }
}
// define data types js constructors
// check if list contains a given item
// add script tags to astro pages
// PWAs in astro
export const pages = [
  new Page("/", "Portfolio", ["/food", ""]),
  new Page("/contact", "Contact"),
  new Page("/certificate", "Certificate(S)"),
  new Page("/projects", "Projects"),
  new Page("/tech-stack", "Tech-stack"),
  new Page("/talks-events", "Talks & Trainings"),
  
];
