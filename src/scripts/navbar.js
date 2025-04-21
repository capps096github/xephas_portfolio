function setupNavbar() {
  console.log("Navbar script loaded");

  const navbar = document.getElementById("main-navbar");
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");
  const hamburgerIcon = mobileMenuButton?.querySelector(".icon-hamburger");
  const closeIcon = mobileMenuButton?.querySelector(".icon-close");
  const menuLinks = mobileMenu?.querySelectorAll("a");

  function updateNavbarStyle(scrollY) {
    if (!navbar) return;
    if (scrollY <= 10) {
      navbar.classList.remove(
        "bg-white/60", "rounded-full", "shadow-lg", "mt-4", "w-3/4",
        "backdrop-blur-xl", "-translate-y-full"
      );
      navbar.classList.add("bg-white", "backdrop-blur-sm", "w-full");
    } else {
      navbar.classList.remove("bg-white", "backdrop-blur-sm", "w-full");
      navbar.classList.add(
        "bg-white/60", "rounded-full", "shadow-lg", "mt-4", "w-3/4", "mx-auto",
        "backdrop-blur-xl"
      );
    }
  }

  window.addEventListener("scroll", () => updateNavbarStyle(window.scrollY));
  updateNavbarStyle(window.scrollY); // Initial call

  mobileMenuButton?.addEventListener("click", () => {
    mobileMenu?.classList.toggle("hidden");
    hamburgerIcon?.classList.toggle("hidden");
    closeIcon?.classList.toggle("hidden");
  });

  menuLinks?.forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu?.classList.add("hidden");
      hamburgerIcon?.classList.remove("hidden");
      closeIcon?.classList.add("hidden");
    });
  });

  console.log("Navbar script executed");
}

//  https://docs.astro.build/en/guides/view-transitions/#data-astro-rerun
function initNavbar() {
  document.addEventListener("astro:page-load", () => {
    console.log("Page loaded");
    setupNavbar();
  });
}

// Auto-initialize when imported
initNavbar();

// Export for explicit calls from Astro components if needed
export default initNavbar;