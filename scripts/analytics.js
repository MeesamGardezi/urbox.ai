// ============================================================
// analytics.js — Site-wide Firebase Analytics Tracker
// ============================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Reuse the default Firebase app if already initialized by chat widget
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app, "default");

// ── Visitor & Session IDs ─────────────────────────────────────
function getId(key, prefix) {
    let id = (key === "s" ? sessionStorage : localStorage).getItem("urbox_" + key);
    if (!id) {
        id = prefix + Math.random().toString(36).substr(2, 8) + "_" + Date.now();
        (key === "s" ? sessionStorage : localStorage).setItem("urbox_" + key, id);
    }
    return id;
}
const visitorId = getId("vid", "v");
const sessionId = getId("s", "s");

// ── Referrer Categorization ───────────────────────────────────
function categorizeReferrer(ref) {
    if (!ref || ref.includes(location.hostname)) return "Direct";
    if (/google|bing|yahoo|duckduckgo|yandex/i.test(ref)) return "Search";
    if (/twitter|x\.com|facebook|linkedin|instagram|reddit/i.test(ref)) return "Social";
    return "Referral";
}

// ── Device Detection ──────────────────────────────────────────
function detectDevice() {
    const ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua)) return "Tablet";
    if (/Mobi|Android/i.test(ua)) return "Mobile";
    return "Desktop";
}

// ── Track Page View ───────────────────────────────────────────
const startTime = Date.now();

async function trackPageView() {
    try {
        const docRef = await addDoc(collection(db, "site_analytics"), {
            page: window.location.pathname + window.location.search,
            title: document.title,
            referrer: categorizeReferrer(document.referrer),
            referrerRaw: document.referrer || "",
            device: detectDevice(),
            visitorId,
            sessionId,
            timestamp: serverTimestamp(),
            duration: null,
        });

        // Write session duration on page leave
        window.addEventListener("pagehide", async () => {
            const duration = Math.round((Date.now() - startTime) / 1000);
            try {
                await updateDoc(doc(db, "site_analytics", docRef.id), { duration });
            } catch (_) { /* best-effort */ }
        }, { once: true });

    } catch (err) {
        console.warn("[analytics] Could not write event:", err.message);
    }
}

// Delay slightly so page title is fully set
setTimeout(trackPageView, 300);
