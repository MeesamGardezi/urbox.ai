// ============================================================
// contact.js — urbox.ai Contact Page
// Saves form submissions to Firestore → contact_requests
// ============================================================

import { initializeApp }
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Firebase ──────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig, "contact");
const db = getFirestore(app, "default");

// ── DOM refs ──────────────────────────────────────────────────
const form = document.getElementById("contact-form");
const formSuccess = document.getElementById("form-success");
const btnSubmit = document.getElementById("btn-submit");
const btnSubmitLabel = document.getElementById("btn-submit-label");
const btnSubmitArrow = document.getElementById("btn-submit-arrow");
const btnSubmitSpinner = document.getElementById("btn-submit-spinner");
const formErrorBanner = document.getElementById("form-error-banner");
const formErrorMsg = document.getElementById("form-error-msg");
const btnSendAnother = document.getElementById("btn-send-another");

// Fields
const nameInput = document.getElementById("contact-name");
const emailInput = document.getElementById("contact-email");
const companyInput = document.getElementById("contact-company");
const subjectSel = document.getElementById("contact-subject");
const messageInput = document.getElementById("contact-message");

// Error spans
const errName = document.getElementById("err-name");
const errEmail = document.getElementById("err-email");
const errSubject = document.getElementById("err-subject");
const errMessage = document.getElementById("err-message");

// ── Validation ────────────────────────────────────────────────
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function clearErrors() {
    [errName, errEmail, errSubject, errMessage].forEach(e => e.textContent = "");
    [nameInput, emailInput, subjectSel, messageInput].forEach(el => el.classList.remove("error"));
    formErrorBanner.classList.add("hidden");
}

function setError(input, spanEl, msg) {
    spanEl.textContent = msg;
    input.classList.add("error");
    return false;
}

function validate() {
    let valid = true;

    if (!nameInput.value.trim()) {
        setError(nameInput, errName, "Please enter your name.");
        valid = false;
    }
    if (!emailInput.value.trim()) {
        setError(emailInput, errEmail, "Please enter your email address.");
        valid = false;
    } else if (!validateEmail(emailInput.value)) {
        setError(emailInput, errEmail, "Please enter a valid email address.");
        valid = false;
    }
    if (!subjectSel.value) {
        setError(subjectSel, errSubject, "Please select a topic.");
        valid = false;
    }
    if (!messageInput.value.trim()) {
        setError(messageInput, errMessage, "Please write a message.");
        valid = false;
    } else if (messageInput.value.trim().length < 10) {
        setError(messageInput, errMessage, "Message must be at least 10 characters.");
        valid = false;
    }

    return valid;
}

// ── Remove error styling on input ────────────────────────────
[nameInput, emailInput, subjectSel, messageInput].forEach(el => {
    el.addEventListener("input", () => {
        el.classList.remove("error");
    });
});

// ── Submit ────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    if (!validate()) return;

    // Loading state
    btnSubmit.disabled = true;
    btnSubmitLabel.textContent = "Sending…";
    btnSubmitArrow.classList.add("hidden");
    btnSubmitSpinner.classList.remove("hidden");

    try {
        await addDoc(collection(db, "contact_requests"), {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            company: companyInput.value.trim() || null,
            subject: subjectSel.value,
            message: messageInput.value.trim(),
            status: "new",                       // new | read | replied
            createdAt: serverTimestamp(),
            page: window.location.pathname,
        });

        // Show success
        form.classList.add("hidden");
        formSuccess.classList.add("active");

    } catch (err) {
        console.error("[contact] submit error:", err);
        formErrorMsg.textContent = "Something went wrong on our end. Please try again or email us directly.";
        formErrorBanner.classList.remove("hidden");
    } finally {
        btnSubmit.disabled = false;
        btnSubmitLabel.textContent = "Send message";
        btnSubmitArrow.classList.remove("hidden");
        btnSubmitSpinner.classList.add("hidden");
    }
});

// ── Send another ─────────────────────────────────────────────
btnSendAnother.addEventListener("click", () => {
    form.reset();
    formSuccess.classList.remove("active");
    form.classList.remove("hidden");
    nameInput.focus();
});
