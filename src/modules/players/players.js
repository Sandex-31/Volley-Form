/**
 * Players Module
 * Manage user interactions and rendering for the Volleyball Player Roster
 */

const PlayersModule = {
    isAdmin: false,
    playersList: [],

    /**
     * Initialize Players Roster module
     */
    init: function() {
        // Wait for Firebase to be ready
        if (!FirebaseService.isReady()) {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.checkAdminStatus();
        this.loadRoster();
        Logger.info('Players module initialized');
    },

    /**
     * Check if admin session is active
     */
    checkAdminStatus: function() {
        this.isAdmin = StorageService.hasItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN);
        
        // Show or hide admin controls
        const adminActions = document.getElementById('playerAdminActions');
        if (adminActions) {
            adminActions.style.display = this.isAdmin ? 'flex' : 'none';
        }
    },

    /**
     * Load players list in real-time
     */
    loadRoster: function() {
        PlayerService.subscribeToPlayers((players) => {
            this.playersList = players;
            this.renderRoster(players);
        });
    },

    /**
     * Render player cards in grid
     */
    renderRoster: function(players) {
        const grid = document.getElementById('playersGrid');
        if (!grid) return;

        grid.innerHTML = '';

        if (!players || players.length === 0) {
            grid.innerHTML = '<p class="no-players">No players registered on the team roster yet.</p>';
            return;
        }

        players.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';

            // Resolve role style class
            let roleClass = 'role-setter';
            const role = player.role || 'Setter';
            if (role === 'Banda') roleClass = 'role-banda';
            else if (role === 'Opposite') roleClass = 'role-opposite';
            else if (role === 'Centrale') roleClass = 'role-centrale';
            else if (role === 'Libero') roleClass = 'role-libero';

            let actionHtml = '';
            if (this.isAdmin) {
                actionHtml = `
                    <div class="player-actions">
                        <button class="btn-player-edit" onclick="PlayersModule.openEditModal('${player.id}')">Edit</button>
                        <button class="btn-player-delete" onclick="PlayersModule.deletePlayer('${player.id}', '${this.escapeQuote(player.name)}')">Delete</button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="player-number">#${player.number}</div>
                <div class="player-name">${this.escapeHtml(player.name)}</div>
                <div class="role-badge ${roleClass}">${role}</div>
                ${actionHtml}
            `;
            grid.appendChild(card);
        });
    },

    /**
     * Open player creation modal
     */
    openAddModal: function() {
        document.getElementById('playerForm').reset();
        document.getElementById('editPlayerId').value = '';
        document.getElementById('playerModalTitle').textContent = 'Add Player';
        
        const modal = document.getElementById('playerAdminModal');
        if (modal) {
            modal.classList.add('show');
        }
    },

    /**
     * Open player details editor modal
     */
    openEditModal: function(playerId) {
        const player = this.playersList.find(p => p.id === playerId);
        if (!player) return;

        document.getElementById('editPlayerId').value = player.id;
        document.getElementById('playerName').value = player.name;
        document.getElementById('playerNumber').value = player.number;
        document.getElementById('playerRole').value = player.role;
        document.getElementById('playerModalTitle').textContent = 'Edit Player Details';

        const modal = document.getElementById('playerAdminModal');
        if (modal) {
            modal.classList.add('show');
        }
    },

    /**
     * Close player creation/edit modal
     */
    closeModal: function() {
        const modal = document.getElementById('playerAdminModal');
        if (modal) {
            modal.classList.remove('show');
        }
        document.getElementById('playerForm').reset();
        document.getElementById('editPlayerId').value = '';
    },

    /**
     * Save/Create player
     */
    handleFormSubmit: async function(event) {
        event.preventDefault();

        const id = document.getElementById('editPlayerId').value;
        const name = document.getElementById('playerName').value.trim();
        const number = document.getElementById('playerNumber').value;
        const role = document.getElementById('playerRole').value;

        if (!name || !number || !role) {
            UIService.showMessage('Please fill in all fields', 'error');
            return;
        }

        const playerData = {
            name,
            number: parseInt(number),
            role
        };

        if (id) {
            playerData.id = id;
        }

        const success = await PlayerService.savePlayer(playerData);
        if (success) {
            UIService.showMessage(`✓ Player "${name}" saved!`, 'success');
            this.closeModal();
        } else {
            UIService.showMessage('✗ Failed to save player', 'error');
        }
    },

    /**
     * Delete player from database
     */
    deletePlayer: async function(playerId, playerName) {
        if (!confirm(`Are you sure you want to remove "${playerName}" from the team roster?`)) {
            return;
        }

        const success = await PlayerService.deletePlayer(playerId);
        if (success) {
            UIService.showMessage(`✓ Player "${playerName}" removed`, 'success');
        } else {
            UIService.showMessage('✗ Failed to remove player', 'error');
        }
    },

    /**
     * Escape single quotes for inline JS attributes
     */
    escapeQuote: function(str) {
        return str.replace(/'/g, "\\'");
    },

    /**
     * Escape HTML string
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
    document.addEventListener('DOMContentLoaded', () => PlayersModule.init());
} else {
    PlayersModule.init();
}
