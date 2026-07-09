/**
 * Match Manager Module
 * Manages matches table rendering, modal actions, and CRUD operations
 */

const MatchManager = {
    isAdmin: false,
    matchesList: [],

    /**
     * Initialize matches list manager
     */
    init: function() {
        // Wait for Firebase to be ready
        if (!FirebaseService.isReady()) {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.checkAdminStatus();
        this.loadMatches();

        // Subscribe to players roster so it is synchronized for the statistics modal selector
        PlayerService.subscribeToPlayers((players) => {
            Logger.info(`Synced ${players.length} players to MatchManager`);
            
            // If the stats modal is open, dynamically update the dropdown
            const modal = document.getElementById('statsModal');
            if (modal && modal.classList.contains('show')) {
                MatchStats.populatePlayerDropdown();
            }
        });

        Logger.info('Match manager module initialized');
    },

    /**
     * Check if admin session is active
     */
    checkAdminStatus: function() {
        this.isAdmin = StorageService.hasItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN);
        
        // Show or hide admin actions
        const adminActions = document.getElementById('matchAdminActions');
        if (adminActions) {
            adminActions.style.display = this.isAdmin ? 'flex' : 'none';
        }
    },

    /**
     * Subscribe to matches updates in Firebase
     */
    loadMatches: function() {
        MatchService.subscribeToMatches((matches) => {
            this.matchesList = matches;
            this.renderMatches(matches);
        });
    },

    /**
     * Render matches in the table
     */
    renderMatches: function(matches) {
        const tbody = document.getElementById('matchesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!matches || matches.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #999; font-style: italic; padding: 30px;">
                        No matches scheduled or recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        matches.forEach(match => {
            const tr = document.createElement('tr');

            // Format date for display (e.g. 2026-06-24 -> Jun 24, 2026)
            let dateDisplay = match.date;
            try {
                const options = { month: 'short', day: 'numeric', year: 'numeric' };
                dateDisplay = new Date(match.date).toLocaleDateString('en-US', options);
            } catch (e) {
                // Keep original
            }

            const isHome = match.location === 'Home';
            const locIcon = isHome ? '🏠 Home' : '🚌 Away';
            const locClass = isHome ? 'loc-home' : 'loc-away';

            // Resolve status badge class
            let statusBadge = 'badge-upcoming';
            if (match.status === 'Won') statusBadge = 'badge-won';
            else if (match.status === 'Lost') statusBadge = 'badge-lost';

            let adminButtons = '';
            if (this.isAdmin) {
                adminButtons = `
                    <button class="btn-player-edit" onclick="MatchManager.openEditModal('${match.id}')" style="padding: 4px 8px; font-size: 11px; margin-left: 5px;">Edit</button>
                    <button class="btn-player-delete" onclick="MatchManager.deleteMatch('${match.id}', '${this.escapeQuote(match.opponent)}')" style="padding: 4px 8px; font-size: 11px; margin-left: 5px;">Delete</button>
                `;
            }

            let statsButtons = '';
            if (match.status === 'Upcoming') {
                statsButtons = `
                    <button class="btn-stats-trigger btn-live-tracker" onclick="MatchStats.openLiveModal('${match.id}', '${this.escapeQuote(match.opponent)}', '${this.escapeQuote(dateDisplay)}')">⏱️ Live Tracker</button>
                    <button class="btn-stats-trigger" onclick="MatchStats.openModal('${match.id}', '${this.escapeQuote(match.opponent)}', '${this.escapeQuote(dateDisplay)}', true)" style="margin-left: 5px;">📊 Review</button>
                `;
            } else {
                statsButtons = `
                    <button class="btn-stats-trigger btn-review-stats" onclick="MatchStats.openModal('${match.id}', '${this.escapeQuote(match.opponent)}', '${this.escapeQuote(dateDisplay)}', true)">📊 Review</button>
                    <button class="btn-stats-trigger" onclick="MatchStats.openLiveModal('${match.id}', '${this.escapeQuote(match.opponent)}', '${this.escapeQuote(dateDisplay)}')" style="margin-left: 5px;">⏱️ Edit Stats</button>
                `;
            }

            const lineupButton = `
                <button class="btn-stats-trigger" onclick="MatchLineups.openModal('${match.id}', '${this.escapeQuote(match.opponent)}', '${this.escapeQuote(dateDisplay)}')" style="margin-left: 5px;">🔄 Lineup</button>
            `;

            tr.innerHTML = `
                <td><span class="match-date">${dateDisplay}</span></td>
                <td><span class="opponent-name">${this.escapeHtml(match.opponent)}</span></td>
                <td><span class="loc-badge ${locClass}">${locIcon}</span></td>
                <td>
                    <span class="score-main">${this.escapeHtml(match.score)}</span>
                    <span class="score-details">${this.escapeHtml(match.sets)}</span>
                </td>
                <td><span class="badge ${statusBadge}">${match.status}</span></td>
                <td style="white-space: nowrap;">
                    ${statsButtons}
                    ${lineupButton}
                    ${adminButtons}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    /**
     * Open match creation modal
     */
    openAddModal: function() {
        document.getElementById('matchForm').reset();
        document.getElementById('editMatchId').value = '';
        document.getElementById('matchModalTitle').textContent = 'Add Match';
        
        const modal = document.getElementById('matchAdminModal');
        if (modal) {
            modal.classList.add('show');
        }
    },

    /**
     * Open match details editor modal
     */
    openEditModal: function(matchId) {
        const match = this.matchesList.find(m => m.id === matchId);
        if (!match) return;

        document.getElementById('editMatchId').value = match.id;
        document.getElementById('matchOpponent').value = match.opponent;
        document.getElementById('matchDate').value = match.date;
        document.getElementById('matchLocation').value = match.location;
        document.getElementById('matchScore').value = match.score;
        document.getElementById('matchStatus').value = match.status;
        document.getElementById('matchSets').value = match.sets;
        document.getElementById('matchModalTitle').textContent = 'Edit Match Details';

        const modal = document.getElementById('matchAdminModal');
        if (modal) {
            modal.classList.add('show');
        }
    },

    /**
     * Close match editor modal
     */
    closeModal: function() {
        const modal = document.getElementById('matchAdminModal');
        if (modal) {
            modal.classList.remove('show');
        }
        document.getElementById('matchForm').reset();
        document.getElementById('editMatchId').value = '';
    },

    /**
     * Save/Create match details in Firebase
     */
    handleFormSubmit: async function(event) {
        event.preventDefault();

        const id = document.getElementById('editMatchId').value;
        const opponent = document.getElementById('matchOpponent').value.trim();
        const date = document.getElementById('matchDate').value;
        const location = document.getElementById('matchLocation').value;
        const score = document.getElementById('matchScore').value.trim();
        const status = document.getElementById('matchStatus').value;
        const sets = document.getElementById('matchSets').value.trim();

        if (!opponent || !date || !location || !score || !status || !sets) {
            UIService.showMessage('Please fill in all fields', 'error');
            return;
        }

        const matchData = {
            opponent,
            date,
            location,
            score,
            status,
            sets
        };

        if (id) {
            matchData.id = id;
        }

        const success = await MatchService.saveMatch(matchData);
        if (success) {
            UIService.showMessage(`✓ Match vs "${opponent}" saved!`, 'success');
            this.closeModal();
        } else {
            UIService.showMessage('✗ Failed to save match details', 'error');
        }
    },

    /**
     * Remove match from database
     */
    deleteMatch: async function(matchId, opponentName) {
        if (!confirm(`Are you sure you want to remove the match vs "${opponentName}"? All logged player statistics for this match will also be permanently deleted.`)) {
            return;
        }

        const success = await MatchService.deleteMatch(matchId);
        if (success) {
            UIService.showMessage(`✓ Match vs "${opponentName}" removed`, 'success');
        } else {
            UIService.showMessage('✗ Failed to remove match', 'error');
        }
    },

    /**
     * Escape quotes for attributes
     */
    escapeQuote: function(str) {
        return str.replace(/'/g, "\\'");
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

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MatchManager.init());
} else {
    MatchManager.init();
}
