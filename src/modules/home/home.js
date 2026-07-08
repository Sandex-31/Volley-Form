/**
 * Home Module
 * Controls the team landing page dashboard rendering roster preview and upcoming match
 */

const HomeModule = {
    /**
     * Initialize Home module
     */
    init: function() {
        if (!FirebaseService.isReady()) {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.loadRosterPreview();
        this.loadNextMatchPreview();
        Logger.info('Home module dashboard initialized');
    },

    /**
     * Load players list and display a preview of the squad roster
     */
    loadRosterPreview: function() {
        PlayerService.subscribeToPlayers((players) => {
            const grid = document.getElementById('rosterPreviewGrid');
            if (!grid) return;

            grid.innerHTML = '';

            if (!players || players.length === 0) {
                grid.innerHTML = `
                    <div class="preview-empty">
                        No squad players registered yet.
                        <a href="players.html" class="preview-link">Register players →</a>
                    </div>
                `;
                return;
            }

            // Preview the first 5 players
            const previewList = players.slice(0, 5);

            previewList.forEach(player => {
                const card = document.createElement('div');
                card.className = 'player-preview-card';

                // Role badge class
                let roleClass = 'role-setter';
                const role = player.role || 'Setter';
                if (role === 'Banda') roleClass = 'role-banda';
                else if (role === 'Opposite') roleClass = 'role-opposite';
                else if (role === 'Centrale') roleClass = 'role-centrale';
                else if (role === 'Libero') roleClass = 'role-libero';

                card.innerHTML = `
                    <div class="jersey">#${player.number}</div>
                    <div class="name" title="${this.escapeHtml(player.name)}">${this.escapeHtml(player.name)}</div>
                    <div class="role ${roleClass}">${role}</div>
                `;
                grid.appendChild(card);
            });

            // If there are more than 5 players, add a "View All" card link
            if (players.length > 5) {
                const moreCard = document.createElement('a');
                moreCard.href = 'players.html';
                moreCard.className = 'player-preview-card more';

                moreCard.innerHTML = `
                    <div class="more-count">+${players.length - 5}</div>
                    <div class="more-label">More Players</div>
                    <div class="more-link">View Roster →</div>
                `;
                grid.appendChild(moreCard);
            }
        });
    },

    /**
     * Find and load the next upcoming match, or show the latest match results
     */
    loadNextMatchPreview: function() {
        MatchService.subscribeToMatches((matches) => {
            const container = document.getElementById('matchPreviewContainer');
            if (!container) return;

            container.innerHTML = '';

            if (!matches || matches.length === 0) {
                container.innerHTML = `
                    <div class="preview-empty">
                        No matches scheduled yet.
                    </div>
                `;
                return;
            }

            // Find next upcoming match (upcoming are sorted by date desc in subscription, let's reverse to find closest upcoming)
            // Or look for any match with status "Upcoming"
            const upcomingMatches = matches.filter(m => m.status === 'Upcoming')
                                           .sort((a, b) => new Date(a.date) - new Date(b.date)); // closest first

            let targetMatch = null;
            let titleText = '📅 NEXT APPOINTMENT';

            if (upcomingMatches.length > 0) {
                targetMatch = upcomingMatches[0];
            } else {
                // If no upcoming matches, show the latest completed match
                targetMatch = matches[0]; // matches are sorted date desc
                titleText = '🏆 LATEST RESULT';
            }

            // Format date
            let dateDisplay = targetMatch.date;
            try {
                const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
                dateDisplay = new Date(targetMatch.date).toLocaleDateString('en-US', options);
            } catch (e) {}

            const isHome = targetMatch.location === 'Home';
            const locText = isHome ? 'Home Arena' : `Away @ ${targetMatch.opponent}`;
            const locClass = isHome ? 'loc-home' : 'loc-away';

            let statusBadgeClass = 'badge-upcoming';
            if (targetMatch.status === 'Won') statusBadgeClass = 'badge-won';
            else if (targetMatch.status === 'Lost') statusBadgeClass = 'badge-lost';

            container.innerHTML = `
                <div class="match-preview-card">
                    <div class="match-preview-info">
                        <div class="match-preview-kicker">${titleText}</div>
                        <h4>vs ${this.escapeHtml(targetMatch.opponent)}</h4>
                        <p>📅 ${dateDisplay} &nbsp;|&nbsp; 📍 ${locText}</p>
                        ${targetMatch.status !== 'Upcoming' ? `<p style="margin-top: 5px;">Score: <strong>${targetMatch.score}</strong> (${targetMatch.sets})</p>` : ''}
                    </div>
                    <span class="badge ${statusBadgeClass}">${targetMatch.status}</span>
                </div>
            `;
        });
    },

    /**
     * Escape HTML helper
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
    document.addEventListener('DOMContentLoaded', () => HomeModule.init());
} else {
    HomeModule.init();
}
