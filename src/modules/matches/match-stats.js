/**
 * Match Stats Module
 * Handles UI interactions and real-time state synchronization for player-specific match statistics
 */

const MatchStats = {
    currentMatchId: null,
    allPlayerStats: {},
    activeSubscriptionRef: null,
    isReadOnly: false,
    currentLivePlayerId: null,
    viewSet: 'all', // 'all' or a set number; scope for displayed stats and live edits
    snapshotSeen: false,
    matchEvents: [],
    eventsSubscriptionRef: null,

    /**
     * Dummy function to satisfy match-manager.js player subscription callback.
     */
    populatePlayerDropdown: function() {},

    /**
     * Open statistics tracker modal for a match (Review/Table view)
     */
    openModal: function(matchId, opponentName, matchDate, isReadOnly = false) {
        this.isReadOnly = isReadOnly;
        this.currentMatchId = matchId;
        this.allPlayerStats = {};
        this.viewSet = 'all';
        this.snapshotSeen = false;
        
        // Update header labels
        const opponentEl = document.getElementById('statsMatchOpponent');
        const dateEl = document.getElementById('statsMatchDate');
        if (opponentEl) {
            opponentEl.textContent = isReadOnly ? `Statistiche contro ${opponentName}` : `Modifica statistiche contro ${opponentName}`;
        }
        if (dateEl) dateEl.textContent = matchDate;

        // Render roster table rows initially with 0 stats
        this.renderRosterTable();

        // Show sync status
        this.showSyncStatus('saved');

        // Unsubscribe from any previous subscription
        this.unsubscribeActive();

        // Subscribe to Firebase real-time updates for all player stats in this match
        const subscriptionMatchId = this.currentMatchId;
        this.activeSubscriptionRef = MatchService.subscribeToAllMatchStats(
            this.currentMatchId,
            (allStats) => {
                if (this.currentMatchId !== subscriptionMatchId) return;
                this.allPlayerStats = allStats || {};
                if (!this.snapshotSeen) {
                    this.snapshotSeen = true;
                    // Move legacy flat counters under sets/1 (subscription re-fires with clean data)
                    if (!this.isReadOnly) MatchService.migrateStatsToSets(subscriptionMatchId, this.allPlayerStats);
                }
                this.renderSetTabs();
                this.updateAllUI();
            }
        );

        // Display Modal
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Disable background scrolling
        }

        // Add window close listener when clicking outside
        window.addEventListener('click', this.handleOutsideClick);
        Logger.info(`Opened stats spreadsheet window for match ${matchId} (ReadOnly: ${isReadOnly})`);
    },

    /**
     * Render the table rows for all players on the roster
     */
    renderRosterTable: function() {
        const tbody = document.getElementById('statsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        const players = PlayerService.getPlayersList();

        if (players.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 20px;">
                        Nessun giocatore in rosa. Aggiungili dalla pagina Giocatori.
                    </td>
                </tr>
            `;
            return;
        }

        players.forEach(player => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-player-id', player.id);

            // Create the columns for Name and role, then 8 stat counters
            tr.innerHTML = `
                <td style="padding: 10px; text-align: left; vertical-align: middle;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="player-number" style="display: inline-flex; width: 28px; height: 28px; font-size: 12px; margin-right: 0; margin-bottom: 0; background: linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%); flex-shrink: 0;">#${player.number}</span>
                        <div>
                            <div style="font-weight: 700; color: var(--text); font-size: 13px;">${this.escapeHtml(player.name)}</div>
                            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">${PlayerService.roleLabel(player.role)}</div>
                        </div>
                    </div>
                </td>
                
                <!-- Service Errors -->
                <td data-label="Out" style="text-align: center; border-left: 2px solid var(--border-strong); vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'service_out')}
                </td>
                <td data-label="Net" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'service_net')}
                </td>
                <td data-label="Streaks" style="text-align: center; vertical-align: middle;">
                    <span id="streaks-${player.id}" style="font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap;">—</span>
                </td>
                <td data-label="Tot Service" style="text-align: center; border-right: 2px solid var(--border-strong); vertical-align: middle;">
                    <span id="total_service-${player.id}" class="stats-value-compact" style="font-size: 15px; font-weight: 700; color: var(--danger);">0</span>
                </td>
                
                <!-- Errors & Fouls -->
                <td data-label="Foul" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'foul')}
                </td>
                <td data-label="Grave Error" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'error_grave')}
                </td>
                <td data-label="Block Error" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'error_block')}
                </td>
                <td data-label="Receive Error" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'error_receive')}
                </td>
                <td data-label="Set Error" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'error_set')}
                </td>
                <td data-label="Defense Error" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'error_defense')}
                </td>
                <td data-label="Tot Errors" style="text-align: center; border-right: 2px solid var(--border-strong); vertical-align: middle;">
                    <span id="total_errors-${player.id}" class="stats-value-compact" style="font-size: 15px; font-weight: 700; color: var(--danger);">0</span>
                </td>
                
                <!-- Points Made -->
                <td data-label="Serve Point" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'point_serve')}
                </td>
                <td data-label="Spike" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'point_spike')}
                </td>
                <td data-label="Block" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'point_block')}
                </td>
                <td data-label="Lob" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'point_lob')}
                </td>
                <td data-label="Random" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'point_random')}
                </td>
                <td data-label="Tot Points" style="text-align: center; border-left: 1px solid var(--border-strong); vertical-align: middle;">
                    <span id="total_points-${player.id}" class="stats-value-compact" style="font-size: 15px; font-weight: 700; color: var(--success);">0</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    /**
     * Helper to render compact counter buttons and value element
     */
    createCounterHtml: function(playerId, statKey) {
        if (this.isReadOnly) {
            return `<span id="val-${playerId}-${statKey}" class="stats-value-compact" style="font-size: 15px; font-weight: 700; color: var(--text);">0</span>`;
        }
        return `
            <div class="stats-counter-compact">
                <button class="btn-counter-compact" onclick="MatchStats.decrement('${playerId}', '${statKey}')">-</button>
                <span id="val-${playerId}-${statKey}" class="stats-value-compact">0</span>
                <button class="btn-counter-compact btn-plus" onclick="MatchStats.increment('${playerId}', '${statKey}')">+</button>
            </div>
        `;
    },

    /**
     * Update UI counters for all players based on loaded database stats
     */
    updateAllUI: function() {
        const players = PlayerService.getPlayersList();
        players.forEach(player => {
            this.updatePlayerRowUI(player.id, this.scopedStats(player.id));
        });

        // If live modal is visible and roster view is active, update it
        const liveModal = document.getElementById('liveStatsModal');
        if (liveModal && liveModal.classList.contains('show')) {
            this.renderLiveRoster();
            this.renderLivePad();
        }
    },

    /**
     * Closed serve streaks as a plain array (Firebase may return arrays as keyed objects)
     */
    getClosedStreaks: function(stats) {
        const s = stats && stats.serve_streaks;
        return Array.isArray(s) ? s.slice() : Object.values(s || {});
    },

    /**
     * Human-readable streak history, e.g. "3 · 0 · 7 · (2)" — parentheses = streak still open
     */
    formatStreaks: function(stats) {
        const closed = this.getClosedStreaks(stats);
        const current = (stats && stats.serve_streak) || 0;
        if (closed.length === 0 && current === 0) return '—';
        const parts = closed.slice();
        if (current > 0) parts.push(`(${current})`);
        return parts.join(' · ');
    },

    /**
     * Set numbers holding data for any player, ascending
     */
    setsWithData: function() {
        const nums = new Set();
        Object.values(this.allPlayerStats || {}).forEach(raw => {
            Object.keys(MatchService.splitBySets(raw)).forEach(n => nums.add(Number(n)));
        });
        return [...nums].sort((a, b) => a - b);
    },

    /**
     * Stats for a player in the current view scope ('all' = whole match)
     */
    scopedStats: function(playerId) {
        const raw = this.allPlayerStats[playerId];
        if (this.viewSet === 'all') return MatchService.aggregateStats(raw);
        return MatchService.mergeStats(MatchService.splitBySets(raw)[this.viewSet], null);
    },

    /**
     * Local per-set stats object for the active set (created on demand, mutated optimistically)
     */
    setStatsFor: function(playerId) {
        const raw = this.allPlayerStats[playerId] = this.allPlayerStats[playerId] || {};
        raw.sets = raw.sets || {};
        return raw.sets[this.viewSet] = raw.sets[this.viewSet] || {};
    },

    /**
     * Switch the displayed set scope (review: 'all' | n, live: n)
     */
    selectSet: function(val) {
        this.viewSet = val === 'all' ? 'all' : Number(val);
        this.renderSetTabs();
        this.updateAllUI();
        this.updateLiveScore();
        if (this.currentLivePlayerId) {
            this.updatePlayerRowUI(this.currentLivePlayerId, this.scopedStats(this.currentLivePlayerId));
        }
    },

    /**
     * Derived score of the active set, shown in the live tracker score bar
     */
    updateLiveScore: function() {
        const usEl = document.getElementById('liveScoreUs');
        const themEl = document.getElementById('liveScoreThem');
        if (!usEl || !themEl) return;
        const steps = this.viewSet === 'all' ? [] : MatchService.scoreProgression(this.matchEvents, this.viewSet);
        const last = steps[steps.length - 1];
        usEl.textContent = last ? last.us : 0;
        themEl.textContent = last ? last.them : 0;
        // Serve goes to whoever won the last rally
        const board = document.getElementById('liveBoard');
        if (board) board.dataset.serve = last ? MatchService.eventTeam(last.event.key) : '';
        this.renderLiveFeed();
    },

    /**
     * Manual score events: 'opp_error' = their mistake (our point),
     * 'opp_point' = their winner (their point)
     */
    logOppEvent: async function(key) {
        if (!this.currentMatchId || this.viewSet === 'all') return;
        this.haptic();
        const ok = await this.track(MatchService.addMatchEvent(this.currentMatchId, { set: this.viewSet, playerId: null, key }));
        if (!ok) UIService.showMessage('Punto non salvato (permessi matchEvents?)', 'error');
    },

    /**
     * Undo the last manual score event of the active set
     */
    undoOppEvent: async function() {
        if (!this.currentMatchId || this.viewSet === 'all') return;
        const ok = await this.track(MatchService.removeLastMatchEvent(this.currentMatchId, { set: this.viewSet, playerId: null }));
        if (!ok) UIService.showMessage('Nessun punto manuale da annullare in questo set', 'error');
    },

    /**
     * Undo the most recent event of the active set, whoever it belongs to
     */
    undoLast: function() {
        const last = this.matchEvents.filter(e => Number(e.set) === Number(this.viewSet)).pop();
        if (!last) return;
        this.haptic();
        if (last.playerId) this.decrement(last.playerId, last.key);
        else this.undoOppEvent();
    },

    /**
     * Render set tabs in review ('Totale' + sets with data) and live (Set 1..5) modals
     */
    renderSetTabs: function() {
        const tab = (label, val) =>
            `<button type="button" class="lineup-tab${String(this.viewSet) === String(val) ? ' active' : ''}" onclick="MatchStats.selectSet('${val}')">${label}</button>`;
        const wrap = document.getElementById('statsSetTabs');
        if (wrap) {
            const nums = this.setsWithData();
            if (!nums.length) nums.push(1);
            wrap.innerHTML = tab('Totale', 'all') + nums.map(n => tab(`Set ${n}`, n)).join('');
        }
        const liveWrap = document.getElementById('liveSetTabs');
        if (liveWrap) {
            liveWrap.innerHTML = [1, 2, 3, 4, 5].map(n => tab(`Set ${n}`, n)).join('');
        }
    },

    /**
     * Update UI counters for a single player row
     */
    updatePlayerRowUI: function(playerId, stats) {
        if (!stats) return;

        const sectionTotals = {
            total_service: (stats.service_out || 0) + (stats.service_net || 0),
            total_errors: (stats.foul || 0) + (stats.error_grave || 0) + (stats.error_block || 0) + (stats.error_receive || 0) + (stats.error_set || 0) + (stats.error_defense || 0),
            total_points: (stats.point_serve || 0) + (stats.point_spike || 0) + (stats.point_block || 0) + (stats.point_lob || 0) + (stats.point_random || 0)
        };
        Object.keys(sectionTotals).forEach(key => {
            const el = document.getElementById(`${key}-${playerId}`);
            if (el) el.textContent = sectionTotals[key];
        });

        const streaksEl = document.getElementById(`streaks-${playerId}`);
        if (streaksEl) streaksEl.textContent = this.formatStreaks(stats);

        Object.keys(stats).forEach(key => {
            if (key === 'serve_streaks') return; // array, rendered above
            const valueEl = document.getElementById(`val-${playerId}-${key}`);
            if (!valueEl) return;
            valueEl.textContent = stats[key];
            // Disable minus button if stat is 0
            const row = valueEl.closest('.stats-counter-compact');
            const minusBtn = row ? row.querySelector('.btn-counter-compact') : null;
            if (minusBtn) minusBtn.disabled = stats[key] <= 0;
        });
    },

    /**
     * Increment specific stat category for a player
     */
    increment: async function(playerId, statKey) {
        if (!this.currentMatchId || !playerId) return;
        if (this.viewSet === 'all') {
            UIService.showMessage('Seleziona un set per modificare le statistiche', 'error');
            return;
        }

        const matchId = this.currentMatchId;
        const set = this.viewSet;
        const stats = this.setStatsFor(playerId);
        stats[statKey] = (stats[statKey] || 0) + 1;

        // All local bookkeeping happens now, at tap time, so rapid taps during a
        // rally keep their order even on a slow or offline connection.
        // Serve streak: an ace extends it, a service error closes (records) it.
        const writes = [MatchService.incrementStat(matchId, playerId, statKey, 1, set)];
        if (statKey === 'point_serve') {
            stats.serve_streak = (stats.serve_streak || 0) + 1;
            writes.push(MatchService.incrementStat(matchId, playerId, 'serve_streak', 1, set));
        } else if (statKey === 'service_out' || statKey === 'service_net') {
            const streaks = this.getClosedStreaks(stats);
            streaks.push(stats.serve_streak || 0);
            stats.serve_streaks = streaks;
            stats.serve_streak = 0;
            writes.push(MatchService.updateStats(matchId, playerId, { serve_streaks: streaks, serve_streak: 0 }, set));
        }
        // Timeline event — only while live tracking, so post-match table
        // corrections don't pollute the event chronology.
        if (this.eventsSubscriptionRef) {
            writes.push(MatchService.addMatchEvent(matchId, { set, playerId, key: statKey })
                .then(ok => { if (!ok) UIService.showMessage('Evento punteggio non salvato (permessi matchEvents?)', 'error'); return true; }));
        }

        this.updatePlayerRowUI(playerId, this.scopedStats(playerId));
        this.renderLiveRoster();
        this.renderLivePad();

        const ok = await this.track(writes[0]);
        if (!ok && this.currentMatchId === matchId) {
            // Roll back the optimistic counter if the main write failed.
            stats[statKey] = Math.max(0, (stats[statKey] || 0) - 1);
            this.updatePlayerRowUI(playerId, this.scopedStats(playerId));
            this.renderLiveRoster();
            this.renderLivePad();
            UIService.showMessage('Statistica non salvata', 'error');
        }
    },

    /**
     * Track an in-flight write in the sync indicator (counts concurrent writes)
     */
    pendingWrites: 0,
    track: async function(promise) {
        this.pendingWrites++;
        this.showSyncStatus('syncing');
        try {
            return await promise;
        } finally {
            this.pendingWrites = Math.max(0, this.pendingWrites - 1);
            if (this.pendingWrites === 0) this.showSyncStatus('saved');
        }
    },

    haptic: function() {
        if (navigator.vibrate) navigator.vibrate(12);
    },

    /**
     * Decrement specific stat category for a player
     */
    decrement: async function(playerId, statKey) {
        if (!this.currentMatchId || !playerId) return;
        if (this.viewSet === 'all') {
            UIService.showMessage('Seleziona un set per modificare le statistiche', 'error');
            return;
        }

        const stats = this.setStatsFor(playerId);
        if ((stats[statKey] || 0) <= 0) return;

        const matchId = this.currentMatchId;
        const set = this.viewSet;
        stats[statKey] = stats[statKey] - 1;

        // Inverse bookkeeping of increment(), applied locally at tap time
        const writes = [MatchService.incrementStat(matchId, playerId, statKey, -1, set)];
        if (statKey === 'point_serve' && (stats.serve_streak || 0) > 0) {
            stats.serve_streak = stats.serve_streak - 1;
            writes.push(MatchService.incrementStat(matchId, playerId, 'serve_streak', -1, set));
        } else if (statKey === 'service_out' || statKey === 'service_net') {
            const streaks = this.getClosedStreaks(stats);
            if (streaks.length > 0) {
                stats.serve_streak = (stats.serve_streak || 0) + streaks.pop();
                stats.serve_streaks = streaks;
                writes.push(MatchService.updateStats(matchId, playerId, { serve_streaks: streaks, serve_streak: stats.serve_streak }, set));
            }
        }
        // Undo the matching timeline event (only while live tracking)
        if (this.eventsSubscriptionRef) {
            writes.push(MatchService.removeLastMatchEvent(matchId, { set, playerId, key: statKey }));
        }

        this.updatePlayerRowUI(playerId, this.scopedStats(playerId));
        this.renderLiveRoster();
        this.renderLivePad();

        const ok = await this.track(writes[0]);
        if (!ok && this.currentMatchId === matchId) {
            stats[statKey] = (stats[statKey] || 0) + 1;
            this.updatePlayerRowUI(playerId, this.scopedStats(playerId));
            this.renderLiveRoster();
            this.renderLivePad();
            UIService.showMessage('Statistica non salvata', 'error');
        }
    },

    /**
     * Close statistics tracker modal
     */
    closeModal: function() {
        this.unsubscribeActive();

        // Hide Modal
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Restore background scrolling
        }

        window.removeEventListener('click', this.handleOutsideClick);
        this.currentMatchId = null;
        this.allPlayerStats = {};
        Logger.info('Closed stats tracker modal');
    },

    /**
     * Unsubscribe from active Firebase listener
     */
    unsubscribeActive: function() {
        if (this.activeSubscriptionRef) {
            FirebaseService.unsubscribe(this.activeSubscriptionRef);
            this.activeSubscriptionRef = null;
        }
    },

    /**
     * Handle modal closing when clicking outside the modal box
     */
    handleOutsideClick: function(event) {
        const modal = document.getElementById('statsModal');
        if (event.target === modal) {
            MatchStats.closeModal();
        }
    },

    /**
     * Update sync status display (syncing vs saved)
     */
    showSyncStatus: function(status) {
        // Desktop modal sync status elements
        const syncStatusEl = document.getElementById('statsSyncStatus');
        const syncTextEl = document.getElementById('syncText');
        
        // Live modal sync status elements
        const liveSyncStatusEl = document.getElementById('liveStatsSyncStatus');
        const liveSyncTextEl = document.getElementById('liveSyncText');

        const updateEl = (container, textEl, isLive) => {
            if (!container || !textEl) return;
            if (this.isReadOnly && !isLive) {
                container.className = 'stats-sync-status saved';
                textEl.textContent = 'Sola lettura';
            } else if (status === 'syncing') {
                container.className = 'stats-sync-status syncing';
                textEl.textContent = this.pendingWrites > 1 ? `Salvataggio… (${this.pendingWrites})` : 'Salvataggio…';
            } else {
                container.className = 'stats-sync-status saved';
                textEl.textContent = 'Tutto salvato';
            }
        };

        updateEl(syncStatusEl, syncTextEl, false);
        updateEl(liveSyncStatusEl, liveSyncTextEl, true);
    },

    /**
     * Live tracker action pad: one tap per event once a player is selected
     */
    LIVE_ACTIONS: [
        { group: 'point', title: 'Punto nostro', items: [
            ['point_spike', 'Attacco'], ['point_serve', 'Ace'], ['point_block', 'Muro'],
            ['point_lob', 'Pallonetto'], ['point_random', 'Altro']
        ] },
        { group: 'error', title: 'Errore nostro', items: [
            ['service_out', 'Battuta out'], ['service_net', 'Battuta in rete'], ['error_receive', 'Ricezione'],
            ['error_set', 'Alzata'], ['error_defense', 'Difesa'], ['error_block', 'Muro'],
            ['foul', 'Fallo / invasione'], ['error_grave', 'Errore grave']
        ] },
        { group: 'neutral', title: 'Senza punto', items: [
            ['serve_streak', 'Battuta dentro']
        ] }
    ],

    liveLabel: function(key) {
        if (key === 'opp_error') return 'Errore avversario';
        if (key === 'opp_point') return 'Punto avversario';
        for (const g of this.LIVE_ACTIONS) {
            const hit = g.items.find(([k]) => k === key);
            if (hit) return g.group === 'point' ? `Punto: ${hit[1]}` : g.group === 'error' ? `Errore: ${hit[1]}` : hit[1];
        }
        return key;
    },

    /**
     * Open live tracker modal
     */
    openLiveModal: function(matchId, opponentName, matchDate) {
        this.currentMatchId = matchId;
        this.allPlayerStats = {};
        this.currentLivePlayerId = null;
        this.isReadOnly = false; // Always editable in Live Mode
        this.viewSet = 1;
        this.snapshotSeen = false;
        this.pendingWrites = 0;
        this.matchEvents = [];
        this.renderSetTabs();

        const opponentEl = document.getElementById('liveStatsMatchOpponent');
        const dateEl = document.getElementById('liveStatsMatchDate');
        if (opponentEl) opponentEl.textContent = `Wapatanka vs ${opponentName}`;
        if (dateEl) dateEl.textContent = matchDate;

        this.renderLiveRoster();
        this.renderLivePad();
        this.updateLiveScore();
        this.showSyncStatus('saved');

        this.unsubscribeActive();
        const subscriptionMatchId = this.currentMatchId;
        this.activeSubscriptionRef = MatchService.subscribeToAllMatchStats(
            this.currentMatchId,
            (allStats) => {
                if (this.currentMatchId !== subscriptionMatchId) return;
                this.allPlayerStats = allStats || {};
                if (!this.snapshotSeen) {
                    this.snapshotSeen = true;
                    MatchService.migrateStatsToSets(subscriptionMatchId, this.allPlayerStats);
                    // Land on the set being played rather than always on set 1
                    const played = this.setsWithData();
                    if (played.length) this.viewSet = played[played.length - 1];
                    this.renderSetTabs();
                    this.updateLiveScore();
                }
                this.updateAllUI();
            }
        );

        // Live score + feed from the event stream
        this.eventsSubscriptionRef = MatchService.subscribeToMatchEvents(matchId, (events) => {
            if (this.currentMatchId !== subscriptionMatchId) return;
            this.matchEvents = events;
            this.updateLiveScore();
        });

        const modal = document.getElementById('liveStatsModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
        Logger.info(`Opened live stats tracker for match ${matchId}`);
    },

    /**
     * Player picker: jersey tiles with this set's points / errors tally
     */
    renderLiveRoster: function() {
        const grid = document.getElementById('liveRosterGrid');
        if (!grid) return;

        const players = PlayerService.getPlayersList().slice()
            .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
        if (players.length === 0) {
            grid.innerHTML = `<p class="lc-empty">Nessun giocatore in rosa. Aggiungili dalla pagina Giocatori.</p>`;
            return;
        }

        const sum = (s, keys) => keys.reduce((t, k) => t + (s[k] || 0), 0);
        const pointKeys = this.LIVE_ACTIONS[0].items.map(([k]) => k);
        const errorKeys = this.LIVE_ACTIONS[1].items.map(([k]) => k);

        grid.innerHTML = players.map(player => {
            const s = this.scopedStats(player.id);
            const selected = player.id === this.currentLivePlayerId;
            return `
                <button type="button" class="lc-player" aria-pressed="${selected}" onclick="MatchStats.selectLivePlayer('${player.id}')">
                    <span class="lc-player-num">${this.escapeHtml(String(player.number ?? ''))}</span>
                    <span class="lc-player-name">${this.escapeHtml(player.name || '')}</span>
                    <span class="lc-player-tally"><span class="pt">${sum(s, pointKeys)}</span><span class="er">${sum(s, errorKeys)}</span></span>
                </button>`;
        }).join('');
    },

    /**
     * Select (or deselect) the player the next actions are credited to.
     * Selection is sticky, so consecutive serves by the same player are one tap each.
     */
    selectLivePlayer: function(playerId) {
        this.currentLivePlayerId = this.currentLivePlayerId === playerId ? null : playerId;
        this.haptic();
        this.renderLiveRoster();
        this.renderLivePad();
    },

    /**
     * Action pad for the selected player, with their counts in the active set
     */
    renderLivePad: function() {
        const pad = document.getElementById('liveActionPad');
        if (!pad) return;

        const pid = this.currentLivePlayerId;
        const player = pid ? PlayerService.getPlayersList().find(p => p.id === pid) : null;
        const s = player ? this.scopedStats(pid) : {};

        const head = document.getElementById('livePadHead');
        if (head) {
            const streaks = player ? this.formatStreaks(s) : '—';
            head.innerHTML = player
                ? `<span class="lc-pad-num">${this.escapeHtml(String(player.number ?? ''))}</span>
                   <span class="lc-pad-who"><strong>${this.escapeHtml(player.name || '')}</strong><small>${this.escapeHtml(PlayerService.roleLabel(player.role))}${streaks !== '—' ? `, serie battute ${streaks}` : ''}</small></span>`
                : `<span class="lc-pad-hint">Tocca un giocatore, poi l'azione. Resta selezionato finché non ne scegli un altro.</span>`;
        }

        pad.innerHTML = this.LIVE_ACTIONS.map(g => `
            <div class="lc-group lc-group-${g.group}">
                <h3 class="lc-group-title">${g.title}</h3>
                <div class="lc-actions">
                    ${g.items.map(([key, label]) => `
                        <button type="button" class="lc-action" ${player ? '' : 'disabled'} onclick="MatchStats.liveAction('${key}')">
                            <span>${label}</span>
                            ${player ? `<span class="lc-count">${s[key] || 0}</span>` : ''}
                        </button>`).join('')}
                </div>
            </div>`).join('');
    },

    liveAction: function(key) {
        if (!this.currentLivePlayerId) return;
        this.haptic();
        this.increment(this.currentLivePlayerId, key);
    },

    /**
     * Last events of the active set, newest first, as saved in the database
     */
    renderLiveFeed: function() {
        const list = document.getElementById('liveFeed');
        const undoBtn = document.getElementById('liveUndoBtn');
        if (!list) return;

        const setEvents = this.matchEvents.filter(e => Number(e.set) === Number(this.viewSet));
        if (undoBtn) undoBtn.disabled = setEvents.length === 0;
        if (setEvents.length === 0) {
            list.innerHTML = `<li class="lc-feed-empty">Nessuna azione in questo set.</li>`;
            return;
        }

        const scoreAt = new Map(MatchService.scoreProgression(this.matchEvents, this.viewSet).map(st => [st.event, st]));
        const players = PlayerService.getPlayersList();
        list.innerHTML = setEvents.slice(-8).reverse().map(e => {
            const team = MatchService.eventTeam(e.key) || 'none';
            const st = scoreAt.get(e);
            const p = e.playerId ? players.find(x => x.id === e.playerId) : null;
            const who = p ? `#${this.escapeHtml(String(p.number ?? ''))} ${this.escapeHtml(p.name || '')}` : (e.playerId ? 'Giocatore rimosso' : 'Avversario');
            return `
                <li class="lc-feed-item" data-team="${team}">
                    <span class="lc-feed-score">${st ? `${st.us}–${st.them}` : ''}</span>
                    <span class="lc-feed-what">${this.liveLabel(e.key)}</span>
                    <span class="lc-feed-who">${who}</span>
                </li>`;
        }).join('');
    },

    /**
     * Close live tracker modal
     */
    closeLiveModal: function() {
        this.unsubscribeActive();
        if (this.eventsSubscriptionRef) {
            FirebaseService.unsubscribe(this.eventsSubscriptionRef);
            this.eventsSubscriptionRef = null;
        }
        this.matchEvents = [];

        const modal = document.getElementById('liveStatsModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }

        this.currentMatchId = null;
        this.allPlayerStats = {};
        this.currentLivePlayerId = null;
        Logger.info('Closed live stats tracker modal');
    },

    /**
     * Escape HTML output
     */
    escapeHtml: function(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
};
