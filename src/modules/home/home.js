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
                    <div style="grid-column: 1/-1; padding: 20px; text-align: center; color: #8892b0; font-style: italic;">
                        No squad players registered yet. 
                        <a href="players.html" style="color: #5b7cfa; text-decoration: none; font-weight: 600; margin-left: 5px;">Register players →</a>
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
                moreCard.className = 'player-preview-card';
                moreCard.style.textDecoration = 'none';
                moreCard.style.justifyContent = 'center';
                moreCard.style.borderStyle = 'dashed';
                moreCard.style.borderColor = '#4a5575';
                
                moreCard.innerHTML = `
                    <div style="font-size: 20px; color: #5b7cfa; margin-bottom: 5px; font-weight: bold;">+${players.length - 5}</div>
                    <div style="font-size: 12px; font-weight: 600; color: #8892b0;">More Players</div>
                    <div style="font-size: 10px; color: #5b7cfa; margin-top: 5px;">View Roster →</div>
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
                    <div style="padding: 20px; text-align: center; color: #8892b0; font-style: italic; border: 1px solid #3a4560; border-radius: 8px; background: #1f2635;">
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
                        <div style="font-size: 11px; font-weight: 700; color: #748ffc; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">${titleText}</div>
                        <h4>vs ${this.escapeHtml(targetMatch.opponent)}</h4>
                        <p>📅 ${dateDisplay} &nbsp;|&nbsp; 📍 ${locText}</p>
                        ${targetMatch.status !== 'Upcoming' ? `<p style="margin-top: 5px; color: #f0f4f8;">Score: <strong>${targetMatch.score}</strong> (${targetMatch.sets})</p>` : ''}
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
