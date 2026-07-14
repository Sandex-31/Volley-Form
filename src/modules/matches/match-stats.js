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
        
        // Update header labels
        const opponentEl = document.getElementById('statsMatchOpponent');
        const dateEl = document.getElementById('statsMatchDate');
        if (opponentEl) {
            opponentEl.textContent = isReadOnly ? `Stats Review vs ${opponentName}` : `Match Stats vs ${opponentName}`;
        }
        if (dateEl) dateEl.textContent = `Date: ${matchDate}`;

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
                    <td colspan="9" style="text-align: center; color: #999; font-style: italic; padding: 20px;">
                        No players on team roster. Go to the "Players" tab to register players.
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
                        <span class="player-number" style="display: inline-flex; width: 28px; height: 28px; font-size: 12px; margin-right: 0; margin-bottom: 0; background: linear-gradient(135deg, #3a4560 0%, #4e5a7b 100%); flex-shrink: 0;">#${player.number}</span>
                        <div>
                            <div style="font-weight: 700; color: #f0f4f8; font-size: 13px;">${this.escapeHtml(player.name)}</div>
                            <div style="font-size: 10px; color: #8892b0; text-transform: uppercase; letter-spacing: 0.5px;">${player.role}</div>
                        </div>
                    </div>
                </td>
                
                <!-- Service Errors -->
                <td data-label="Out" style="text-align: center; border-left: 2px solid #3a4560; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'service_out')}
                </td>
                <td data-label="Net" style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'service_net')}
                </td>
                <td data-label="Streaks" style="text-align: center; vertical-align: middle;">
                    <span id="streaks-${player.id}" style="font-size: 12px; font-weight: 600; color: #f0f4f8; white-space: nowrap;">—</span>
                </td>
                <td data-label="Tot Service" style="text-align: center; border-right: 2px solid #3a4560; vertical-align: middle;">
                    <span id="total_service-${player.id}" class="stats-value-compact" style="font-size: 15px; font-weight: 700; color: #ff6b6b;">0</span>
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
                <td data-label="Tot Errors" style="text-align: center; border-right: 2px solid #3a4560; vertical-align: middle;">
                    <span id="total_errors-${player.id}" class="stats-value-compact" style="font-size: 15px; font-weight: 700; color: #ff6b6b;">0</span>
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
                <td data-label="Tot Points" style="text-align: center; border-left: 1px solid #3a4560; vertical-align: middle;">
                    <span id="total_points-${player.id}" class="stats-value-compact" style="font-size: 15px; font-weight: 700; color: #69c896;">0</span>
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
            return `<span id="val-${playerId}-${statKey}" class="stats-value-compact" style="font-size: 15px; font-weight: 700; color: #f0f4f8;">0</span>`;
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
            const playerStats = this.allPlayerStats[player.id] || MatchService.getDefaultStats();
            this.updatePlayerRowUI(player.id, playerStats);
        });

        // If live modal is visible and roster view is active, update it
        const liveModal = document.getElementById('liveStatsModal');
        if (liveModal && liveModal.classList.contains('show')) {
            const rosterView = document.getElementById('liveRosterView');
            if (rosterView && rosterView.style.display !== 'none') {
                this.renderLiveRoster();
            }
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

        const streaksText = this.formatStreaks(stats);
        const streaksEl = document.getElementById(`streaks-${playerId}`);
        if (streaksEl) streaksEl.textContent = streaksText;
        const liveStreaksEl = document.getElementById(`live-streaks-${playerId}`);
        if (liveStreaksEl) liveStreaksEl.textContent = streaksText === '—' ? '' : `Streaks: ${streaksText}`;

        Object.keys(stats).forEach(key => {
            if (key === 'serve_streaks') return; // array, rendered above
            const valueEl = document.getElementById(`val-${playerId}-${key}`);
            if (valueEl) {
                valueEl.textContent = stats[key];
            }

            // Also update live tracker element if it exists in the DOM
            const liveValueEl = document.getElementById(`live-val-${playerId}-${key}`);
            if (liveValueEl) {
                liveValueEl.textContent = stats[key];
            }

            // Disable minus button if stat is 0
            const row = valueEl ? valueEl.closest('.stats-counter-compact') : null;
            const minusBtn = row ? row.querySelector('.btn-counter-compact') : null;
            if (minusBtn) {
                minusBtn.disabled = stats[key] <= 0;
            }

            // Disable live minus button if stat is 0
            const liveMinusBtn = document.getElementById(`live-btn-minus-${playerId}-${key}`);
            if (liveMinusBtn) {
                liveMinusBtn.disabled = stats[key] <= 0;
            }
        });
    },

    /**
     * Increment specific stat category for a player
     */
    increment: async function(playerId, statKey) {
        if (!this.currentMatchId || !playerId) return;

        this.showSyncStatus('syncing');
        
        if (!this.allPlayerStats[playerId]) {
            this.allPlayerStats[playerId] = MatchService.getDefaultStats();
        }

        const stats = this.allPlayerStats[playerId];
        stats[statKey] = (stats[statKey] || 0) + 1;

        // Optimistic UI update
        this.updatePlayerRowUI(playerId, stats);

        // Atomic server-side increment
        const success = await MatchService.incrementStat(this.currentMatchId, playerId, statKey, 1);
        if (success) {
            // Serve streak bookkeeping: an ace extends the streak,
            // a service error closes it (records it) and resets to 0.
            if (statKey === 'point_serve') {
                stats.serve_streak = (stats.serve_streak || 0) + 1;
                this.updatePlayerRowUI(playerId, stats);
                await MatchService.incrementStat(this.currentMatchId, playerId, 'serve_streak', 1);
            } else if (statKey === 'service_out' || statKey === 'service_net') {
                const streaks = this.getClosedStreaks(stats);
                streaks.push(stats.serve_streak || 0);
                stats.serve_streaks = streaks;
                stats.serve_streak = 0;
                this.updatePlayerRowUI(playerId, stats);
                await MatchService.updateStats(this.currentMatchId, playerId, { serve_streaks: streaks, serve_streak: 0 });
            }
            this.showSyncStatus('saved');
        } else {
            // Roll back the optimistic update if the write failed.
            stats[statKey] = Math.max(0, (stats[statKey] || 0) - 1);
            this.updatePlayerRowUI(playerId, stats);
            UIService.showMessage('Failed to save stats', 'error');
            this.showSyncStatus('saved'); // reset dot
        }
    },

    /**
     * Decrement specific stat category for a player
     */
    decrement: async function(playerId, statKey) {
        if (!this.currentMatchId || !playerId) return;
        
        const stats = this.allPlayerStats[playerId] || MatchService.getDefaultStats();
        if ((stats[statKey] || 0) <= 0) return;

        this.showSyncStatus('syncing');
        
        stats[statKey] = stats[statKey] - 1;

        // Optimistic UI update
        this.updatePlayerRowUI(playerId, stats);

        // Atomic server-side decrement
        const success = await MatchService.incrementStat(this.currentMatchId, playerId, statKey, -1);
        if (success) {
            // Inverse serve streak bookkeeping (undo a mis-tap)
            if (statKey === 'point_serve' && (stats.serve_streak || 0) > 0) {
                stats.serve_streak = stats.serve_streak - 1;
                this.updatePlayerRowUI(playerId, stats);
                await MatchService.incrementStat(this.currentMatchId, playerId, 'serve_streak', -1);
            } else if (statKey === 'service_out' || statKey === 'service_net') {
                const streaks = this.getClosedStreaks(stats);
                if (streaks.length > 0) {
                    const restored = streaks.pop();
                    stats.serve_streaks = streaks;
                    stats.serve_streak = (stats.serve_streak || 0) + restored;
                    this.updatePlayerRowUI(playerId, stats);
                    await MatchService.updateStats(this.currentMatchId, playerId, { serve_streaks: streaks, serve_streak: stats.serve_streak });
                }
            }
            this.showSyncStatus('saved');
        } else {
            // Roll back the optimistic update if the write failed.
            stats[statKey] = (stats[statKey] || 0) + 1;
            this.updatePlayerRowUI(playerId, stats);
            UIService.showMessage('Failed to save stats', 'error');
            this.showSyncStatus('saved'); // reset dot
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
                textEl.textContent = 'View-Only Mode';
            } else if (status === 'syncing') {
                container.className = 'stats-sync-status syncing';
                textEl.textContent = 'Syncing...';
            } else {
                container.className = 'stats-sync-status saved';
                textEl.textContent = 'Saved to Database';
            }
        };

        updateEl(syncStatusEl, syncTextEl, false);
        updateEl(liveSyncStatusEl, liveSyncTextEl, true);
    },

    /**
     * Open live tracker modal
     */
    openLiveModal: function(matchId, opponentName, matchDate) {
        this.currentMatchId = matchId;
        this.allPlayerStats = {};
        this.currentLivePlayerId = null;
        this.isReadOnly = false; // Always editable in Live Mode

        // Update header labels in live tracker
        const opponentEl = document.getElementById('liveStatsMatchOpponent');
        const dateEl = document.getElementById('liveStatsMatchDate');
        if (opponentEl) opponentEl.textContent = `Live Stats vs ${opponentName}`;
        if (dateEl) dateEl.textContent = `Date: ${matchDate}`;

        // Reset display to show roster view first
        this.showLiveRoster();

        // Subscribe to Firebase real-time updates for all player stats in this match
        this.unsubscribeActive();
        const subscriptionMatchId = this.currentMatchId;
        this.activeSubscriptionRef = MatchService.subscribeToAllMatchStats(
            this.currentMatchId,
            (allStats) => {
                if (this.currentMatchId !== subscriptionMatchId) return;
                this.allPlayerStats = allStats || {};
                this.updateAllUI();
            }
        );

        // Display Live Modal
        const modal = document.getElementById('liveStatsModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Disable background scrolling
        }

        // Add window close listener when clicking outside
        window.addEventListener('click', this.handleOutsideClickLive);
        Logger.info(`Opened live stats tracker for match ${matchId}`);
    },

    /**
     * Show the roster list inside live stats modal
     */
    showLiveRoster: function() {
        this.currentLivePlayerId = null;
        
        const rosterView = document.getElementById('liveRosterView');
        const editView = document.getElementById('livePlayerEditView');
        const activePlayerIndicator = document.getElementById('liveActivePlayerIndicator');
        const mainHeader = document.getElementById('liveStatsModalHeader');
        
        if (rosterView) rosterView.style.display = 'flex';
        if (editView) editView.style.display = 'none';
        if (activePlayerIndicator) activePlayerIndicator.textContent = '';
        if (mainHeader) mainHeader.style.display = 'block';

        this.renderLiveRoster();
        this.showSyncStatus('saved');
    },

    /**
     * Render the roster grid cards
     */
    renderLiveRoster: function() {
        const grid = document.getElementById('liveRosterGrid');
        if (!grid) return;

        grid.innerHTML = '';
        const players = PlayerService.getPlayersList();

        if (players.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #999; font-style: italic; padding: 20px;">
                    No players on roster. Go to the "Players" tab to register players.
                </div>
            `;
            return;
        }

        players.forEach(player => {
            const card = document.createElement('div');
            card.className = 'live-player-card';
            card.onclick = () => this.selectPlayerForLiveEdit(player.id);

            // Compute total errors & points for this player to show a summary
            const stats = this.allPlayerStats[player.id] || MatchService.getDefaultStats();
            const totalPoints = (stats.point_serve || 0) + (stats.point_spike || 0) + (stats.point_block || 0) + (stats.point_lob || 0) + (stats.point_random || 0);
            const totalErrors = (stats.service_out || 0) + (stats.service_net || 0) + (stats.foul || 0) + (stats.error_grave || 0) + (stats.error_block || 0) + (stats.error_receive || 0) + (stats.error_set || 0) + (stats.error_defense || 0);

            card.innerHTML = `
                <span class="player-number-badge">#${player.number}</span>
                <span class="player-name">${this.escapeHtml(player.name)}</span>
                <span class="player-role">${player.role}</span>
                <div style="display: flex; gap: 8px; margin-top: 4px; font-size: 10px;">
                    <span style="color: #69c896; font-weight: 700;">🔥 ${totalPoints} Pt</span>
                    <span style="color: #ff6b6b; font-weight: 700;">⚠️ ${totalErrors} Er</span>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    /**
     * Switch panel to edit stats for a specific player
     */
    selectPlayerForLiveEdit: function(playerId) {
        const player = PlayerService.getPlayersList().find(p => p.id === playerId);
        if (!player) return;

        this.currentLivePlayerId = playerId;

        const rosterView = document.getElementById('liveRosterView');
        const editView = document.getElementById('livePlayerEditView');
        const activePlayerIndicator = document.getElementById('liveActivePlayerIndicator');
        const mainHeader = document.getElementById('liveStatsModalHeader');
        
        if (rosterView) rosterView.style.display = 'none';
        if (editView) editView.style.display = 'flex';
        if (activePlayerIndicator) activePlayerIndicator.textContent = `Active: #${player.number} ${player.name}`;
        if (mainHeader) mainHeader.style.display = 'none';

        // Set header elements
        const nameEl = document.getElementById('livePlayerName');
        const numberEl = document.getElementById('livePlayerNumber');
        const roleEl = document.getElementById('livePlayerRole');
        
        if (nameEl) nameEl.textContent = player.name;
        if (numberEl) numberEl.textContent = `#${player.number}`;
        if (roleEl) roleEl.textContent = player.role;

        // Render counters for this player
        this.renderLiveCounters(playerId);
        
        // Update values in the counters
        const stats = this.allPlayerStats[playerId] || MatchService.getDefaultStats();
        this.updatePlayerRowUI(playerId, stats);
        this.showSyncStatus('saved');
    },

    /**
     * Render the counters UI for the active player
     */
    renderLiveCounters: function(playerId) {
        const container = document.getElementById('livePlayerStatsContainer');
        if (!container) return;

        container.innerHTML = `
            <!-- Service Section -->
            <div class="live-stat-group srv-errors">
                <div class="live-stat-group-title">🏐 Service</div>
                <div class="live-counter-grid">
                    ${this.createLiveCounterTileHtml(playerId, 'serve_streak', 'Serve In (streak)')}
                    ${this.createLiveCounterTileHtml(playerId, 'service_out', 'Service Out')}
                    ${this.createLiveCounterTileHtml(playerId, 'service_net', 'Service Net')}
                </div>
                <div id="live-streaks-${playerId}" style="font-size: 11px; color: var(--text-muted, #8892b0); padding: 4px 2px 0; text-align: center;"></div>
            </div>

            <!-- Errors & Fouls Section -->
            <div class="live-stat-group fouls">
                <div class="live-stat-group-title">⚠️ Errors & Fouls</div>
                <div class="live-counter-grid">
                    ${this.createLiveCounterTileHtml(playerId, 'foul', 'Foul / Net')}
                    ${this.createLiveCounterTileHtml(playerId, 'error_grave', 'Grave Err')}
                    ${this.createLiveCounterTileHtml(playerId, 'error_block', 'Block Err')}
                    ${this.createLiveCounterTileHtml(playerId, 'error_receive', 'Rec Err')}
                    ${this.createLiveCounterTileHtml(playerId, 'error_set', 'Set Err')}
                    ${this.createLiveCounterTileHtml(playerId, 'error_defense', 'Def Err')}
                </div>
            </div>

            <!-- Points Made Section -->
            <div class="live-stat-group points">
                <div class="live-stat-group-title">🔥 Points Made</div>
                <div class="live-counter-grid">
                    ${this.createLiveCounterTileHtml(playerId, 'point_serve', 'Serve Pt')}
                    ${this.createLiveCounterTileHtml(playerId, 'point_spike', 'Spike Pt')}
                    ${this.createLiveCounterTileHtml(playerId, 'point_block', 'Block Pt')}
                    ${this.createLiveCounterTileHtml(playerId, 'point_lob', 'Lob Pt')}
                    ${this.createLiveCounterTileHtml(playerId, 'point_random', 'Random Pt')}
                </div>
            </div>
        `;
    },

    /**
     * Helper to render a live tracker counter tile (grid cell)
     */
    createLiveCounterTileHtml: function(playerId, statKey, label) {
        return `
            <div class="live-counter-tile">
                <span class="live-counter-tile-label" title="${label}">${label}</span>
                <div class="live-counter-tile-controls">
                    <button id="live-btn-minus-${playerId}-${statKey}" class="btn-live-counter-tile btn-live-counter-tile-minus" onclick="MatchStats.decrement('${playerId}', '${statKey}')">-</button>
                    <span id="live-val-${playerId}-${statKey}" class="live-counter-tile-value">0</span>
                    <button class="btn-live-counter-tile btn-live-counter-tile-plus" onclick="MatchStats.increment('${playerId}', '${statKey}')">+</button>
                </div>
            </div>
        `;
    },

    /**
     * Close live tracker modal
     */
    closeLiveModal: function() {
        this.unsubscribeActive();

        // Hide Modal
        const modal = document.getElementById('liveStatsModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Restore background scrolling
        }

        window.removeEventListener('click', this.handleOutsideClickLive);
        this.currentMatchId = null;
        this.allPlayerStats = {};
        this.currentLivePlayerId = null;
        Logger.info('Closed live stats tracker modal');
    },

    /**
     * Handle live modal closing when clicking outside the modal box
     */
    handleOutsideClickLive: function(event) {
        const modal = document.getElementById('liveStatsModal');
        if (event.target === modal) {
            MatchStats.closeLiveModal();
        }
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
