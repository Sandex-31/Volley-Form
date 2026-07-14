/**
 * Match Report Module
 * Read-only report page for a single match: score timeline from live events,
 * per-set team trend and player breakdowns. Data: matches/, matchStats/, matchEvents/.
 */

const MatchReport = {
    matchId: null,
    match: null,
    stats: {},
    events: [],
    players: [],
    loaded: false,
    timelineSet: null,
    timelinePlayerId: null,
    scope: 'all', // players section scope: 'all' or set number
    sortKey: 'points',
    sortDir: -1,
    selectedPlayerId: null,
    charts: {},

    KEY_LABELS: {
        point_serve: 'Ace',
        point_spike: 'Punto attacco',
        point_block: 'Punto muro',
        point_lob: 'Punto pallonetto',
        point_random: 'Punto altro',
        service_out: 'Battuta out',
        service_net: 'Battuta in rete',
        foul: 'Fallo',
        error_grave: 'Errore grave',
        error_block: 'Errore muro',
        error_receive: 'Errore ricezione',
        error_set: 'Errore palleggio',
        error_defense: 'Errore difesa',
        serve_streak: 'Battuta in campo',
        opp_error: 'Errore avversario',
        opp_point: 'Vincente avversario'
    },

    POINT_KEYS: ['point_serve', 'point_spike', 'point_block', 'point_lob', 'point_random'],
    ERROR_KEYS: ['service_out', 'service_net', 'foul', 'error_grave', 'error_block', 'error_receive', 'error_set', 'error_defense'],

    init: function () {
        if (!FirebaseService.isReady()) {
            setTimeout(() => this.init(), 100);
            return;
        }
        this.matchId = new URLSearchParams(window.location.search).get('id');
        if (!this.matchId) {
            this.showError('Nessuna partita selezionata.');
            return;
        }
        PlayerService.subscribeToPlayers(async (players) => {
            this.players = players || [];
            await this.loadData();
            this.renderAll();
        });
    },

    loadData: async function () {
        if (this.loaded) return;
        this.loaded = true;
        const [match, stats, events] = await Promise.all([
            FirebaseService.read(`${APP_CONSTANTS.FIREBASE_REFS.MATCHES}/${this.matchId}`),
            FirebaseService.read(`${APP_CONSTANTS.FIREBASE_REFS.MATCH_STATS}/${this.matchId}`),
            MatchService.getMatchEvents(this.matchId)
        ]);
        this.match = match;
        this.stats = stats || {};
        this.events = events || [];
    },

    showError: function (msg) {
        const el = document.getElementById('reportContent');
        if (el) el.innerHTML = `<p class="mr-empty">${msg}</p>`;
    },

    playerById: function (id) {
        return this.players.find((p) => p.id === id) || null;
    },

    /** "#7 Rossi: Errore ricezione" — event description for tooltips and lists */
    describeEvent: function (e) {
        const label = this.KEY_LABELS[e.key] || e.key;
        const p = e.playerId ? this.playerById(e.playerId) : null;
        return p ? `#${p.number} ${p.name}: ${label}` : label;
    },

    cssVar: function (name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    },

    /** Set numbers with any data (stats or events), ascending */
    setsAvailable: function () {
        const nums = new Set();
        Object.values(this.stats).forEach((raw) => {
            Object.keys(MatchService.splitBySets(raw)).forEach((n) => nums.add(Number(n)));
        });
        this.events.forEach((e) => nums.add(Number(e.set)));
        return [...nums].filter((n) => n >= 1).sort((a, b) => a - b);
    },

    /** Player stats within a scope ('all' or set number) */
    statsForScope: function (playerId, scope) {
        const raw = this.stats[playerId];
        if (scope === 'all') return MatchService.aggregateStats(raw);
        return MatchService.mergeStats(MatchService.splitBySets(raw)[scope], null);
    },

    sumKeys: function (stats, keys) {
        return keys.reduce((t, k) => t + (stats[k] || 0), 0);
    },

    destroyChart: function (name) {
        if (this.charts[name]) {
            this.charts[name].destroy();
            delete this.charts[name];
        }
    },

    renderAll: function () {
        if (!this.match) {
            this.showError('Partita non trovata.');
            return;
        }
        this.renderHeader();
        this.renderTimeline();
        this.renderTeamChart();
        this.renderPlayersSection();
    },

    /* ===== HEADER ===== */

    renderHeader: function () {
        document.title = `Report vs ${this.match.opponent} - Volley Tool`;
        const set = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        set('mrOpponent', `vs ${this.match.opponent}`);
        let dateDisplay = this.match.date;
        try {
            dateDisplay = new Date(this.match.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) { /* keep raw */ }
        set('mrDate', dateDisplay);
        set('mrLocation', this.match.location === 'Home' ? '🏠 Casa' : '🚌 Trasferta');
        set('mrScore', this.match.score);
        set('mrSets', this.match.sets);
        const badge = document.getElementById('mrStatus');
        if (badge) {
            badge.textContent = this.match.status;
            badge.className = 'badge ' + (this.match.status === 'Won' ? 'badge-won' : this.match.status === 'Lost' ? 'badge-lost' : 'badge-upcoming');
        }
    },

    /* ===== TIMELINE (score progression per set) ===== */

    renderTimeline: function () {
        const tabsWrap = document.getElementById('timelineSetTabs');
        const emptyEl = document.getElementById('timelineEmpty');
        const canvas = document.getElementById('timelineChart');
        const runEl = document.getElementById('timelineRuns');
        if (!canvas) return;

        const eventSets = [...new Set(this.events.map((e) => Number(e.set)))].filter((n) => n >= 1).sort((a, b) => a - b);
        if (!eventSets.length) {
            if (emptyEl) emptyEl.style.display = 'block';
            canvas.parentElement.style.display = 'none';
            if (tabsWrap) tabsWrap.style.display = 'none';
            if (runEl) runEl.style.display = 'none';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';
        canvas.parentElement.style.display = 'block';

        if (!this.timelineSet || !eventSets.includes(this.timelineSet)) this.timelineSet = eventSets[0];
        if (tabsWrap) {
            tabsWrap.style.display = 'flex';
            tabsWrap.innerHTML = eventSets.map((n) =>
                `<button type="button" class="lineup-tab${n === this.timelineSet ? ' active' : ''}" onclick="MatchReport.selectTimelineSet(${n})">Set ${n}</button>`
            ).join('');
        }

        const steps = MatchService.scoreProgression(this.events, this.timelineSet);
        this.renderTimelinePlayerFilter();
        const labels = steps.map((s, i) => i + 1);
        const brand = this.cssVar('--brand') || '#0D1A3C';
        const accent = this.cssVar('--accent') || '#B22823';
        const success = this.cssVar('--success') || '#1E8E5A';
        const danger = this.cssVar('--danger') || '#C0392B';
        const textMuted = this.cssVar('--text-muted') || '#888';
        const border = this.cssVar('--border') || '#ddd';

        const datasets = [
            { label: 'Noi', data: steps.map((s) => s.us), borderColor: brand, backgroundColor: brand, stepped: true, pointRadius: 2, pointHoverRadius: 5 },
            { label: 'Loro', data: steps.map((s) => s.them), borderColor: accent, backgroundColor: accent, stepped: true, pointRadius: 2, pointHoverRadius: 5 }
        ];

        // Highlight the selected player's scoring events on the timeline
        const sel = this.timelinePlayerId;
        if (sel) {
            const p = this.playerById(sel);
            const tag = p ? `#${p.number}` : '';
            const mark = (team) => steps.map((s) =>
                s.event.playerId === sel && MatchService.eventTeam(s.event.key) === team
                    ? (team === 'us' ? s.us : s.them)
                    : null);
            datasets.push(
                { label: `Punti ${tag}`, data: mark('us'), showLine: false, pointRadius: 7, pointHoverRadius: 9, pointStyle: 'circle', backgroundColor: success, borderColor: success },
                { label: `Errori ${tag}`, data: mark('them'), showLine: false, pointRadius: 7, pointHoverRadius: 9, pointStyle: 'rectRot', backgroundColor: danger, borderColor: danger }
            );
        }

        this.destroyChart('timeline');
        this.charts.timeline = new Chart(canvas, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: textMuted } },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const s = steps[items[0].dataIndex];
                                return `${s.us} – ${s.them}`;
                            },
                            label: (item) => item.datasetIndex === 0 ? this.describeEvent(steps[item.dataIndex].event) : ''
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Punti giocati', color: textMuted }, ticks: { color: textMuted }, grid: { color: border } },
                    y: { beginAtZero: true, ticks: { color: textMuted, precision: 0 }, grid: { color: border } }
                }
            }
        });

        if (runEl) {
            runEl.style.display = 'flex';
            runEl.innerHTML = this.runsSummaryHtml(steps);
        }
    },

    selectTimelineSet: function (n) {
        this.timelineSet = Number(n);
        this.renderTimeline();
    },

    /** Dropdown of players with events in the selected set */
    renderTimelinePlayerFilter: function () {
        const selEl = document.getElementById('timelinePlayerFilter');
        if (!selEl) return;
        const ids = [...new Set(this.events
            .filter((e) => Number(e.set) === this.timelineSet && e.playerId)
            .map((e) => e.playerId))];
        if (this.timelinePlayerId && !ids.includes(this.timelinePlayerId)) this.timelinePlayerId = null;
        selEl.innerHTML = '<option value="">Tutti i giocatori</option>' + ids.map((id) => {
            const p = this.playerById(id);
            const name = p ? `#${p.number} ${this.escapeHtml(p.name)}` : id;
            return `<option value="${id}"${id === this.timelinePlayerId ? ' selected' : ''}>${name}</option>`;
        }).join('');
        selEl.style.display = ids.length ? 'inline-block' : 'none';
    },

    selectTimelinePlayer: function (val) {
        this.timelinePlayerId = val || null;
        this.renderTimeline();
    },

    /** Best scoring run per team in the selected set, e.g. "5-0" */
    runsSummaryHtml: function (steps) {
        let bestUs = 0, bestThem = 0, run = 0, team = null;
        steps.forEach((s, i) => {
            const scorer = i === 0
                ? (s.us > 0 ? 'us' : 'them')
                : (s.us > steps[i - 1].us ? 'us' : 'them');
            run = scorer === team ? run + 1 : 1;
            team = scorer;
            if (scorer === 'us') bestUs = Math.max(bestUs, run);
            else bestThem = Math.max(bestThem, run);
        });
        const last = steps[steps.length - 1];
        const final = last ? `${last.us} – ${last.them}` : '0 – 0';
        return `
            <span class="mr-chip">Punteggio ricostruito: <strong>${final}</strong></span>
            <span class="mr-chip mr-chip-us">Miglior parziale noi: <strong>${bestUs}-0</strong></span>
            <span class="mr-chip mr-chip-them">Miglior parziale loro: <strong>0-${bestThem}</strong></span>
        `;
    },

    /* ===== TEAM TREND (points vs errors per set) ===== */

    renderTeamChart: function () {
        const canvas = document.getElementById('teamChart');
        const emptyEl = document.getElementById('teamEmpty');
        if (!canvas) return;

        const sets = this.setsAvailable();
        if (!sets.length) {
            if (emptyEl) emptyEl.style.display = 'block';
            canvas.parentElement.style.display = 'none';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        const points = [], errors = [];
        sets.forEach((n) => {
            let p = 0, e = 0;
            Object.keys(this.stats).forEach((pid) => {
                const s = this.statsForScope(pid, n);
                p += this.sumKeys(s, this.POINT_KEYS);
                e += this.sumKeys(s, this.ERROR_KEYS);
            });
            points.push(p);
            errors.push(e);
        });

        const success = this.cssVar('--success') || '#1E8E5A';
        const danger = this.cssVar('--danger') || '#C0392B';
        const textMuted = this.cssVar('--text-muted') || '#888';
        const border = this.cssVar('--border') || '#ddd';

        this.destroyChart('team');
        this.charts.team = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sets.map((n) => `Set ${n}`),
                datasets: [
                    { label: 'Punti fatti', data: points, backgroundColor: success, borderRadius: 6 },
                    { label: 'Errori', data: errors, backgroundColor: danger, borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: textMuted } } },
                scales: {
                    x: { ticks: { color: textMuted }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { color: textMuted, precision: 0 }, grid: { color: border } }
                }
            }
        });
    },

    /* ===== PLAYERS (sortable table + per-player breakdown) ===== */

    renderPlayersSection: function () {
        const tabsWrap = document.getElementById('playersScopeTabs');
        if (tabsWrap) {
            const tab = (label, val) =>
                `<button type="button" class="lineup-tab${String(this.scope) === String(val) ? ' active' : ''}" onclick="MatchReport.selectScope('${val}')">${label}</button>`;
            tabsWrap.innerHTML = tab('Totale', 'all') + this.setsAvailable().map((n) => tab(`Set ${n}`, n)).join('');
        }
        this.renderPlayersTable();
        this.renderPlayerChart();
    },

    selectScope: function (val) {
        this.scope = val === 'all' ? 'all' : Number(val);
        this.renderPlayersSection();
    },

    selectSort: function (key) {
        if (this.sortKey === key) this.sortDir = -this.sortDir;
        else { this.sortKey = key; this.sortDir = -1; }
        this.renderPlayersTable();
    },

    /**
     * Serve summary from scoped stats: closed streaks + open one, totals.
     * "serie" reads like the live tracker: "3 · 0 · 7 · (2)" — (n) = streak still open.
     */
    serveInfo: function (s) {
        const closed = Array.isArray(s.serve_streaks) ? s.serve_streaks.slice() : Object.values(s.serve_streaks || {});
        const open = s.serve_streak || 0;
        const servesIn = closed.reduce((t, n) => t + n, 0) + open;
        const serveErrors = (s.service_out || 0) + (s.service_net || 0);
        const total = servesIn + serveErrors;
        const parts = closed.slice();
        if (open > 0) parts.push(`(${open})`);
        return {
            best: Math.max(0, ...closed, open),
            servesIn,
            serveErrors,
            total,
            pct: total > 0 ? Math.round((servesIn / total) * 100) : null,
            serie: parts.length ? parts.join(' · ') : '—'
        };
    },

    playerRows: function () {
        return this.players
            .map((p) => {
                const s = this.statsForScope(p.id, this.scope);
                const points = this.sumKeys(s, this.POINT_KEYS);
                const errors = this.sumKeys(s, this.ERROR_KEYS);
                const serve = this.serveInfo(s);
                return { player: p, points, errors, efficiency: points - errors, aces: s.point_serve || 0, bestStreak: serve.best, serve };
            })
            .filter((r) => r.points > 0 || r.errors > 0 || r.bestStreak > 0)
            .sort((a, b) => (b[this.sortKey] - a[this.sortKey]) * -this.sortDir);
    },

    renderPlayersTable: function () {
        const tbody = document.getElementById('playersTableBody');
        if (!tbody) return;
        // Header sort indicators
        document.querySelectorAll('#playersTable th[data-sort]').forEach((th) => {
            const key = th.getAttribute('data-sort');
            const base = th.getAttribute('data-label');
            th.textContent = key === this.sortKey ? `${base} ${this.sortDir === -1 ? '↓' : '↑'}` : base;
        });
        const rows = this.playerRows();
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="mr-empty">Nessuna statistica in questo set.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map((r) => `
            <tr class="${r.player.id === this.selectedPlayerId ? 'selected' : ''}" onclick="MatchReport.selectPlayer('${r.player.id}')">
                <td><span class="mr-player">#${r.player.number} ${this.escapeHtml(r.player.name)}</span></td>
                <td class="mr-num mr-pos">${r.points}</td>
                <td class="mr-num mr-neg">${r.errors}</td>
                <td class="mr-num" style="color: ${r.efficiency >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${r.efficiency > 0 ? '+' : ''}${r.efficiency}</td>
                <td class="mr-num">${r.aces}</td>
                <td class="mr-num" title="Battute: ${r.serve.total} · In campo: ${r.serve.servesIn} · Errori: ${r.serve.serveErrors}">
                    <span class="mr-serie">${r.serve.serie}</span>
                    ${r.serve.pct !== null ? `<span class="mr-serve-pct">${r.serve.pct}% in</span>` : ''}
                </td>
            </tr>
        `).join('');
    },

    selectPlayer: function (playerId) {
        this.selectedPlayerId = this.selectedPlayerId === playerId ? null : playerId;
        this.renderPlayersTable();
        this.renderPlayerChart();
    },

    renderPlayerChart: function () {
        const wrap = document.getElementById('playerChartCard');
        const canvas = document.getElementById('playerChart');
        if (!wrap || !canvas) return;

        if (!this.selectedPlayerId) {
            wrap.style.display = 'none';
            this.destroyChart('player');
            return;
        }
        const player = this.playerById(this.selectedPlayerId);
        if (!player) return;
        wrap.style.display = 'block';
        const title = document.getElementById('playerChartTitle');
        if (title) title.textContent = `#${player.number} ${player.name} — ${this.scope === 'all' ? 'tutta la partita' : 'Set ' + this.scope}`;

        const s = this.statsForScope(this.selectedPlayerId, this.scope);

        // Serve breakdown chips
        const chipsEl = document.getElementById('playerServeChips');
        if (chipsEl) {
            const sv = this.serveInfo(s);
            chipsEl.innerHTML = sv.total === 0
                ? '<span class="mr-chip">Nessuna battuta registrata</span>'
                : `
                    <span class="mr-chip">Serie: <strong>${sv.serie}</strong></span>
                    <span class="mr-chip mr-chip-us">In campo: <strong>${sv.servesIn}/${sv.total}${sv.pct !== null ? ` (${sv.pct}%)` : ''}</strong></span>
                    <span class="mr-chip mr-chip-them">Errori battuta: <strong>${sv.serveErrors}</strong></span>
                    <span class="mr-chip">Miglior serie: <strong>${sv.best}</strong></span>
                    <span class="mr-chip">Ace: <strong>${s.point_serve || 0}</strong></span>
                `;
        }

        const keys = [...this.POINT_KEYS, ...this.ERROR_KEYS].filter((k) => (s[k] || 0) > 0);
        const success = this.cssVar('--success') || '#1E8E5A';
        const danger = this.cssVar('--danger') || '#C0392B';
        const textMuted = this.cssVar('--text-muted') || '#888';
        const border = this.cssVar('--border') || '#ddd';

        this.destroyChart('player');
        this.charts.player = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: keys.map((k) => this.KEY_LABELS[k]),
                datasets: [{
                    data: keys.map((k) => s[k]),
                    backgroundColor: keys.map((k) => this.POINT_KEYS.includes(k) ? success : danger),
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { color: textMuted, precision: 0 }, grid: { color: border } },
                    y: { ticks: { color: textMuted }, grid: { display: false } }
                }
            }
        });
    },

    escapeHtml: function (text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, (m) => map[m]);
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MatchReport.init());
} else {
    MatchReport.init();
}
