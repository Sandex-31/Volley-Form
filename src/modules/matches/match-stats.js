/**
 * Match Stats Module
 * Handles UI interactions and real-time state synchronization for player-specific match statistics
 */

const MatchStats = {
    currentMatchId: null,
    allPlayerStats: {},
    activeSubscriptionRef: null,

    /**
     * Open statistics tracker modal for a match
     */
    openModal: function(matchId, opponentName, matchDate) {
        this.currentMatchId = matchId;
        this.allPlayerStats = {};
        
        // Update header labels
        const opponentEl = document.getElementById('statsMatchOpponent');
        const dateEl = document.getElementById('statsMatchDate');
        if (opponentEl) opponentEl.textContent = `Match Stats vs ${opponentName}`;
        if (dateEl) dateEl.textContent = `Date: ${matchDate}`;

        // Render roster table rows initially with 0 stats
        this.renderRosterTable();

        // Show sync status
        this.showSyncStatus('saved');

        // Unsubscribe from any previous subscription
        this.unsubscribeActive();

        // Subscribe to Firebase real-time updates for all player stats in this match
        this.activeSubscriptionRef = MatchService.subscribeToAllMatchStats(
            this.currentMatchId,
            (allStats) => {
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
        Logger.info(`Opened stats spreadsheet window for match ${matchId}`);
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
                <td style="text-align: center; border-left: 2px solid #3a4560; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'service_under_net')}
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'service_out')}
                </td>
                <td style="text-align: center; border-right: 2px solid #3a4560; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'service_net')}
                </td>
                
                <!-- Fouls -->
                <td style="text-align: center; border-right: 2px solid #3a4560; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'foul')}
                </td>
                
                <!-- Points Made -->
                <td style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'point_spike')}
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'point_block')}
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'point_lob')}
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    ${this.createCounterHtml(player.id, 'point_random')}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    /**
     * Helper to render compact counter buttons and value element
     */
    createCounterHtml: function(playerId, statKey) {
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
    },

    /**
     * Update UI counters for a single player row
     */
    updatePlayerRowUI: function(playerId, stats) {
        if (!stats) return;

        Object.keys(stats).forEach(key => {
            const valueEl = document.getElementById(`val-${playerId}-${key}`);
            if (valueEl) {
                valueEl.textContent = stats[key];
            }

            // Disable minus button if stat is 0
            const row = valueEl ? valueEl.closest('.stats-counter-compact') : null;
            const minusBtn = row ? row.querySelector('.btn-counter-compact') : null;
            if (minusBtn) {
                minusBtn.disabled = stats[key] <= 0;
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

        const success = await MatchService.saveMatchStats(this.currentMatchId, playerId, stats);
        if (success) {
            this.showSyncStatus('saved');
        } else {
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

        const success = await MatchService.saveMatchStats(this.currentMatchId, playerId, stats);
        if (success) {
            this.showSyncStatus('saved');
        } else {
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
        const syncStatusEl = document.getElementById('statsSyncStatus');
        const syncTextEl = document.getElementById('syncText');
        if (!syncStatusEl || !syncTextEl) return;

        if (status === 'syncing') {
            syncStatusEl.className = 'stats-sync-status syncing';
            syncTextEl.textContent = 'Syncing...';
        } else {
            syncStatusEl.className = 'stats-sync-status saved';
            syncTextEl.textContent = 'Saved to Database';
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
