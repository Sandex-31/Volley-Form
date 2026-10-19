/**
 * Training Reports Module
 * "Report post-allenamento e diario tecnico": list, detail, staff form, comments
 */

const TrainingReportsModule = {
    isAdmin: false,
    players: [],
    reports: [],
    view: 'list',          // 'list' | 'detail' | 'form' | 'login'
    currentId: null,       // report shown in detail
    draft: null,           // report being edited in the form
    comments: [],
    commentsRef: null,
    ownerHash: '',
    editingCommentId: null,

    /**
     * Initialize module
     */
    init: async function() {
        if (!FirebaseService.isReady()) {
            setTimeout(() => this.init(), 100);
            return;
        }
        this.isAdmin = StorageService.hasItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN);
        this.ownerHash = await TrainingReportService.getOwnerHash();

        PlayerService.subscribeToPlayers((players) => {
            this.players = players;
            this.refresh();
        });
        TrainingReportService.subscribeToReports((reports) => {
            this.reports = reports;
            this.refresh();
        });
        Logger.info('Training reports module initialized');
    },

    /**
     * Re-render after live data changes, without leaving a form being typed in
     */
    refresh: function() {
        if (this.view === 'list') this.showList();
        else if (this.view === 'detail') this.renderDetail();
    },

    app: function() {
        return document.getElementById('trApp');
    },

    setTab: function(tab) {
        document.getElementById('trTabReports').classList.toggle('active', tab === 'reports');
        document.getElementById('trTabStaff').classList.toggle('active', tab === 'staff');
    },

    leaveDetail: function() {
        FirebaseService.unsubscribe(this.commentsRef);
        this.commentsRef = null;
        this.comments = [];
        this.editingCommentId = null;
    },

    // ---------- HELPERS ----------

    esc: function(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g,
            c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    },

    playerName: function(id) {
        const p = this.players.find(x => x.id === id);
        return p ? p.name : 'Giocatore rimosso';
    },

    longDate: function(d) {
        return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    },

    shortDate: function(d) {
        return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    },

    stars: function(n) {
        return '★'.repeat(n) + '☆'.repeat(5 - n);
    },

    today: function() {
        const d = new Date();
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    },

    // ---------- LIST ----------

    showList: function() {
        this.leaveDetail();
        this.view = 'list';
        this.setTab('reports');
        const app = this.app();
        if (!this.reports.length) {
            app.innerHTML = '<p class="tr-empty">Nessun allenamento registrato.</p>';
            return;
        }
        app.innerHTML = this.reports.map(r => `
            <button type="button" class="tr-card tr-card-click" onclick="TrainingReportsModule.showReport('${r.id}')">
                <span class="tr-row">
                    <span class="tr-date">${this.shortDate(r.date)}</span>
                    <span class="tr-stars" aria-label="Voto ${r.rating} su 5">${this.stars(r.rating)}</span>
                </span>
                ${r.goals ? `<span class="tr-info">Obiettivi: ${this.esc(r.goals.slice(0, 90))}${r.goals.length > 90 ? '…' : ''}</span>` : ''}
            </button>`).join('');
    },

    // ---------- DETAIL ----------

    showReport: function(id) {
        this.leaveDetail();
        this.view = 'detail';
        this.currentId = id;
        this.setTab('reports');
        this.commentsRef = TrainingReportService.subscribeToComments(id, (list) => {
            this.comments = list;
            if (this.view === 'detail' && this.currentId === id) this.renderComments();
        });
        this.renderDetail();
        window.scrollTo(0, 0);
    },

    renderDetail: function() {
        const r = TrainingReportService.getReport(this.currentId);
        if (!r) { this.showList(); return; }
        const block = (title, text) => text
            ? `<section class="tr-card"><h2>${title}</h2><div class="tr-text">${this.esc(text)}</div></section>` : '';
        const absent = this.players.filter(p => !r.present.includes(p.id));
        const pills = (ids, cls) => ids.map(id => `<span class="tr-pill ${cls || ''}">${this.esc(this.playerName(id))}</span>`).join('');

        this.app().innerHTML = `
            <button type="button" class="tr-back" onclick="TrainingReportsModule.showList()">← Tutti i report</button>
            <section class="tr-card">
                <h2>${this.longDate(r.date)}</h2>
                <div class="tr-big-stars" aria-label="Voto ${r.rating} su 5">${this.stars(r.rating)}</div>
            </section>
            ${block('Obiettivi', r.goals)}
            <section class="tr-card">
                <h2>Presenti (${r.present.length})</h2>
                ${pills(r.present) || '—'}
                ${absent.length ? `<h2 class="tr-sub">Assenti</h2>${pills(absent.map(p => p.id), 'tr-pill-absent')}` : ''}
            </section>
            ${block('Andamento generale', r.trend)}
            ${r.observations.length ? `<section class="tr-card"><h2>Osservazioni personali</h2>
                ${r.observations.map(o => `<div class="tr-obs">
                    <b>${this.esc(o.players.map(id => this.playerName(id)).join(' · '))}</b>
                    ${o.text ? `<div class="tr-text">${this.esc(o.text)}</div>` : ''}
                    ${o.future ? `<div class="tr-future"><b>Per i prossimi allenamenti:</b> ${this.esc(o.future)}</div>` : ''}
                </div>`).join('')}</section>` : ''}
            ${block('Suggerimenti per i prossimi allenamenti', r.suggestions)}
            ${block('Note', r.notes)}
            ${this.videoBlock(r.videos)}
            <div id="trComments"></div>
            ${this.isAdmin ? `<div class="tr-actions">
                <button type="button" class="tr-btn tr-btn-secondary" onclick="TrainingReportsModule.openForm('${r.id}')">Modifica</button>
                <button type="button" class="tr-btn tr-btn-danger" onclick="TrainingReportsModule.deleteReport('${r.id}')">Elimina</button>
            </div>` : ''}`;
        this.renderComments();
        this.loadVideoTitles();
    },

    /**
     * Fill in YouTube titles once they arrive (keeps "Video N" if unavailable)
     */
    loadVideoTitles: function() {
        document.querySelectorAll('.tr-video-title[data-video-url]').forEach(el => {
            TrainingReportService.fetchVideoTitle(el.dataset.videoUrl).then(title => {
                if (title && el.isConnected) {
                    el.textContent = title;
                    el.closest('.tr-video-link').title = title;
                }
            });
        });
    },

    /**
     * Compact buttons, one per video: they open YouTube (app on phones) or a new tab.
     * The label starts as "Video N" and is replaced by the YouTube title when it loads.
     */
    videoBlock: function(videos) {
        if (!videos.length) return '';
        const one = (url, i) => {
            const isYoutube = !!TrainingReportService.youtubeId(url);
            let where = 'YouTube';
            if (!isYoutube) {
                try { where = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { where = 'Link'; }
            }
            return `<a class="tr-video-link" href="${this.esc(url)}" target="_blank" rel="noopener noreferrer">
                <span class="tr-video-play" aria-hidden="true">▶</span>
                <span class="tr-video-text"><span class="tr-video-title" data-video-url="${this.esc(url)}">Video ${i + 1}</span><small>${this.esc(where)}</small></span>
            </a>`;
        };
        return `<section class="tr-card"><h2>Video dell'allenamento${videos.length > 1 ? ` (${videos.length})` : ''}</h2>
            <div class="tr-videos">${videos.map(one).join('')}</div></section>`;
    },

    deleteReport: async function(id) {
        if (!this.isAdmin || !confirm('Eliminare questo allenamento? Verranno eliminati anche i commenti.')) return;
        this.leaveDetail();
        if (await TrainingReportService.deleteReport(id)) {
            UIService.showMessage('Allenamento eliminato', 'success');
            this.showList();
        } else {
            UIService.showMessage('Errore durante l’eliminazione', 'error');
        }
    },

    // ---------- COMMENTS ----------

    renderComments: function() {
        const box = document.getElementById('trComments');
        if (!box) return;
        const remembered = StorageService.getItem(APP_CONSTANTS.STORAGE_KEYS.REPORT_AUTHOR_NAME) || '';
        const names = [...this.players.map(p => p.name), 'Staff'];
        const when = (ts) => new Date(ts).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

        box.innerHTML = `<section class="tr-card tr-comments">
            ${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<svg class="tr-koi tr-koi-${n}" viewBox="0 0 200 80" aria-hidden="true"><use href="#trKoi"/></svg>`).join('')}
            <h2>Commenti (${this.comments.length})</h2>
            ${this.comments.map(c => {
                const canEdit = this.isAdmin || c.ownerHash === this.ownerHash;
                if (c.id === this.editingCommentId) {
                    return `<div class="tr-comment">
                        <div class="tr-comment-who">${this.esc(c.author)}</div>
                        <textarea id="trEditComment" maxlength="500">${this.esc(c.text)}</textarea>
                        <div class="tr-actions">
                            <button type="button" class="tr-btn tr-btn-primary" onclick="TrainingReportsModule.saveComment('${c.id}', this)">Salva</button>
                            <button type="button" class="tr-btn tr-btn-secondary" onclick="TrainingReportsModule.editComment(null)">Annulla</button>
                        </div>
                    </div>`;
                }
                return `<div class="tr-comment">
                    <div class="tr-comment-who">${this.esc(c.author)}<span class="tr-comment-when">${when(c.createdAt)}${c.edited ? ' · modificato' : ''}</span></div>
                    <div class="tr-text">${this.esc(c.text)}</div>
                    ${canEdit ? `<div class="tr-comment-actions">
                        <button type="button" class="tr-link" onclick="TrainingReportsModule.editComment('${c.id}')">Modifica</button>
                        <button type="button" class="tr-link tr-link-danger" onclick="TrainingReportsModule.deleteComment('${c.id}')">Elimina</button>
                    </div>` : ''}
                </div>`;
            }).join('') || '<p class="tr-info">Ancora nessun commento. Scrivi il primo!</p>'}
            <div class="tr-new-comment">
                <label for="trCommentName">Chi sei?</label>
                <select id="trCommentName">
                    <option value="">— scegli il tuo nome —</option>
                    ${names.map(n => `<option ${n === remembered ? 'selected' : ''}>${this.esc(n)}</option>`).join('')}
                </select>
                <label for="trCommentText">Il tuo commento</label>
                <textarea id="trCommentText" maxlength="500" placeholder="Scrivi qui il tuo pensiero…"></textarea>
                <button type="button" class="tr-btn tr-btn-primary" onclick="TrainingReportsModule.addComment(this)">Invia commento</button>
            </div>
        </section>`;
    },

    addComment: async function(btn) {
        const name = document.getElementById('trCommentName').value;
        const text = document.getElementById('trCommentText').value.trim();
        if (!name) { UIService.showMessage('Scegli il tuo nome', 'error'); return; }
        if (!text) { UIService.showMessage('Scrivi un commento', 'error'); return; }
        btn.disabled = true;
        btn.textContent = 'Invio…';
        StorageService.setItem(APP_CONSTANTS.STORAGE_KEYS.REPORT_AUTHOR_NAME, name);
        const ok = await TrainingReportService.addComment(this.currentId, name, text, this.ownerHash);
        if (!ok) {
            UIService.showMessage('Errore durante l’invio del commento', 'error');
            btn.disabled = false;
            btn.textContent = 'Invia commento';
        }
        // On success the live subscription re-renders the comments
    },

    editComment: function(id) {
        this.editingCommentId = id;
        this.renderComments();
    },

    saveComment: async function(id, btn) {
        const text = document.getElementById('trEditComment').value.trim();
        if (!text) { UIService.showMessage('Il commento non può essere vuoto', 'error'); return; }
        btn.disabled = true;
        this.editingCommentId = null;
        if (!await TrainingReportService.editComment(this.currentId, id, text)) {
            UIService.showMessage('Errore durante il salvataggio', 'error');
            this.renderComments();
        }
    },

    deleteComment: async function(id) {
        if (!confirm('Eliminare questo commento?')) return;
        if (!await TrainingReportService.deleteComment(this.currentId, id)) {
            UIService.showMessage('Errore durante l’eliminazione', 'error');
        }
    },

    // ---------- STAFF AREA ----------

    openStaff: function() {
        if (this.isAdmin) { this.openForm(); return; }
        this.leaveDetail();
        this.view = 'login';
        this.setTab('staff');
        this.app().innerHTML = `<section class="tr-card">
            <h2>Area SIG</h2>
            <label for="trPassword">Password amministratore</label>
            <input type="password" id="trPassword" autocomplete="current-password" onkeydown="if (event.key === 'Enter') TrainingReportsModule.login()">
            <button type="button" class="tr-btn tr-btn-primary tr-btn-block" onclick="TrainingReportsModule.login()">Entra</button>
        </section>`;
        document.getElementById('trPassword').focus();
    },

    /**
     * Same admin login as Gestione (shared flag in localStorage)
     */
    login: function() {
        const input = document.getElementById('trPassword');
        if (input.value !== APP_CONSTANTS.ADMIN_PASSWORD) {
            UIService.showMessage('Password non corretta', 'error');
            return;
        }
        StorageService.setItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN, true);
        this.isAdmin = true;
        UIService.showMessage('Accesso effettuato', 'success');
        this.openForm();
    },

    logout: function() {
        StorageService.removeItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN);
        this.isAdmin = false;
        UIService.showMessage('Uscita effettuata', 'success');
        this.showList();
    },

    // ---------- FORM (new or edit) ----------

    openForm: function(id) {
        if (!this.isAdmin) { this.openStaff(); return; }
        this.leaveDetail();
        this.view = 'form';
        this.setTab('staff');
        const r = id ? TrainingReportService.getReport(id) : null;
        this.draft = r ? JSON.parse(JSON.stringify(r)) : {
            id: '', date: this.today(), goals: '', present: [], trend: '', observations: [],
            suggestions: '', rating: 0, notes: '', videos: [], createdAt: 0
        };
        this.draft.videoText = this.draft.videos.join('\n');
        this.renderForm();
        window.scrollTo(0, 0);
    },

    renderForm: function() {
        const f = this.draft;
        const toggles = (selected, onclick) => this.players.map(p =>
            `<button type="button" class="tr-pill tr-pill-toggle ${selected.includes(p.id) ? 'on' : ''}" aria-pressed="${selected.includes(p.id)}" onclick="${onclick}('${p.id}', this)">${this.esc(p.name)}</button>`).join('');

        this.app().innerHTML = `
            <section class="tr-card">
                <div class="tr-row">
                    <h2>${f.id ? 'Modifica allenamento' : 'Nuovo allenamento'}</h2>
                    <button type="button" class="tr-link" onclick="TrainingReportsModule.logout()">Esci</button>
                </div>
                <label for="trDate">Data</label>
                <input type="date" id="trDate" value="${f.date}" oninput="TrainingReportsModule.draft.date = this.value">
                <label for="trGoals">Obiettivi principali</label>
                <textarea id="trGoals" oninput="TrainingReportsModule.draft.goals = this.value">${this.esc(f.goals)}</textarea>
                <label>Presenze <small>(tocca i nomi)</small></label>
                <div class="tr-pills">${toggles(f.present, 'TrainingReportsModule.togglePresent')}</div>
                <button type="button" class="tr-btn tr-btn-secondary tr-btn-block" onclick="TrainingReportsModule.allPresent()">Tutti presenti</button>
                <label for="trTrend">Andamento generale / osservazioni</label>
                <textarea id="trTrend" oninput="TrainingReportsModule.draft.trend = this.value">${this.esc(f.trend)}</textarea>
            </section>

            <section class="tr-card">
                <h2>Osservazioni sulle atlete</h2>
                ${f.observations.map((o, i) => `<div class="tr-obs">
                    <label>Atlete <small>(tocca per sceglierne una o più)</small></label>
                    <div class="tr-pills">${this.players.map(p =>
                        `<button type="button" class="tr-pill tr-pill-toggle ${o.players.includes(p.id) ? 'on' : ''}" aria-pressed="${o.players.includes(p.id)}" onclick="TrainingReportsModule.toggleObsPlayer(${i}, '${p.id}', this)">${this.esc(p.name)}</button>`).join('')}</div>
                    <label for="trObsText${i}">Osservazione</label>
                    <textarea id="trObsText${i}" oninput="TrainingReportsModule.draft.observations[${i}].text = this.value">${this.esc(o.text)}</textarea>
                    <label for="trObsFuture${i}">Appunti per allenamenti futuri</label>
                    <textarea id="trObsFuture${i}" oninput="TrainingReportsModule.draft.observations[${i}].future = this.value">${this.esc(o.future)}</textarea>
                    <button type="button" class="tr-btn tr-btn-danger tr-btn-block" onclick="TrainingReportsModule.removeObservation(${i})">Rimuovi</button>
                </div>`).join('')}
                <button type="button" class="tr-btn tr-btn-secondary tr-btn-block" onclick="TrainingReportsModule.addObservation()">+ Aggiungi atleta o gruppo</button>
            </section>

            <section class="tr-card">
                <label for="trSuggestions" class="tr-first">Suggerimenti generali per i prossimi allenamenti</label>
                <textarea id="trSuggestions" oninput="TrainingReportsModule.draft.suggestions = this.value">${this.esc(f.suggestions)}</textarea>
                <label>Voto dell'allenamento</label>
                <div class="tr-rating" role="group" aria-label="Voto">${[1, 2, 3, 4, 5].map(n =>
                    `<button type="button" class="tr-star ${f.rating >= n ? 'on' : ''}" aria-label="${n} stelle" onclick="TrainingReportsModule.setRating(${n})">★</button>`).join('')}</div>
                <label for="trNotes">Note</label>
                <textarea id="trNotes" oninput="TrainingReportsModule.draft.notes = this.value">${this.esc(f.notes)}</textarea>
                <label for="trVideos">Link video <small>(uno per riga)</small></label>
                <textarea id="trVideos" placeholder="Incolla qui i link di YouTube, uno sotto l'altro" oninput="TrainingReportsModule.draft.videoText = this.value">${this.esc(f.videoText)}</textarea>
            </section>

            <div class="tr-actions">
                <button type="button" class="tr-btn tr-btn-primary" onclick="TrainingReportsModule.saveForm(this)">Salva allenamento</button>
                <button type="button" class="tr-btn tr-btn-secondary" onclick="${f.id ? `TrainingReportsModule.showReport('${f.id}')` : 'TrainingReportsModule.showList()'}">Annulla</button>
            </div>`;
    },

    toggleList: function(list, id, el) {
        const pos = list.indexOf(id);
        if (pos < 0) list.push(id); else list.splice(pos, 1);
        el.classList.toggle('on', pos < 0);
        el.setAttribute('aria-pressed', pos < 0);
    },

    togglePresent: function(id, el) {
        this.toggleList(this.draft.present, id, el);
    },

    toggleObsPlayer: function(i, id, el) {
        this.toggleList(this.draft.observations[i].players, id, el);
    },

    allPresent: function() {
        this.draft.present = this.players.map(p => p.id);
        this.renderForm();
    },

    addObservation: function() {
        this.draft.observations.push({ players: [], text: '', future: '' });
        this.renderForm();
    },

    removeObservation: function(i) {
        this.draft.observations.splice(i, 1);
        this.renderForm();
    },

    setRating: function(n) {
        this.draft.rating = n;
        document.querySelectorAll('.tr-star').forEach((s, i) => s.classList.toggle('on', i < n));
    },

    saveForm: async function(btn) {
        const f = this.draft;
        if (!f.date) { UIService.showMessage('Inserisci la data', 'error'); return; }
        btn.disabled = true;
        btn.textContent = 'Salvataggio…';
        const id = await TrainingReportService.saveReport({ ...f, videos: TrainingReportService.parseVideoLinks(f.videoText) });
        if (id) {
            UIService.showMessage('Allenamento salvato', 'success');
            this.showReport(id);
        } else {
            UIService.showMessage('Errore durante il salvataggio', 'error');
            btn.disabled = false;
            btn.textContent = 'Salva allenamento';
        }
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TrainingReportsModule.init());
} else {
    TrainingReportsModule.init();
}
