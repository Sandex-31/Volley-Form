/**
 * Reimbursements Module
 * Checklist of who has paid back the person who anticipated (fronted) money.
 *
 * Standalone reminder tool: each row is a person you toggle Paid / To-pay,
 * with an optional free note. The roster is edited from a small admin panel
 * (password-gated, same password as the rest of the app).
 */
const ReimbursementsModule = {
    roster: [],
    status: {},
    isAdmin: false,

    /**
     * Initialize: wait for Firebase, then subscribe to roster + status.
     */
    init: function() {
        if (typeof FirebaseService === 'undefined' || !FirebaseService.isReady()) {
            // Firebase may still be booting; retry shortly.
            setTimeout(() => this.init(), 100);
            return;
        }

        this.bindStaticEvents();

        ReimbursementService.subscribeRoster((roster) => {
            this.roster = roster;
            this.render();
        });
        ReimbursementService.subscribeStatus((status) => {
            this.status = status;
            this.render();
        });

        Logger.info('Reimbursements module initialized');
    },

    /**
     * Wire up the controls that always exist (not the per-row ones).
     */
    bindStaticEvents: function() {
        const loginBtn = document.getElementById('adminLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleAdminLogin());
        }

        const saveBtn = document.getElementById('saveRosterBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSaveRoster());
        }

        const resetBtn = document.getElementById('resetAllBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleResetAll());
        }

        // Event delegation for the per-row toggles + notes.
        const list = document.getElementById('reimbursementList');
        if (list) {
            list.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action="toggle"]');
                if (btn) this.handleToggle(btn.dataset.id);
            });
            list.addEventListener('change', (e) => {
                if (e.target.classList.contains('rb-note')) {
                    this.handleNote(e.target.dataset.id, e.target.value);
                }
            });
        }
    },

    /**
     * Render the checklist + summary. Re-runs on every roster/status change.
     */
    render: function() {
        const list = document.getElementById('reimbursementList');
        if (!list) return;

        if (this.roster.length === 0) {
            list.innerHTML = `
                <div class="rb-empty">
                    <div class="rb-empty-icon">🧾</div>
                    <div class="rb-empty-text">No people yet</div>
                    <p>Open the admin panel below to add the list of people.</p>
                </div>`;
            this.updateSummary(0, 0);
            return;
        }

        let paidCount = 0;
        const rowsHtml = this.roster.map(person => {
            const st = this.status[person.id] || {};
            const paid = st.paid === true;
            if (paid) paidCount += 1;
            const note = st.note || '';

            return `
                <div class="rb-row ${paid ? 'is-paid' : ''}" data-id="${this.escape(person.id)}">
                    <div class="rb-name">${this.escape(person.name)}</div>
                    <button type="button" class="rb-toggle ${paid ? 'paid' : 'topay'}"
                            data-action="toggle" data-id="${this.escape(person.id)}">
                        ${paid ? '✅ Paid' : '⬜ To pay'}
                    </button>
                    <input type="text" class="rb-note" data-id="${this.escape(person.id)}"
                           placeholder="note (optional)…" value="${this.escape(note)}">
                </div>`;
        }).join('');

        list.innerHTML = rowsHtml;
        this.updateSummary(paidCount, this.roster.length);
    },

    /**
     * Update the "X of Y paid" summary line.
     */
    updateSummary: function(paid, total) {
        const el = document.getElementById('rbSummary');
        if (!el) return;
        const toPay = total - paid;
        el.innerHTML = total === 0
            ? 'Nobody on the list yet.'
            : `<strong>${paid}</strong> paid · <strong>${toPay}</strong> still to pay · ${total} total`;
    },

    /**
     * Toggle a person between paid / to-pay (keeps their note).
     */
    handleToggle: async function(id) {
        const current = this.status[id] || {};
        await ReimbursementService.setStatus(id, {
            paid: !(current.paid === true),
            note: current.note || ''
        });
    },

    /**
     * Save an edited note for a person (keeps their paid state).
     */
    handleNote: async function(id, value) {
        const current = this.status[id] || {};
        await ReimbursementService.setStatus(id, {
            paid: current.paid === true,
            note: value
        });
    },

    /**
     * Admin login (client-side gate, same as the rest of the app — see note
     * in the page; this is a friends-tool, not real security).
     */
    handleAdminLogin: function() {
        const expected = (typeof APP_CONSTANTS !== 'undefined' && APP_CONSTANTS.ADMIN_PASSWORD) || 'admin123';
        const entered = prompt('Admin password:');
        if (entered === null) return; // cancelled
        if (entered === expected) {
            this.isAdmin = true;
            this.showAdminPanel();
        } else {
            this.flash('✗ Wrong password', 'error');
        }
    },

    /**
     * Reveal the admin panel and pre-fill the textarea with the current roster.
     */
    showAdminPanel: function() {
        const panel = document.getElementById('adminPanel');
        const loginBtn = document.getElementById('adminLoginBtn');
        const resetBtn = document.getElementById('resetAllBtn');
        const textarea = document.getElementById('rosterInput');

        if (textarea) {
            textarea.value = this.roster.map(p => p.name).join('\n');
        }
        if (panel) panel.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'inline-block';
    },

    /**
     * Save the roster from the textarea (one name per line). Existing ids are
     * preserved for unchanged names, so their paid/to-pay status survives.
     */
    handleSaveRoster: async function() {
        const textarea = document.getElementById('rosterInput');
        if (!textarea) return;

        const names = textarea.value.split('\n');
        const roster = ReimbursementService.buildRoster(names);

        const ok = await ReimbursementService.saveRoster(roster);
        this.flash(ok ? '✓ Roster saved' : '✗ Failed to save roster', ok ? 'success' : 'error');
    },

    /**
     * Reset everyone back to "to pay" (admin only). Confirms first.
     */
    handleResetAll: async function() {
        if (!this.isAdmin) return;
        if (!confirm('Reset EVERYONE back to "to pay" and clear notes?')) return;

        const ok = await ReimbursementService.resetAll(this.roster);
        this.flash(ok ? '✓ All reset to "to pay"' : '✗ Reset failed', ok ? 'success' : 'error');
    },

    /**
     * Small transient status message.
     */
    flash: function(text, type) {
        const el = document.getElementById('rbMessage');
        if (!el) return;
        el.textContent = text;
        el.className = `rb-message ${type}`;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 3000);
    },

    /**
     * Escape text for safe insertion into HTML / attributes.
     */
    escape: function(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
};

// Initialize when DOM is ready.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ReimbursementsModule.init());
} else {
    ReimbursementsModule.init();
}
