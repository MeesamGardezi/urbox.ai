/**
 * Mockup Interactivity
 * - Sidebar tab → panel switching
 * - Email row click highlighting
 * - Banner marquee scroll
 */

(function initMockup() {
    // ── Panel switching ──────────────────────────────────────
    const sidebarItems = document.querySelectorAll('.ms-item[data-panel]');
    const panels = document.querySelectorAll('.mock-panel');

    function switchToPanel(panelId) {
        // Hide all panels
        panels.forEach(p => p.classList.remove('active'));

        // Deactivate all sidebar items
        sidebarItems.forEach(i => i.classList.remove('active'));

        // Show target panel
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) targetPanel.classList.add('active');

        // Activate matching sidebar items (multiple items can share a panelId)
        sidebarItems.forEach(i => {
            if (i.dataset.panel === panelId) i.classList.add('active');
        });
    }

    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            switchToPanel(item.dataset.panel);
        });
    });

    // ── Email list row selection (within inbox panel) ────────
    const emailRows = document.querySelectorAll('.ml-row');
    emailRows.forEach(row => {
        row.addEventListener('click', () => {
            emailRows.forEach(r => r.classList.remove('active'));
            row.classList.add('active');
        });
    });

    // ── Team chat group row selection ────────────────────────
    const groupRows = document.querySelectorAll('.tc-group-row');
    groupRows.forEach(row => {
        row.addEventListener('click', () => {
            groupRows.forEach(r => r.classList.remove('tc-group-active'));
            row.classList.add('tc-group-active');
        });
    });

    // ── WhatsApp tab switching ───────────────────────────────
    const waTabs = document.querySelectorAll('.wa-tab');
    waTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            waTabs.forEach(t => t.classList.remove('wa-tab-active'));
            tab.classList.add('wa-tab-active');
        });
    });

    // ── Storage view toggle ──────────────────────────────────
    const viewBtns = document.querySelectorAll('.st-view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('st-view-active'));
            btn.classList.add('st-view-active');
        });
    });

    // ── Todo Board priority filter ───────────────────────────
    const pfBtns = document.querySelectorAll('.tb-pf-btn');
    pfBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            pfBtns.forEach(b => b.classList.remove('tb-pf-active'));
            btn.classList.add('tb-pf-active');
        });
    });

    // ── Calendar cell selection ──────────────────────────────
    const calCells = document.querySelectorAll('.cal-cell:not(.cal-other-month)');
    calCells.forEach(cell => {
        cell.addEventListener('click', () => {
            calCells.forEach(c => c.classList.remove('cal-today'));
            cell.classList.add('cal-today');
        });
    });

})();