// waitlist.js — Firebase Firestore Waitlist Submissions
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA5ySkqiSTi19lHTSt8bhFzypfgqVtaSss",
    authDomain: "urbox-1.firebaseapp.com",
    projectId: "urbox-1",
    storageBucket: "urbox-1.firebasestorage.app",
    messagingSenderId: "897703212804",
    appId: "1:897703212804:web:37ad9da2d61544c2ce0251"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app, "default");

document.addEventListener("DOMContentLoaded", () => {
    // We might have multiple waitlist forms on the page (Hero, CTA section)
    // Setup observers using a mutation observer because the content is loaded dynamically via `main.js`'s fetch mechanism.

    const observer = new MutationObserver(() => {
        const heroForm = document.getElementById("hero-waitlist-form");
        const ctaForm = document.getElementById("cta-waitlist-form");

        if (heroForm && !heroForm.dataset.initialized) {
            heroForm.dataset.initialized = "true";
            setupForm(heroForm, "hero-waitlist-email", "hero-waitlist-submit", "hero-waitlist-msg", "hero");
        }

        if (ctaForm && !ctaForm.dataset.initialized) {
            ctaForm.dataset.initialized = "true";
            setupForm(ctaForm, "cta-waitlist-email", "cta-waitlist-submit", "cta-waitlist-msg", "cta");
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function setupForm(form, inputId, submitBtnId, msgId, source) {
        const emailInput = document.getElementById(inputId);
        const submitBtn = document.getElementById(submitBtnId);
        const msgEl = document.getElementById(msgId);

        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            if (!email) return;

            // Optional: Basic validation
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                msgEl.textContent = "Please enter a valid email.";
                msgEl.style.color = "#EF4444"; // red
                msgEl.style.display = "block";
                return;
            }

            // Disable form while submitting
            submitBtn.disabled = true;
            const originalText = submitBtn.innerHTML;
            submitBtn.textContent = "Joining...";

            try {
                await addDoc(collection(db, "waitlist"), {
                    email: email,
                    source: source,
                    createdAt: serverTimestamp()
                });

                // Success
                msgEl.textContent = "Thanks! You're on the list.";
                msgEl.style.color = "#10B981"; // green
                msgEl.style.display = "block";
                emailInput.value = ""; // Clear input

                // Hide message after a few seconds
                setTimeout(() => {
                    msgEl.style.display = "none";
                }, 5000);

            } catch (error) {
                console.error("Waitlist error:", error);

                // Show generalized error or permissions error
                if (error.code === 'permission-denied') {
                    msgEl.textContent = "Database permissions missing.";
                } else {
                    msgEl.textContent = "Something went wrong. Try again.";
                }
                msgEl.style.color = "#EF4444"; // red
                msgEl.style.display = "block";
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
});
