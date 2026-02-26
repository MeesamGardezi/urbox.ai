// ============================================================
// main.js — Section Loader + Scroll Reveal
// ============================================================

(async function () {
    // ── 1. Load all HTML partials ────────────────────────────
    const slots = document.querySelectorAll("[data-section]");

    await Promise.all(
        Array.from(slots).map(async (slot) => {
            const path = slot.getAttribute("data-section");
            try {
                const res = await fetch(path + "?v=" + new Date().getTime());
                if (!res.ok) throw new Error(`${res.status} ${path}`);
                const html = await res.text();
                slot.outerHTML = html;
            } catch (err) {
                console.error("Failed to load section:", err);
                slot.outerHTML = `<!-- Failed to load: ${path} -->`;
            }
        })
    );

    // ── 2. Initialize scroll reveal ──────────────────────────
    const revealEls = document.querySelectorAll(".reveal");
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add("visible");
                    revealObserver.unobserve(e.target);
                }
            });
        },
        { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));

    // ── 3. Load section scripts ──────────────────────────────
    const sectionScripts = [
        "sections/navbar/navbar.js",
        "sections/faq/faq.js",
        "sections/pricing/pricing.js",
        "sections/mockup/mock.js?v=" + new Date().getTime()
    ];

    for (const src of sectionScripts) {
        const script = document.createElement("script");
        script.src = src;
        script.defer = true;
        document.body.appendChild(script);
    }

    // Chat widget loaded as module (Firebase)
    const chatScript = document.createElement("script");
    chatScript.type = "module";
    chatScript.src = "sections/chat-widget/chat-widget.js";
    document.body.appendChild(chatScript);
})();