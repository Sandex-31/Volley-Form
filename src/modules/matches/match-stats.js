/**
 * Match Stats Module
 * Handles UI interactions and real-time state synchronization for match statistics
 */

const MatchStats = {
    currentMatchId: null,
    stats: null,
    activeSubscriptionRef: null,

    /**
     * Open statistics tracker modal for a match
     */
    openModal: function(matchId, opponentName, matchDate) {
        this.currentMatchId = matchId;
        
        // Update header labels
        const opponentEl = document.getElementById('statsMatchOpponent');
        const dateEl = document.getElementById('statsMatchDate');
        if (opponentEl) opponentEl.textContent = `Match Stats vs ${opponentName}`;
        if (dateEl) dateEl.textContent = `Scheduled Date: ${matchDate}`;

        // Reset sync status indicator to Saved initially
        this.showSyncStatus('saved');

        // Subscribe to real-time stats updates
        if (this.activeSubscriptionRef) {
            FirebaseService.unsubscribe(this.activeSubscriptionRef);
        }

        // Show loading state in the counters first
        this.updateUI(MatchService.getDefaultStats());

        this.activeSubscriptionRef = MatchService.subscribeToMatchStats(matchId, (stats) => {
            this.stats = stats;
            this.updateUI(this.stats);
        });

        // Display Modal
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Disable background scrolling
        }

        // Add window close listener when clicking outside
        window.addEventListener('click', this.handleOutsideClick);
        Logger.info(`Opened stats tracker for match ${matchId}`);
    },

    /**
     * Close statistics tracker modal
     */
    closeModal: function() {
        // Unsubscribe from real-time database listener
        if (this.activeSubscriptionRef) {
            FirebaseService.unsubscribe(this.activeSubscriptionRef);
            this.activeSubscriptionRef = null;
        }

        // Hide Modal
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Restore background scrolling
        }

        window.removeEventListener('click', this.handleOutsideClick);
        this.currentMatchId = null;
        this.stats = null;
        Logger.info('Closed stats tracker modal');
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
     * Update counter displays and button enabled/disabled states in the UI
     */
    updateUI: function(stats) {
        if (!stats) return;

        Object.keys(stats).forEach(key => {
            const valueEl = document.getElementById(`val-${key}`);
            if (valueEl) {
                valueEl.textContent = stats[key];
            }

            // Disable minus button if stat is 0
            const row = valueEl ? valueEl.closest('.stats-row') : null;
            const minusBtn = row ? row.querySelector('.btn-counter-minus') : null;
            if (minusBtn) {
                minusBtn.disabled = stats[key] <= 0;
            }
        });
    },

    /**
     * Increment specific stat category
     */
    increment: async function(statKey) {
        if (!this.stats || !this.currentMatchId) return;

        this.showSyncStatus('syncing');
        
        // Optimistic UI update
        this.stats[statKey] = (this.stats[statKey] || 0) + 1;
        this.updateUI(this.stats);

        const success = await MatchService.saveMatchStats(this.currentMatchId, this.stats);
        if (success) {
            this.showSyncStatus('saved');
        } else {
            UIService.showMessage('Failed to save stats, retrying...', 'error');
            this.showSyncStatus('saved'); // reset dot color
        }
    },

    /**
     * Decrement specific stat category
     */
    decrement: async function(statKey) {
        if (!this.stats || !this.currentMatchId) return;
        if ((this.stats[statKey] || 0) <= 0) return;

        this.showSyncStatus('syncing');
        
        // Optimistic UI update
        this.stats[statKey] = this.stats[statKey] - 1;
        this.updateUI(this.stats);

        const success = await MatchService.saveMatchStats(this.currentMatchId, this.stats);
        if (success) {
            this.showSyncStatus('saved');
        } else {
            UIService.showMessage('Failed to save stats, retrying...', 'error');
            this.showSyncStatus('saved'); // reset dot color
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
    }
};
