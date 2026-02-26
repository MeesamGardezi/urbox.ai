// ============================================================
// faq.js — Accordion toggle
// ============================================================
(function () {
    document.addEventListener("click", (e) => {
        const trigger = e.target.closest("[data-faq-toggle]");
        if (!trigger) return;

        const item = trigger.closest(".faq-item");
        if (!item) return;

        const isOpen = item.classList.contains("open");

        // Close all open items
        document.querySelectorAll(".faq-item.open").forEach((i) => {
            i.classList.remove("open");
        });

        // Open the clicked one (if it wasn't already open)
        if (!isOpen) {
            item.classList.add("open");
        }
    });
})();