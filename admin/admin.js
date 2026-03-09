// ============================================================
// admin.js — urbox.ai Admin Dashboard (Analytics + Blog CMS)
// ============================================================

import { initializeApp }
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection, query, orderBy, limit, where,
    onSnapshot, getDocs, addDoc, updateDoc, deleteDoc,
    doc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Firebase ──────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyA5ySkqiSTi19lHTSt8bhFzypfgqVtaSss",
    authDomain: "urbox-1.firebaseapp.com",
    projectId: "urbox-1",
    storageBucket: "urbox-1.firebasestorage.app",
    messagingSenderId: "897703212804",
    appId: "1:897703212804:web:37ad9da2d61544c2ce0251",
};
const app = initializeApp(firebaseConfig, "admin");
const db = getFirestore(app, "default");

// ── Config ───────────────────────────────────────────────────
const ADMIN_PASSWORD = "urbox2026";
const SESSION_KEY = "urbox_admin_auth";

// ── DOM refs ─────────────────────────────────────────────────
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const topbarDate = document.getElementById("topbar-date");

// ─── Stat cards
const statTotalViews = document.getElementById("stat-total-views");
const statUniqueVisitors = document.getElementById("stat-unique-visitors");
const statToday = document.getElementById("stat-today");
const statAvgDuration = document.getElementById("stat-avg-duration");
const statTodayDate = document.getElementById("stat-today-date");

// ─── Tables
const liveFeedBody = document.getElementById("live-feed-body");
const topPagesBody = document.getElementById("top-pages-body");

// ─── Waitlist
const waitlistListBody = document.getElementById("waitlist-list-body");
const waitlistCountLabel = document.getElementById("waitlist-count-label");
const waitlistTabBadge = document.getElementById("waitlist-tab-badge");

// ─── History
const historyListBody = document.getElementById("history-list-body");
const historyCountLabel = document.getElementById("history-count-label");
const historyTabBadge = document.getElementById("history-tab-badge");

// ─── Mailbox
const mailboxList = document.getElementById("mailbox-list");
const mailReaderEmpty = document.getElementById("mail-reader-empty");
const mailReaderContent = document.getElementById("mail-reader-content");
const readMailSubject = document.getElementById("read-mail-subject");
const readMailFrom = document.getElementById("read-mail-from");
const readMailTo = document.getElementById("read-mail-to");
const readMailDate = document.getElementById("read-mail-date");
const readMailBody = document.getElementById("read-mail-body");
const btnRefreshMail = document.getElementById("btn-refresh-mail");
const btnComposeMail = document.getElementById("btn-compose-mail");
const btnReplyMail = document.getElementById("btn-reply-mail");

// ─── Compose Drawer
const composeOverlay = document.getElementById("compose-overlay");
const composeDrawer = document.getElementById("compose-drawer");
const btnCloseCompose = document.getElementById("btn-close-compose");
const btnCancelCompose = document.getElementById("btn-cancel-compose");
const btnSendMail = document.getElementById("btn-send-mail");
const btnSendLabel = document.getElementById("btn-send-label");
const composeTo = document.getElementById("compose-to");
const composeSubject = document.getElementById("compose-subject");
const composeBody = document.getElementById("compose-body");

// ─── Blog CMS
const postCountLabel = document.getElementById("post-count-label");
const postsListBody = document.getElementById("posts-list-body");
const btnNewPost = document.getElementById("btn-new-post");

// ─── Editor drawer
const editorOverlay = document.getElementById("editor-overlay");
const editorDrawer = document.getElementById("editor-drawer");
const editorDrawerTitle = document.getElementById("editor-drawer-title");
const btnCloseEditor = document.getElementById("btn-close-editor");
const editorPostId = document.getElementById("editor-post-id");
const editorTitle = document.getElementById("editor-title");
const editorSlug = document.getElementById("editor-slug");
const editorCategory = document.getElementById("editor-category");
const editorAuthor = document.getElementById("editor-author");
const editorReadTime = document.getElementById("editor-read-time");
const editorExcerpt = document.getElementById("editor-excerpt");
const editorCoverImage = document.getElementById("editor-cover-image");
const coverImagePreview = document.getElementById("cover-image-preview");
const coverImgEl = document.getElementById("cover-img-preview-el");
const editorMetaTitle = document.getElementById("editor-meta-title");
const editorMetaDesc = document.getElementById("editor-meta-desc");
const editorFocusKw = document.getElementById("editor-focus-keyword");
const metaTitleCount = document.getElementById("meta-title-count");
const metaDescCount = document.getElementById("meta-desc-count");
const editorContent = document.getElementById("editor-content");
const editorPreview = document.getElementById("editor-preview");
const btnSaveDraft = document.getElementById("btn-save-draft");
const btnPublishPost = document.getElementById("btn-publish-post");
const btnPublishLabel = document.getElementById("btn-publish-label");

// ─── Tabs
const etabWrite = document.getElementById("etab-write");
const etabPreview = document.getElementById("etab-preview");

// ─── Confirm dialog
const confirmOverlay = document.getElementById("confirm-overlay");
const btnCancelConfirm = document.getElementById("btn-cancel-confirm");
const btnConfirmDelete = document.getElementById("btn-confirm-delete");

// ─── Toast
const toastEl = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const toastIcon = document.getElementById("toast-icon");

// ── Chart instances (kept to destroy/recreate on reload)
let chartPageviews = null;
let chartSources = null;
let chartDevices = null;
let analyticsUnsubscribe = null;

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
function checkAuth() { return sessionStorage.getItem(SESSION_KEY) === "true"; }

function showDashboard() {
    loginScreen.style.display = "none";
    dashboard.style.display = "flex";
    dashboard.style.flexDirection = "column";
    topbarDate.textContent = new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
    loadAnalytics();
    loadBlogPosts();
    loadContacts();
    loadWaitlist();
    loadHistory();
    loadMailbox();
}

loginBtn.addEventListener("click", () => {
    if (loginPassword.value === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, "true");
        loginError.style.display = "none";
        showDashboard();
    } else {
        loginError.style.display = "block";
        loginPassword.classList.add("shake");
        loginPassword.value = "";
        loginPassword.addEventListener("animationend", () =>
            loginPassword.classList.remove("shake"), { once: true });
    }
});

loginPassword.addEventListener("keydown", e => {
    if (e.key === "Enter") loginBtn.click();
});

logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
});

// Check session on load
// Moved to the bottom to avoid temporal dead zone issues for variables like allContactDocs.
// ═══════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════
document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".admin-tab-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        const panel = document.getElementById("panel-" + target);
        panel.classList.add("active");
        // Mailbox panel needs to be flex
        if (target === "mailbox") {
            panel.style.display = "flex";
        } else {
            // Reset other panels inline display block override (if any)
            document.querySelectorAll(".admin-tab-panel").forEach(p => {
                if (p.id !== "panel-mailbox") p.style.display = "";
            });
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════
async function loadAnalytics() {
    try {
        // Fetch all analytics docs (fine for a small site)
        const snap = await getDocs(collection(db, "site_analytics"));
        const docs = [];
        snap.forEach(d => docs.push(d.data()));

        renderStatCards(docs);
        renderCharts(docs);
        renderTopPages(docs);
    } catch (err) {
        console.error("[admin] analytics load error:", err);
    }

    // Live feed with real-time subscription
    startLiveFeed();
}

function renderStatCards(docs) {
    const todayStr = new Date().toDateString();

    const totalViews = docs.length;
    const uniqueVisitors = new Set(docs.map(d => d.visitorId).filter(Boolean)).size;
    const viewsToday = docs.filter(d => {
        if (!d.timestamp) return false;
        const ts = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
        return ts.toDateString() === todayStr;
    }).length;

    const durations = docs.map(d => d.duration).filter(v => typeof v === "number" && v > 0);
    const avgDuration = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    statTotalViews.textContent = totalViews.toLocaleString();
    statUniqueVisitors.textContent = uniqueVisitors.toLocaleString();
    statToday.textContent = viewsToday.toLocaleString();
    statAvgDuration.textContent = avgDuration + "s";
    statTodayDate.textContent = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function renderCharts(docs) {
    // ── 14-day pageviews line chart ──────────────────────────
    const daysLabels = [];
    const daysCounts = new Array(14).fill(0);
    const today = new Date(); today.setHours(23, 59, 59, 999);
    for (let i = 13; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        daysLabels.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    }
    docs.forEach(d => {
        if (!d.timestamp) return;
        const ts = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
        const diff = Math.floor((today - ts) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff < 14) daysCounts[13 - diff]++;
    });

    if (chartPageviews) chartPageviews.destroy();
    chartPageviews = new Chart(document.getElementById("chart-pageviews"), {
        type: "line",
        data: {
            labels: daysLabels,
            datasets: [{
                label: "Pageviews",
                data: daysCounts,
                borderColor: "#2B8EF0",
                backgroundColor: "rgba(43,142,240,0.08)",
                borderWidth: 2,
                pointBackgroundColor: "#2B8EF0",
                pointRadius: 3,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.4,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#64748B", maxTicksLimit: 7, font: { size: 11 } } },
                y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#64748B", font: { size: 11 }, stepSize: 1 }, beginAtZero: true }
            }
        }
    });

    // ── Sources doughnut ─────────────────────────────────────
    const sourceCounts = { Direct: 0, Search: 0, Social: 0, Referral: 0 };
    docs.forEach(d => { if (d.referrer && sourceCounts[d.referrer] !== undefined) sourceCounts[d.referrer]++; else sourceCounts.Direct++; });

    if (chartSources) chartSources.destroy();
    chartSources = new Chart(document.getElementById("chart-sources"), {
        type: "doughnut",
        data: {
            labels: Object.keys(sourceCounts),
            datasets: [{
                data: Object.values(sourceCounts),
                backgroundColor: ["#2B8EF0", "#10B981", "#8B5CF6", "#F59E0B"],
                borderColor: "#0D1526",
                borderWidth: 3,
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: { position: "bottom", labels: { color: "#64748B", font: { size: 11 }, padding: 14, boxWidth: 10, usePointStyle: true } }
            }
        }
    });

    // ── Devices bar chart ────────────────────────────────────
    const deviceCounts = { Desktop: 0, Mobile: 0, Tablet: 0 };
    docs.forEach(d => { if (d.device && deviceCounts[d.device] !== undefined) deviceCounts[d.device]++; });

    if (chartDevices) chartDevices.destroy();
    chartDevices = new Chart(document.getElementById("chart-devices"), {
        type: "bar",
        data: {
            labels: Object.keys(deviceCounts),
            datasets: [{
                data: Object.values(deviceCounts),
                backgroundColor: ["rgba(43,142,240,0.7)", "rgba(245,158,11,0.7)", "rgba(139,92,246,0.7)"],
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#64748B", font: { size: 11 } } },
                y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#64748B", font: { size: 11 }, stepSize: 1 }, beginAtZero: true }
            }
        }
    });
}

function renderTopPages(docs) {
    const pageCounts = {};
    docs.forEach(d => {
        const p = d.page || "/";
        pageCounts[p] = (pageCounts[p] || 0) + 1;
    });
    const sorted = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (!sorted.length) {
        topPagesBody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:var(--admin-muted);padding:32px;">No data yet</td></tr>`;
        return;
    }

    topPagesBody.innerHTML = sorted.map(([page, count]) => `
        <tr>
            <td><span class="page-path" title="${escHtml(page)}">${escHtml(page)}</span></td>
            <td><span class="views-count">${count}</span></td>
        </tr>`).join("");
}

function startLiveFeed() {
    const q = query(
        collection(db, "site_analytics"),
        orderBy("timestamp", "desc"),
        limit(25)
    );
    onSnapshot(q, snap => {
        if (snap.empty) {
            liveFeedBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--admin-muted);padding:32px;">No data yet</td></tr>`;
            return;
        }
        liveFeedBody.innerHTML = "";
        snap.forEach(d => {
            const ev = d.data();
            const ts = ev.timestamp ? (ev.timestamp.toDate ? ev.timestamp.toDate() : new Date(ev.timestamp)) : null;
            liveFeedBody.innerHTML += `
                <tr>
                    <td><span class="page-path" title="${escHtml(ev.page)}">${escHtml(ev.page || "/")}</span></td>
                    <td><span class="source-badge">${escHtml(ev.referrer || "Direct")}</span></td>
                    <td><span class="device-badge ${escHtml(ev.device || "Desktop")}">${escHtml(ev.device || "Desktop")}</span></td>
                    <td><span class="time-ago">${ts ? timeAgo(ts) : "—"}</span></td>
                </tr>`;
        });
    });
}

function timeAgo(date) {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return Math.floor(secs / 60) + "m ago";
    if (secs < 86400) return Math.floor(secs / 3600) + "h ago";
    return Math.floor(secs / 86400) + "d ago";
}

// ═══════════════════════════════════════════════════════════════
// BLOG CMS
// ═══════════════════════════════════════════════════════════════
async function loadBlogPosts() {
    const q = query(collection(db, "blog_posts"), orderBy("createdAt", "desc"));

    // Use onSnapshot directly — real-time + handles empty collection cleanly
    onSnapshot(q,
        snap => renderPostsList(snap),
        err => {
            console.error("[admin] blog load error:", err);
            const isPerms = err.code === "permission-denied";
            postsListBody.innerHTML = `
                <tr><td colspan="5" style="text-align:center;padding:40px;">
                    <div style="color:#DC2626;font-weight:600;margin-bottom:6px;">
                        ${isPerms ? "⛔ Firestore permission denied" : "⚠️ Failed to load posts"}
                    </div>
                    <div style="color:#64748B;font-size:13px;">
                        ${isPerms
                    ? "Add <code>blog_posts</code> to your Firestore security rules. See console for details."
                    : err.message}
                    </div>
                </td></tr>`;
        }
    );
}

let pendingDeleteId = null;

function renderPostsList(snap) {
    postCountLabel.textContent = `${snap.size} post${snap.size !== 1 ? "s" : ""}`;

    if (snap.empty) {
        postsListBody.innerHTML = `
            <tr><td colspan="5">
                <div class="cms-empty">
                    <h3>No posts yet</h3>
                    <p>Click "New Post" above to write your first blog post.</p>
                </div>
            </td></tr>`;
        return;
    }

    postsListBody.innerHTML = "";
    snap.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        const ts = p.createdAt ? (p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt)) : null;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="post-row-title">${escHtml(p.title || "Untitled")}</div>
                <div class="post-row-slug">/blog/${escHtml(p.slug || "")}</div>
            </td>
            <td>${escHtml(p.category || "—")}</td>
            <td><span class="status-badge ${p.status || "draft"}">${p.status === "published" ? "Published" : "Draft"}</span></td>
            <td style="color:var(--admin-muted);font-size:13px;">${ts ? ts.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
            <td>
                <div class="post-actions">
                    <button class="btn-edit" data-id="${id}">Edit</button>
                    <button class="btn-delete" data-id="${id}">Delete</button>
                </div>
            </td>`;
        row.querySelector(".btn-edit").addEventListener("click", () => openEditor(id, p));
        row.querySelector(".btn-delete").addEventListener("click", () => openConfirm(id));
        postsListBody.appendChild(row);
    });
}

// ── Editor open/close ─────────────────────────────────────────
function openEditor(id = null, postData = null) {
    editorPostId.value = id || "";
    editorDrawerTitle.textContent = id ? "Edit Post" : "New Post";

    if (postData) {
        editorTitle.value = postData.title || "";
        editorSlug.value = postData.slug || "";
        editorCategory.value = postData.category || "";
        editorAuthor.value = postData.author || "urbox.ai";
        editorReadTime.value = postData.readTime || 5;
        editorExcerpt.value = postData.excerpt || "";
        editorContent.value = postData.content || "";
        editorCoverImage.value = postData.coverImageUrl || "";
        editorMetaTitle.value = postData.metaTitle || "";
        editorMetaDesc.value = postData.metaDescription || "";
        editorFocusKw.value = postData.focusKeyword || "";
        btnPublishLabel.textContent = postData.status === "published" ? "Update" : "Publish";
        showCoverPreview(postData.coverImageUrl);
    } else {
        editorTitle.value = editorSlug.value = editorCategory.value = "";
        editorExcerpt.value = editorContent.value = "";
        editorCoverImage.value = editorMetaTitle.value = editorMetaDesc.value = editorFocusKw.value = "";
        editorAuthor.value = "urbox.ai";
        editorReadTime.value = 5;
        btnPublishLabel.textContent = "Publish";
        showCoverPreview("");
    }
    updateSeoCounters();
    // Reset to Write tab
    showWriteTab();
    editorOverlay.classList.add("open");
    editorDrawer.classList.add("open");
    editorTitle.focus();
}

function closeEditor() {
    editorOverlay.classList.remove("open");
    editorDrawer.classList.remove("open");
}

btnNewPost.addEventListener("click", () => openEditor());
btnCloseEditor.addEventListener("click", closeEditor);
editorOverlay.addEventListener("click", closeEditor);

// ── Auto-slug from title ──────────────────────────────────────
editorTitle.addEventListener("input", () => {
    if (!editorPostId.value) editorSlug.value = generateSlug(editorTitle.value);
    autoEstimateReadTime();
});
editorContent.addEventListener("input", autoEstimateReadTime);
editorMetaTitle.addEventListener("input", updateSeoCounters);
editorMetaDesc.addEventListener("input", updateSeoCounters);

// Cover image preview
editorCoverImage.addEventListener("input", () => showCoverPreview(editorCoverImage.value));

function showCoverPreview(url) {
    if (url && url.startsWith("http")) {
        coverImgEl.src = url;
        coverImagePreview.style.display = "block";
    } else {
        coverImagePreview.style.display = "none";
        coverImgEl.src = "";
    }
}

function updateSeoCounters() {
    const tLen = editorMetaTitle.value.length;
    const dLen = editorMetaDesc.value.length;
    metaTitleCount.textContent = tLen;
    metaTitleCount.style.color = tLen > 60 ? "#EF4444" : tLen > 50 ? "#F59E0B" : "inherit";
    metaDescCount.textContent = dLen;
    metaDescCount.style.color = dLen > 155 ? "#EF4444" : dLen > 130 ? "#F59E0B" : "inherit";
}

function generateSlug(title) {
    return title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
}

function autoEstimateReadTime() {
    const wordCount = (editorContent.value + " " + editorTitle.value)
        .replace(/<[^>]+>/g, " ")
        .split(/\s+/).filter(Boolean).length;
    editorReadTime.value = Math.max(1, Math.ceil(wordCount / 200));
}

// ── Write / Preview tabs ──────────────────────────────────────
function showWriteTab() {
    etabWrite.classList.add("active");
    etabPreview.classList.remove("active");
    editorContent.style.display = "block";
    editorPreview.style.display = "none";
}

etabWrite.addEventListener("click", showWriteTab);
etabPreview.addEventListener("click", () => {
    etabPreview.classList.add("active");
    etabWrite.classList.remove("active");
    editorContent.style.display = "none";
    editorPreview.style.display = "block";
    editorPreview.innerHTML = editorContent.value || "<p><em>Nothing to preview yet.</em></p>";
});

// ── Toolbar ───────────────────────────────────────────────────
document.querySelectorAll(".toolbar-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const ta = editorContent;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = ta.value.slice(start, end);

        const wrap = (before, after, placeholder) => {
            const text = selected || placeholder || "text";
            insert(ta, start, end, before + text + after);
        };

        const block = (tag, placeholder) => {
            const nl = start > 0 && ta.value[start - 1] !== "\n" ? "\n" : "";
            insert(ta, start, end, `${nl}<${tag}>${selected || placeholder || "content"}</${tag}>\n`);
        };

        switch (action) {
            case "h2": block("h2", "Section heading"); break;
            case "h3": block("h3", "Sub-heading"); break;
            case "bold": wrap("<strong>", "</strong>", "Bold text"); break;
            case "italic": wrap("<em>", "</em>", "Italic text"); break;
            case "blockquote": block("blockquote", "Your quote here"); break;
            case "ul":
                insert(ta, start, end, `\n<ul>\n  <li>${selected || "Item one"}</li>\n  <li>Item two</li>\n</ul>\n`); break;
            case "ol":
                insert(ta, start, end, `\n<ol>\n  <li>${selected || "Step one"}</li>\n  <li>Step two</li>\n</ol>\n`); break;
            case "link": {
                const url = prompt("Enter URL:", "https://");
                if (url) wrap(`<a href="${url}">`, "</a>", "Link text"); break;
            }
            case "hr":
                insert(ta, start, end, "\n<hr />\n"); break;
        }
        ta.focus();
    });
});

function insert(ta, start, end, text) {
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = start + text.length;
}

// ── Save / Publish ────────────────────────────────────────────
async function savePost(status) {
    const title = editorTitle.value.trim();
    const slug = editorSlug.value.trim() || generateSlug(title);
    const postId = editorPostId.value;

    if (!title) { toast("Please enter a title.", "error"); editorTitle.focus(); return; }
    if (!slug) { toast("Please enter a slug.", "error"); return; }

    btnPublishPost.disabled = true;
    btnSaveDraft.disabled = true;
    btnPublishLabel.textContent = "Saving\u2026";

    // Build data payload — everything inside try so errors are caught
    try {
        const data = {
            title,
            slug,
            status,                                             // "published" or "draft"
            category: editorCategory.value.trim() || "Article",
            author: editorAuthor.value.trim() || "urbox.ai",
            excerpt: editorExcerpt.value.trim(),
            content: editorContent.value,
            coverImageUrl: editorCoverImage.value.trim(),
            metaTitle: editorMetaTitle.value.trim(),
            metaDescription: editorMetaDesc.value.trim(),
            focusKeyword: editorFocusKw.value.trim(),
            readTime: parseInt(editorReadTime.value, 10) || 5,
            updatedAt: serverTimestamp(),
        };

        if (!postId) {
            // ── NEW post ────────────────────────────────────
            data.createdAt = serverTimestamp();
            if (status === "published") data.publishedAt = serverTimestamp();
            const ref = await addDoc(collection(db, "blog_posts"), data);
            editorPostId.value = ref.id;
        } else {
            // ── EXISTING post ────────────────────────────────
            if (status === "published") {
                // Only stamp publishedAt the very first time
                const existing = await getDoc(doc(db, "blog_posts", postId));
                if (!existing.data()?.publishedAt) data.publishedAt = serverTimestamp();
            }
            await updateDoc(doc(db, "blog_posts", postId), data);
        }

        toast(status === "published" ? "Post published! \uD83C\uDF89" : "Draft saved.", "success");
        closeEditor();
    } catch (err) {
        console.error("[admin] save error:", err);
        toast("Error saving: " + err.message, "error");
    } finally {
        btnPublishPost.disabled = false;
        btnSaveDraft.disabled = false;
        btnPublishLabel.textContent = editorPostId.value ? "Update" : "Publish";
    }
}

btnSaveDraft.addEventListener("click", () => savePost("draft"));
btnPublishPost.addEventListener("click", () => savePost("published"));

// ── Delete ────────────────────────────────────────────────────
function openConfirm(id) {
    pendingDeleteId = id;
    confirmOverlay.classList.add("open");
}

btnCancelConfirm.addEventListener("click", () => {
    pendingDeleteId = null;
    confirmOverlay.classList.remove("open");
});

btnConfirmDelete.addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    try {
        await deleteDoc(doc(db, "blog_posts", pendingDeleteId));
        toast("Post deleted.", "success");
    } catch (err) {
        toast("Error deleting: " + err.message, "error");
    } finally {
        pendingDeleteId = null;
        confirmOverlay.classList.remove("open");
    }
});

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
let toastTimer = null;
function toast(msg, type = "success") {
    toastMsg.textContent = msg;
    toastIcon.textContent = type === "success" ? "✓" : "✕";
    toastEl.className = "visible " + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.className = ""; }, 3500);
}

function escHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════════

// DOM refs
const contactsListBody = document.getElementById("contacts-list-body");
const contactCountLabel = document.getElementById("contact-count-label");
const contactsTabBadge = document.getElementById("contacts-tab-badge");
const msgModalOverlay = document.getElementById("msg-modal-overlay");
const msgModalTitle = document.getElementById("msg-modal-title");
const msgModalSub = document.getElementById("msg-modal-sub");
const msgModalBody = document.getElementById("msg-modal-body");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnReplyEmail = document.getElementById("btn-reply-email");

let allContactDocs = [];     // cache for filter
let currentFilter = "all";

// ── Load contacts (real-time) ─────────────────────────────────
function loadContacts() {
    const q = query(
        collection(db, "contact_requests"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q,
        snap => {
            allContactDocs = [];
            snap.forEach(d => allContactDocs.push({ id: d.id, ...d.data() }));
            renderContacts();
            updateContactBadge();
        },
        err => {
            console.error("[admin] contacts load error:", err);
            contactsListBody.innerHTML = `
                <tr><td colspan="6" style="text-align:center;padding:40px;">
                    <div style="color:#DC2626;font-weight:600;margin-bottom:6px;">
                        ${err.code === "permission-denied" ? "⛔ Firestore permission denied" : "⚠️ Failed to load contacts"}
                    </div>
                    <div style="color:#64748B;font-size:13px;">${err.message}</div>
                </td></tr>`;
        }
    );
}

function updateContactBadge() {
    const newCount = allContactDocs.filter(d => d.status === "new").length;
    if (newCount > 0) {
        contactsTabBadge.textContent = newCount;
        contactsTabBadge.style.display = "inline-flex";
    } else {
        contactsTabBadge.style.display = "none";
    }
}

// ── Render ────────────────────────────────────────────────────
function renderContacts() {
    const filtered = currentFilter === "all"
        ? allContactDocs
        : allContactDocs.filter(d => d.status === currentFilter);

    contactCountLabel.textContent = `${filtered.length} request${filtered.length !== 1 ? "s" : ""}`;

    if (!filtered.length) {
        const msg = currentFilter === "all" ? "No contact requests yet." : `No "${currentFilter}" requests.`;
        contactsListBody.innerHTML = `
            <tr><td colspan="6">
                <div class="contacts-empty">
                    <h3>${msg}</h3>
                    <p>When visitors submit the contact form, their messages will appear here.</p>
                </div>
            </td></tr>`;
        return;
    }

    contactsListBody.innerHTML = "";
    filtered.forEach(c => {
        const ts = c.createdAt ? (c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt)) : null;
        const dateStr = ts ? ts.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
        const timeStr = ts ? ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";
        const status = c.status || "new";
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="contact-name">${escHtml(c.name || "—")}</div>
                <div class="contact-email">${escHtml(c.email || "")}</div>
            </td>
            <td>${escHtml(c.subject || "—")}</td>
            <td>
                <span class="contact-message-preview">${escHtml(c.message || "")}</span>
                <button class="btn-view-msg" data-id="${c.id}">Read full message</button>
            </td>
            <td style="color:var(--admin-muted);font-size:13px;">${escHtml(c.company || "—")}</td>
            <td style="color:var(--admin-muted);font-size:13px;">
                <div>${dateStr}</div>
                <div style="font-size:11px;">${timeStr}</div>
            </td>
            <td>
                <button class="contact-status ${status}" data-id="${c.id}" data-status="${status}" title="Click to change status">
                    ${statusLabel}
                </button>
            </td>`;

        // View message
        row.querySelector(".btn-view-msg").addEventListener("click", () => {
            openMsgModal(c);
        });

        // Cycle status: new → read → replied → new
        row.querySelector(".contact-status").addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            const id = btn.dataset.id;
            const curr = btn.dataset.status;
            const next = curr === "new" ? "read" : curr === "read" ? "replied" : "new";
            try {
                await updateDoc(doc(db, "contact_requests", id), { status: next });
            } catch (err) {
                toast("Error updating status: " + err.message, "error");
            }
        });

        contactsListBody.appendChild(row);
    });
}

// ── Filter buttons ────────────────────────────────────────────
document.querySelectorAll(".contacts-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll(".contacts-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderContacts();
    });
});

// ── Message modal ─────────────────────────────────────────────
function openMsgModal(contact) {
    msgModalTitle.textContent = contact.subject || "Message";
    msgModalSub.textContent = `From ${contact.name || "—"}  ·  ${contact.email || ""}${contact.company ? "  ·  " + contact.company : ""}`;
    msgModalBody.textContent = contact.message || "";
    btnReplyEmail.href = `mailto:${encodeURIComponent(contact.email || "")}?subject=${encodeURIComponent("Re: " + (contact.subject || "Your enquiry"))}`;
    msgModalOverlay.classList.add("open");

    // Auto-mark as read if new
    if (contact.status === "new") {
        updateDoc(doc(db, "contact_requests", contact.id), { status: "read" }).catch(console.error);
    }
}

btnCloseModal.addEventListener("click", () => msgModalOverlay.classList.remove("open"));
msgModalOverlay.addEventListener("click", (e) => {
    if (e.target === msgModalOverlay) msgModalOverlay.classList.remove("open");
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") msgModalOverlay.classList.remove("open");
});

// ═══════════════════════════════════════════════════════════════
// WAITLIST
// ═══════════════════════════════════════════════════════════════
let allWaitlistDocs = [];

function loadWaitlist() {
    const q = query(
        collection(db, "waitlist"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q,
        snap => {
            allWaitlistDocs = [];
            snap.forEach(d => allWaitlistDocs.push({ id: d.id, ...d.data() }));
            renderWaitlist();
            updateWaitlistBadge();
        },
        err => {
            console.error("[admin] waitlist load error:", err);
            if (waitlistListBody) {
                waitlistListBody.innerHTML = `
                    <tr><td colspan="3" style="text-align:center;padding:40px;">
                        <div style="color:#DC2626;font-weight:600;margin-bottom:6px;">
                            ${err.code === "permission-denied" ? "⛔ Firestore permission denied" : "⚠️ Failed to load waitlist"}
                        </div>
                        <div style="color:#64748B;font-size:13px;">${err.message}</div>
                    </td></tr>`;
            }
        }
    );
}

function updateWaitlistBadge() {
    const count = allWaitlistDocs.length;
    if (count > 0 && waitlistTabBadge) {
        waitlistTabBadge.textContent = count;
        waitlistTabBadge.style.display = "inline-flex";
    } else if (waitlistTabBadge) {
        waitlistTabBadge.style.display = "none";
    }
}

function renderWaitlist() {
    if (!waitlistCountLabel || !waitlistListBody) return;

    waitlistCountLabel.textContent = `${allWaitlistDocs.length} signup${allWaitlistDocs.length !== 1 ? "s" : ""}`;

    if (!allWaitlistDocs.length) {
        waitlistListBody.innerHTML = `
            <tr><td colspan="3">
                <div class="contacts-empty" style="text-align:center;padding:40px;">
                    <h3 style="color:var(--admin-text);margin-bottom:8px;">No waitlist signups yet</h3>
                    <p style="color:var(--admin-muted);font-size:14px;">When visitors join the waitlist, their emails will appear here.</p>
                </div>
            </td></tr>`;
        return;
    }

    waitlistListBody.innerHTML = "";
    allWaitlistDocs.forEach(w => {
        const ts = w.createdAt ? (w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt)) : null;
        const dateStr = ts ? ts.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
        const timeStr = ts ? ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="contact-email" style="font-weight:500;">${escHtml(w.email || "—")}</div>
            </td>
            <td>
                <span class="source-badge" style="background:var(--admin-surface);border:1px solid var(--admin-border);padding:4px 8px;border-radius:12px;font-size:12px;text-transform:capitalize;">${escHtml(w.source || "Unknown")}</span>
            </td>
            <td style="color:var(--admin-muted);font-size:13px;">
                <div>${dateStr}</div>
                <div style="font-size:11px;">${timeStr}</div>
            </td>`;
        waitlistListBody.appendChild(row);
    });
}

// ═══════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════
let allHistoryDocs = [];

function loadHistory() {
    const q = query(
        collection(db, "landing_chat_presence"),
        orderBy("lastActive", "desc")
    );

    onSnapshot(q,
        snap => {
            allHistoryDocs = [];
            snap.forEach(d => allHistoryDocs.push({ id: d.id, ...d.data() }));
            renderHistory();
            updateHistoryBadge();
        },
        err => {
            console.error("[admin] history load error:", err);
            if (historyListBody) {
                historyListBody.innerHTML = `
                    <tr><td colspan="3" style="text-align:center;padding:40px;">
                        <div style="color:#DC2626;font-weight:600;margin-bottom:6px;">
                            ${err.code === "permission-denied" ? "⛔ Firestore permission denied" : "⚠️ Failed to load history"}
                        </div>
                        <div style="color:#64748B;font-size:13px;">${err.message}</div>
                    </td></tr>`;
            }
        }
    );
}

function updateHistoryBadge() {
    // Show how many people are currently online (active within last 60s)
    const now = Date.now();
    const activeCount = allHistoryDocs.filter(d => (now - d.lastActive) < 60000).length;

    if (activeCount > 0 && historyTabBadge) {
        historyTabBadge.textContent = activeCount;
        historyTabBadge.style.display = "inline-flex";
        historyTabBadge.style.background = "#4ADE80";
        historyTabBadge.style.color = "#064E3B";
    } else if (historyTabBadge) {
        historyTabBadge.style.display = "none";
    }
}

function renderHistory() {
    if (!historyCountLabel || !historyListBody) return;

    historyCountLabel.textContent = `${allHistoryDocs.length} user${allHistoryDocs.length !== 1 ? "s" : ""}`;

    if (!allHistoryDocs.length) {
        historyListBody.innerHTML = `
            <tr><td colspan="3">
                <div class="contacts-empty" style="text-align:center;padding:40px;">
                    <h3 style="color:var(--admin-text);margin-bottom:8px;">No user history yet</h3>
                    <p style="color:var(--admin-muted);font-size:14px;">Connected users will appear here.</p>
                </div>
            </td></tr>`;
        return;
    }

    historyListBody.innerHTML = "";

    // Sort array by recent activity
    allHistoryDocs.sort((a, b) => b.lastActive - a.lastActive);

    const now = Date.now();

    allHistoryDocs.forEach(h => {
        const ts = new Date(h.lastActive);
        const dateStr = ts ? ts.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
        const timeStr = ts ? ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
        const isActive = (now - h.lastActive) < 60000;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="contact-email" style="font-weight:500; font-family: monospace;">${escHtml(h.id)}</div>
            </td>
            <td>
                <div style="font-family: monospace; font-size: 13px; color: var(--admin-text);">${escHtml(h.ipAddress || "Unknown IP")}</div>
            </td>
            <td style="color:var(--admin-muted);font-size:13px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${isActive ? '<span style="width: 8px; height: 8px; border-radius: 50%; background: #4ADE80; display: inline-block; animation: pulse 2s infinite;"></span>' : ''}
                    <div>
                        <div>${dateStr}</div>
                        <div style="font-size:11px;">${timeStr}</div>
                    </div>
                </div>
            </td>`;
        historyListBody.appendChild(row);
    });
}

// ═══════════════════════════════════════════════════════════════
// MAILBOX
// ═══════════════════════════════════════════════════════════════
let allEmails = [];

async function loadMailbox() {
    if (!mailboxList) return;

    mailboxList.innerHTML = `<div style="padding:40px;text-align:center;color:var(--admin-muted);">Fetching emails from IMAP...</div>`;

    try {
        const res = await fetch("/api/mail");
        const data = await res.json();

        if (data.success) {
            allEmails = data.emails;
            renderMailbox();
        } else {
            throw new Error(data.error || "Failed to fetch emails");
        }
    } catch (err) {
        console.error("Mailbox Error:", err);
        mailboxList.innerHTML = `
            <div style="padding:40px;text-align:center;">
                <div style="color:#DC2626;font-weight:600;margin-bottom:6px;">⚠️ Connection Error</div>
                <div style="color:#64748B;font-size:13px;">${err.message}</div>
                <div style="color:#64748B;font-size:12px;margin-top:10px;">Make sure the Node.js backend is running and .env is configured.</div>
            </div>`;
    }
}

function renderMailbox() {
    if (!allEmails.length) {
        mailboxList.innerHTML = `<div style="padding:40px;text-align:center;color:var(--admin-muted);">Inbox is empty</div>`;
        return;
    }

    mailboxList.innerHTML = "";

    allEmails.forEach((email, index) => {
        const ts = new Date(email.date);
        const dateStr = ts.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        const el = document.createElement("div");
        el.className = "mail-item";

        // Very basic text extraction for preview
        const textPreview = (email.text || "").replace(/\s+/g, " ").substring(0, 50);

        let fromName = "Unknown Sender";
        if (email.from && email.from.length > 0) {
            fromName = email.from[0].name || email.from[0].address || "Unknown";
        }

        el.innerHTML = `
            <div class="mail-item-from">
                <span title="${escHtml(fromName)}">${escHtml(fromName)}</span>
                <span class="mail-item-date">${dateStr}</span>
            </div>
            <div class="mail-item-subject">${escHtml(email.subject || "No Subject")}</div>
            <div class="mail-item-preview">${escHtml(textPreview)}...</div>
        `;

        el.addEventListener("click", () => openEmail(index));
        mailboxList.appendChild(el);
    });
}

function openEmail(index) {
    const email = allEmails[index];
    if (!email) return;

    // UI State
    document.querySelectorAll(".mail-item").forEach(el => el.style.background = "");
    const mailItems = document.querySelectorAll(".mail-item");
    if (mailItems[index]) mailItems[index].style.background = "#F0FDF4";

    mailReaderEmpty.style.display = "none";
    mailReaderContent.style.display = "flex";

    // Populate data
    readMailSubject.textContent = email.subject || "No Subject";

    let fromName = "", fromAddress = "";
    if (email.from && email.from.length > 0) {
        fromName = email.from[0].name || "";
        fromAddress = email.from[0].address || "";
    }

    let toStr = "";
    if (email.to && email.to.length > 0) {
        toStr = email.to.map(t => t.address).join(", ");
    }

    readMailFrom.textContent = fromName ? `${fromName} <${fromAddress}>` : `<${fromAddress}>`;
    readMailTo.textContent = `to ${toStr}`;

    const ts = new Date(email.date);
    readMailDate.textContent = ts.toLocaleString();

    // Body (Prefer HTML, fallback to text)
    if (email.html) {
        // Simple sanitization by placing inside an iframe to prevent CSS/JS pollution
        readMailBody.innerHTML = `<iframe style="width:100%; height:100%; border:none; min-height: 400px;" srcdoc="${escHtml(email.html).replace(/"/g, '&quot;')}"></iframe>`;
    } else {
        readMailBody.innerHTML = `<div style="white-space: pre-wrap; font-family: monospace;">${escHtml(email.text || "No content")}</div>`;
    }

    // Setup Reply button
    if (btnReplyMail) {
        // Remove old listeners by cloning
        const newBtn = btnReplyMail.cloneNode(true);
        btnReplyMail.parentNode.replaceChild(newBtn, btnReplyMail);

        newBtn.addEventListener("click", () => {
            const replyToEmail = fromAddress;
            const replySubject = email.subject ? (email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`) : "Re: ";

            // Open compose drawer with preset fields
            openCompose(replyToEmail);
            composeSubject.value = replySubject;
            composeBody.focus();
        });
    }
}

if (btnRefreshMail) {
    btnRefreshMail.addEventListener("click", loadMailbox);
}

// ─── Compose Drawer Logic ───
function openCompose(replyTo = "") {
    composeTo.value = replyTo;
    composeSubject.value = "";
    composeBody.value = "";

    if (btnSendLabel) btnSendLabel.textContent = "Send Email";
    if (btnSendMail) btnSendMail.disabled = false;

    composeOverlay.classList.add("open");
    composeDrawer.classList.add("open");

    if (replyTo) {
        composeSubject.value = "Re: ";
        composeBody.focus();
    } else {
        composeTo.focus();
    }
}

function closeCompose() {
    composeOverlay.classList.remove("open");
    composeDrawer.classList.remove("open");
}

if (btnComposeMail) btnComposeMail.addEventListener("click", () => openCompose());
if (btnCloseCompose) btnCloseCompose.addEventListener("click", closeCompose);
if (btnCancelCompose) btnCancelCompose.addEventListener("click", closeCompose);
if (composeOverlay) composeOverlay.addEventListener("click", closeCompose);

if (btnSendMail) {
    btnSendMail.addEventListener("click", async () => {
        const to = composeTo.value.trim();
        const subject = composeSubject.value.trim();
        const body = composeBody.value.trim();

        if (!to || !subject || !body) {
            toast("Please fill in all fields (To, Subject, Message).", "error");
            return;
        }

        if (btnSendLabel) btnSendLabel.textContent = "Sending...";
        btnSendMail.disabled = true;
        toast("Sending email...", "success");

        try {
            const res = await fetch("/api/mail/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to, subject, body })
            });
            const data = await res.json();

            if (data.success) {
                toast("Email sent successfully!", "success");
                closeCompose();
            } else {
                throw new Error(data.error || "Unknown error sending email");
            }
        } catch (err) {
            console.error("Mail send error:", err);
            toast("Failed to send: " + err.message, "error");
            if (btnSendLabel) btnSendLabel.textContent = "Try Again";
            btnSendMail.disabled = false;
        }
    });
}

// Check session on load
if (checkAuth()) showDashboard();
