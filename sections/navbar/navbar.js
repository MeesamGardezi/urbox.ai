// ============================================================
// navbar.js — Border on scroll
// ============================================================
(function () {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;

    window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 20);
    }, { passive: true });
})();