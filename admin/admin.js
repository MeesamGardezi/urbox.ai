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
if (checkAuth()) showDashboard();

// ═══════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════
document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".admin-tab-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("panel-" + target).classList.add("active");
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
                <div class="post-row-slug">/blog/post.html?slug=${escHtml(p.slug || "")}</div>
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
