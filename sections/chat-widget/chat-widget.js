// ============================================================
// chat-widget.js — Firebase Firestore Live Chat
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, collection, addDoc,
    query, orderBy, limit, onSnapshot,
    serverTimestamp, getDocs, setDoc, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Firebase config ──────────────────────────────────────────
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "default");

// ── Constants ────────────────────────────────────────────────
const COLLECTION = "landing_chat_messages";
const MAX_MESSAGES = 100;
const COLORS = [
    "#2B8EF0", "#10B981", "#F59E0B", "#8B5CF6",
    "#EF4444", "#06B6D4", "#EC4899", "#84CC16",
];

// ============================================================
// SESSION USER ID
// ============================================================
function generateUserId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let id = "user_";
    for (let i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

let SESSION_USER_ID = sessionStorage.getItem("urbox_chat_uid");
if (!SESSION_USER_ID) {
    SESSION_USER_ID = generateUserId();
    sessionStorage.setItem("urbox_chat_uid", SESSION_USER_ID);
}

function colorForUser(uid) {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
}

// ============================================================
// CHAT WIDGET
// ============================================================
const chatToggle = document.getElementById("chat-toggle");
const chatPanel = document.getElementById("chat-panel");
const chatIconOpen = document.getElementById("chat-icon-open");
const chatIconClose = document.getElementById("chat-icon-close");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const unreadBadge = document.getElementById("chat-unread-badge");
const onlineCount = document.getElementById("online-count");
const userIdDisplay = document.getElementById("chat-user-id-display");

let chatOpen = false;
let unreadCount = 0;
let initialized = false;
let unsubscribe = null;
let lastRenderedUid = null;

// Show user ID in chat header
if (userIdDisplay) userIdDisplay.textContent = SESSION_USER_ID;

// ── Toggle open/close ────────────────────────────────────────
function openChat() {
    chatOpen = true;
    chatPanel.classList.add("open");
    chatIconOpen.style.display = "none";
    chatIconClose.style.display = "block";
    unreadCount = 0;
    unreadBadge.textContent = "";
    unreadBadge.classList.remove("visible");
    scrollToBottom();
    if (!unsubscribe) startListening();
}

// ── Presence System ──────────────────────────────────────────
let userIpAddress = null;

async function fetchUserIp() {
    if (userIpAddress) return userIpAddress;
    try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        userIpAddress = data.ip;
        return userIpAddress;
    } catch (e) {
        console.warn("Could not fetch IP", e);
        return "Unknown IP";
    }
}

async function updatePresence() {
    try {
        const ip = await fetchUserIp();
        setDoc(doc(db, "landing_chat_presence", SESSION_USER_ID), {
            lastActive: Date.now(),
            ipAddress: ip
        }, { merge: true });
    } catch (e) { console.warn(e); }
}

updatePresence();
setInterval(updatePresence, 20000);

window.addEventListener("pagehide", () => {
    deleteDoc(doc(db, "landing_chat_presence", SESSION_USER_ID)).catch(() => { });
});

let presenceSnapshot = null;
function renderPresenceCount() {
    if (!presenceSnapshot) return;
    const now = Date.now();
    let count = 0;
    presenceSnapshot.forEach((d) => {
        const data = d.data();
        if (data.lastActive && (now - data.lastActive) < 60000) {
            count++;
        }
    });
    count = Math.max(1, count);

    onlineCount.textContent = `${count} online`;

    let extBadge = document.getElementById("chat-online-badge");
    if (!extBadge) {
        extBadge = document.createElement("span");
        extBadge.id = "chat-online-badge";
        chatToggle.appendChild(extBadge);
    }
    extBadge.textContent = count;
}

function startPresenceListener() {
    onSnapshot(collection(db, "landing_chat_presence"), (snapshot) => {
        presenceSnapshot = snapshot;
        renderPresenceCount();
    });
    setInterval(renderPresenceCount, 10000);
}

// ── Start listening immediately for the online badge ─────────
startListening();
startPresenceListener();

function closeChat() {
    chatOpen = false;
    chatPanel.classList.remove("open");
    chatIconOpen.style.display = "block";
    chatIconClose.style.display = "none";
}

chatToggle.addEventListener("click", () => {
    chatOpen ? closeChat() : openChat();
});

// ── Scroll helpers ───────────────────────────────────────────
function scrollToBottom(force = false) {
    if (!chatOpen && !force) return;
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function isNearBottom() {
    const threshold = 80;
    return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < threshold;
}

// ── Format timestamp ─────────────────────────────────────────
function formatTime(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Render a single message ──────────────────────────────────
function renderMessage(data, id) {
    if (document.querySelector(`[data-msg-id="${id}"]`)) return;

    const isOwn = data.uid === SESSION_USER_ID;
    const isSystem = data.type === "system";
    const isContinuation = !isSystem && data.uid === lastRenderedUid;

    const wrapper = document.createElement("div");
    wrapper.className = `chat-msg ${isOwn ? "own" : isSystem ? "system" : "other"}${isContinuation ? " continuation" : ""}`;
    wrapper.dataset.msgId = id;

    if (isSystem) {
        wrapper.innerHTML = `<div class="chat-bubble">${escapeHtml(data.text)}</div>`;
    } else {
        const color = colorForUser(data.uid);
        const metaHtml = isContinuation ? "" : `
      <div class="chat-msg-meta" style="color:${isOwn ? "var(--primary)" : color}">
        ${isOwn ? "You" : escapeHtml(data.uid)}
      </div>`;

        wrapper.innerHTML = `
      ${metaHtml}
      <div class="chat-bubble" ${isOwn ? "" : `style="border-color:${color}22"`}>
        ${escapeHtml(data.text)}
      </div>
      <div class="chat-msg-time">${formatTime(data.createdAt)}</div>
    `;
    }

    if (!isSystem) lastRenderedUid = data.uid;
    chatMessages.appendChild(wrapper);
}

// ── Escape HTML ──────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ── Start Firestore listener ─────────────────────────────────
function startListening() {
    const q = query(
        collection(db, COLLECTION),
        orderBy("createdAt", "asc"),
        limit(MAX_MESSAGES)
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                const id = change.doc.id;

                renderMessage(data, id);

                if (initialized && !chatOpen && data.uid !== SESSION_USER_ID) {
                    unreadCount++;
                    unreadBadge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
                    unreadBadge.classList.add("visible");
                }

                const nearBottom = isNearBottom();
                if (chatOpen && (nearBottom || data.uid === SESSION_USER_ID)) {
                    scrollToBottom();
                }
            }
        });

        if (!initialized) {
            initialized = true;
            scrollToBottom(true);
        }
    });
}

// ── Send a message ───────────────────────────────────────────
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = "";
    chatInput.focus();

    try {
        await addDoc(collection(db, COLLECTION), {
            uid: SESSION_USER_ID,
            text: text,
            createdAt: serverTimestamp(),
            type: "message",
        });

        pruneMessages();
    } catch (err) {
        console.error("Failed to send message:", err);
        chatInput.value = text;
    }
}

// ── Prune collection to MAX_MESSAGES ─────────────────────────
async function pruneMessages() {
    try {
        const q = query(collection(db, COLLECTION), orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        if (snap.size <= MAX_MESSAGES) return;

        const excess = snap.size - MAX_MESSAGES;
        const toDelete = snap.docs.slice(0, excess);

        const { deleteDoc, doc } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );

        for (const d of toDelete) {
            await deleteDoc(doc(db, COLLECTION, d.id));
        }
    } catch (err) {
        console.warn("Prune skipped:", err.message);
    }
}

// ── Event listeners ──────────────────────────────────────────
chatSend.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});