/**
 * MATCH LINEUPS
 * Per-set starting six and substitution log, live-synced with Firebase.
 *
 * The starting six is stored by position, index 0 = P1. By convention P1 is the
 * setter, so positions are read in a frame relative to her — which is why a
 * substitution needs no rotation counter: whoever comes in takes the position of
 * whoever goes out.
 *
 * Who is on court is never stored. It is replayed:
 *     onCourt = lineup, with each sub swapping `out` for `in` in place.
 * Stored state and history therefore cannot disagree.
 */
const MatchLineups = {
    MAX_SETS: 5,

    /** P1..P6 laid out as seen from behind our baseline: front row on top. */
    COURT_ORDER: [3, 2, 1, 4, 5, 0],

    matchId: null,
    sets: {},
    activeSet: 1,
    isAdmin: false,
    subscriptionRef: null,
    loadError: null,

    /* ===== LIFECYCLE ===== */

    openModal: function (matchId, opponentName, matchDate) {
        this.matchId = matchId;
        this.sets = {};
        this.isAdmin = StorageService.hasItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN);

        const opponentEl = document.getElementById('lineupMatchOpponent');
        const dateEl = document.getElementById('lineupMatchDate');
        if (opponentEl) opponentEl.textContent = opponentName;
        if (dateEl) dateEl.textContent = matchDate;

        const modal = document.getElementById('lineupModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        // Draw straight away. The panel must not depend on the database answering:
        // if the subscription never fires, an empty modal tells the user nothing.
        this.loadError = null;
        this.render();

        this.unsubscribe();
        this.subscriptionRef = MatchService.subscribeToLineups(
            matchId,
            (data) => {
                this.loadError = null;
                this.sets = data || {};

                // Land on the set being played rather than always on set 1.
                const played = this.playedSets();
                if (played.length && !this.sets[this.activeSet]) {
                    this.activeSet = played[played.length - 1];
                }
                this.render();
            },
            (error) => {
                this.loadError = error.message || 'lettura non riuscita';
                this.render();
            }
        );
    },

    closeModal: function () {
        this.unsubscribe();
        this.matchId = null;
        this.activeSet = 1;

        const modal = document.getElementById('lineupModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    },

    unsubscribe: function () {
        if (this.subscriptionRef) {
            FirebaseService.unsubscribe(this.subscriptionRef);
            this.subscriptionRef = null;
        }
    },

    selectSet: function (setNumber) {
        this.activeSet = Number(setNumber);
        this.render();
    },

    /**
     * Set numbers that actually hold data, ascending.
     * The Realtime Database hands back an array when keys are numeric and dense,
     * so `sets` may arrive as [null, {...}, {...}] — hence the truthiness filter
     * and the >= 1 guard, which together keep a phantom "Set 0" out of the tabs.
     */
    playedSets: function () {
        return Object.keys(this.sets)
            .filter((key) => this.sets[key])
            .map(Number)
            .filter((n) => n >= 1)
            .sort((a, b) => a - b);
    },

    /* ===== DERIVATION ===== */

    /** Substitutions oldest first. The key is the write timestamp. */
    orderedSubs: function (setData) {
        const subs = (setData && setData.subs) || {};
        return Object.keys(subs)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => ({ key: key, sub: subs[key] }));
    },

    /** Replay the sub log over the starting six. */
    onCourt: function (setData) {
        if (!setData || !setData.lineup) return [];
        const six = setData.lineup.slice();
        this.orderedSubs(setData).forEach((entry) => {
            const i = six.indexOf(entry.sub.out);
            if (i !== -1) six[i] = entry.sub.in;
        });
        return six;
    },

    /* ===== PLAYER HELPERS ===== */

    roster: function () {
        return (typeof PlayerService !== 'undefined' && PlayerService.getPlayersList()) || [];
    },

    player: function (playerId) {
        return this.roster().find((p) => p.id === playerId) || null;
    },

    playerLabel: function (playerId) {
        const p = this.player(playerId);
        if (!p) return '—';
        return '#' + (p.number || '?') + ' ' + (p.name || 'Giocatore');
    },

    escapeHtml: function (text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    },

    /* ===== RENDER ===== */

    render: function () {
        this.renderTabs();

        const body = document.getElementById('lineupSetBody');
        if (!body) return;

        if (this.loadError) {
            body.innerHTML = `<p class="lineup-error">Impossibile leggere le formazioni: ${this.escapeHtml(this.loadError)}.
                Controlla la connessione e i permessi del database.</p>`;
            return;
        }

        const setData = this.sets[this.activeSet];
        if (!setData || !setData.lineup) {
            body.innerHTML = this.lineupFormHtml();
        } else {
            body.innerHTML = this.setViewHtml(setData);
        }
        this.hydrateIcons(body);
    },

    /** navbar.js only fills [data-icon] once at load; this markup arrives later. */
    hydrateIcons: function (root) {
        if (typeof Icons === 'undefined') return;
        root.querySelectorAll('[data-icon]').forEach(function (el) {
            el.innerHTML = Icons.get(el.getAttribute('data-icon'));
        });
    },

    renderTabs: function () {
        const wrap = document.getElementById('lineupSetTabs');
        if (!wrap) return;

        const played = this.playedSets();
        const highest = played.length ? played[played.length - 1] : 0;

        // Tabs for every recorded set, plus the next one if the match can go on.
        const shown = played.slice();
        const next = highest + 1;
        if (next <= this.MAX_SETS && !shown.includes(next)) shown.push(next);
        if (!shown.length) shown.push(1);
        if (!shown.includes(this.activeSet)) shown.push(this.activeSet);
        shown.sort((a, b) => a - b);

        wrap.innerHTML = shown.map((n) => {
            const active = n === this.activeSet ? ' active' : '';
            const pending = this.sets[n] ? '' : ' pending';
            return `<button type="button" class="lineup-tab${active}${pending}" onclick="MatchLineups.selectSet(${n})">Set ${n}</button>`;
        }).join('');
    },

    /** Six selects laid out as the court, P1 first in the data, bottom-right on screen. */
    lineupFormHtml: function () {
        if (!this.isAdmin) {
            return `<p class="lineup-empty">Nessuna formazione registrata per questo set.</p>
                <p class="lineup-hint">Serve l'accesso admin per inserirla.</p>`;
        }
        if (!this.roster().length) {
            return '<p class="lineup-error">Roster non disponibile: impossibile comporre una formazione.</p>';
        }

        const options = this.roster()
            .map((p) => `<option value="${this.escapeHtml(p.id)}">${this.escapeHtml(this.playerLabel(p.id))}</option>`)
            .join('');

        const slots = this.COURT_ORDER.map((idx) => {
            const pos = 'P' + (idx + 1);
            const hint = idx === 0 ? '<span class="lineup-slot-hint">Palleggiatore</span>' : '';
            return `
                <label class="lineup-slot">
                    <span class="lineup-slot-pos">${pos}</span>
                    ${hint}
                    <select id="lineupSlot${idx}" class="lineup-select">
                        <option value="">— Giocatore —</option>
                        ${options}
                    </select>
                </label>`;
        }).join('');

        return `
            <p class="lineup-hint">Inserisci i sei di partenza. <strong>P1 è il palleggiatore</strong>: le altre
                posizioni seguono in senso orario a partire da lei.</p>
            <div class="lineup-court">${slots}</div>
            <div class="lineup-libero-row">
                <label class="lineup-slot lineup-slot--libero">
                    <span class="lineup-slot-pos">Libero</span>
                    <select id="lineupLibero" class="lineup-select">
                        <option value="">— Nessuno —</option>
                        ${options}
                    </select>
                </label>
            </div>
            <div class="button-group">
                <button type="button" class="btn-save" onclick="MatchLineups.saveLineup()">✓ Salva formazione</button>
            </div>`;
    },

    setViewHtml: function (setData) {
        const six = this.onCourt(setData);
        const subs = this.orderedSubs(setData);

        const discs = this.COURT_ORDER.map((idx) => {
            const id = six[idx];
            const p = this.player(id);
            const changed = id !== setData.lineup[idx];
            return `
                <div class="lineup-disc${changed ? ' is-substituted' : ''}">
                    <span class="lineup-disc-pos">P${idx + 1}</span>
                    <span class="lineup-disc-num">${this.escapeHtml(p ? p.number : '?')}</span>
                    <span class="lineup-disc-name">${this.escapeHtml(p ? p.name : 'Sconosciuto')}</span>
                </div>`;
        }).join('');

        const libero = setData.libero
            ? `<p class="lineup-libero-tag">Libero: <strong>${this.escapeHtml(this.playerLabel(setData.libero))}</strong></p>`
            : '';

        return `
            <div class="lineup-court lineup-court--readonly">${discs}</div>
            ${libero}
            ${this.subFormHtml(setData, six)}
            ${this.subLogHtml(subs)}
            ${this.resetHtml(subs)}`;
    },

    subFormHtml: function (setData, six) {
        if (!this.isAdmin) return '';

        const outOptions = six
            .map((id) => `<option value="${this.escapeHtml(id)}">${this.escapeHtml(this.playerLabel(id))}</option>`)
            .join('');

        const benchOptions = this.roster()
            .filter((p) => six.indexOf(p.id) === -1 && p.id !== setData.libero)
            .map((p) => `<option value="${this.escapeHtml(p.id)}">${this.escapeHtml(this.playerLabel(p.id))}</option>`)
            .join('');

        if (!benchOptions) {
            return '<p class="lineup-hint">Nessun giocatore disponibile in panchina per un cambio.</p>';
        }

        return `
            <div class="lineup-sub-form">
                <h4>Registra un cambio</h4>
                <div class="lineup-sub-fields">
                    <label>Esce
                        <select id="lineupSubOut" class="lineup-select">${outOptions}</select>
                    </label>
                    <label>Entra
                        <select id="lineupSubIn" class="lineup-select">${benchOptions}</select>
                    </label>
                    <label>Punteggio
                        <input type="text" id="lineupSubScore" class="lineup-input" placeholder="es. 14-11"
                            inputmode="numeric" autocomplete="off">
                    </label>
                </div>
                <button type="button" class="btn-save" onclick="MatchLineups.addSub()">↔ Registra cambio</button>
            </div>`;
    },

    subLogHtml: function (subs) {
        if (!subs.length) {
            return '<p class="lineup-empty">Nessun cambio in questo set.</p>';
        }

        const rows = subs.map((entry, i) => {
            const last = i === subs.length - 1;
            const undo = (last && this.isAdmin)
                ? `<button type="button" class="lineup-undo" onclick="MatchLineups.undoSub('${this.escapeHtml(entry.key)}')">Annulla</button>`
                : '';
            return `
                <li class="lineup-sub-row">
                    <span class="lineup-sub-score">${this.escapeHtml(entry.sub.score)}</span>
                    <span class="lineup-sub-out">${this.escapeHtml(this.playerLabel(entry.sub.out))}</span>
                    <span class="lineup-sub-arrow" data-icon="arrow-right"></span>
                    <span class="lineup-sub-in">${this.escapeHtml(this.playerLabel(entry.sub.in))}</span>
                    ${undo}
                </li>`;
        }).join('');

        return `<h4 class="lineup-log-title">Cambi</h4><ol class="lineup-sub-log">${rows}</ol>`;
    },

    /** The starting six is immutable once play has been recorded on top of it. */
    resetHtml: function (subs) {
        if (!this.isAdmin || subs.length) return '';
        return `
            <div class="lineup-reset">
                <button type="button" class="btn-secondary" onclick="MatchLineups.resetLineup()">Correggi formazione iniziale</button>
            </div>`;
    },

    /* ===== WRITES ===== */

    saveLineup: async function () {
        const lineup = [];
        for (let i = 0; i < 6; i++) {
            const el = document.getElementById('lineupSlot' + i);
            lineup.push(el ? el.value : '');
        }

        if (lineup.some((id) => !id)) {
            UIService.showMessage('⚠️ Compila tutte e sei le posizioni', 'error');
            return;
        }
        if (new Set(lineup).size !== 6) {
            UIService.showMessage('⚠️ Un giocatore non può occupare due posizioni', 'error');
            return;
        }

        const liberoEl = document.getElementById('lineupLibero');
        const libero = liberoEl ? liberoEl.value : '';
        if (libero && lineup.indexOf(libero) !== -1) {
            UIService.showMessage('⚠️ Il libero non può essere anche fra i sei in campo', 'error');
            return;
        }

        const ok = await MatchService.saveSetLineup(this.matchId, this.activeSet, lineup, libero);
        if (ok) UIService.showMessage('✓ Formazione salvata', 'success');
    },

    addSub: async function () {
        const setData = this.sets[this.activeSet];
        if (!setData) return;

        const outEl = document.getElementById('lineupSubOut');
        const inEl = document.getElementById('lineupSubIn');
        const scoreEl = document.getElementById('lineupSubScore');
        const out = outEl ? outEl.value : '';
        const incoming = inEl ? inEl.value : '';
        const score = scoreEl ? scoreEl.value.trim() : '';

        if (!/^\d{1,2}\s*-\s*\d{1,2}$/.test(score)) {
            UIService.showMessage('⚠️ Punteggio non valido (es. 14-11)', 'error');
            return;
        }

        // Guard the invariants before writing, not after.
        const six = this.onCourt(setData);
        if (six.indexOf(out) === -1) {
            UIService.showMessage('⚠️ Chi esce non è in campo', 'error');
            return;
        }
        if (six.indexOf(incoming) !== -1) {
            UIService.showMessage('⚠️ Chi entra è già in campo', 'error');
            return;
        }

        const ok = await MatchService.addSubstitution(this.matchId, this.activeSet, {
            out: out,
            in: incoming,
            score: score.replace(/\s*-\s*/, '-')
        });
        if (ok) UIService.showMessage('✓ Cambio registrato', 'success');
    },

    undoSub: async function (subKey) {
        if (!window.confirm('Annullare l\'ultimo cambio?')) return;
        const ok = await MatchService.removeSubstitution(this.matchId, this.activeSet, subKey);
        if (ok) UIService.showMessage('✓ Cambio annullato', 'success');
    },

    resetLineup: async function () {
        if (!window.confirm('Cancellare la formazione di questo set e reinserirla?')) return;
        const ok = await MatchService.saveSetLineup(this.matchId, this.activeSet, null, null);
        if (ok) {
            delete this.sets[this.activeSet];
            this.render();
        }
    }
};
