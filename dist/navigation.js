const navToggle = document.querySelector("#nav-toggle");
const navContent = document.querySelector("#header-content");
const mobileNav = window.matchMedia("(max-width: 760px)");

function setNavExpanded(expanded) {
  navToggle.setAttribute("aria-expanded", String(expanded));
  navToggle.setAttribute("aria-label", expanded ? "Close menu" : "Open menu");
}

navToggle.hidden = false;
navToggle.addEventListener("click", () => {
  setNavExpanded(navToggle.getAttribute("aria-expanded") === "false");
});
navContent.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!mobileNav.matches || !link) return;
  setNavExpanded(false);
  if (!link.hash) navToggle.focus();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || navToggle.getAttribute("aria-expanded") !== "true") return;
  setNavExpanded(false);
  navToggle.focus();
  event.preventDefault();
});
document.addEventListener("pointerdown", (event) => {
  if (navToggle.getAttribute("aria-expanded") === "true"
    && !navToggle.contains(event.target) && !navContent.contains(event.target)) {
    setNavExpanded(false);
  }
});
mobileNav.addEventListener("change", () => setNavExpanded(false));
