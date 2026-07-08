/**
 * Home Season Stats
 * Renders a small season summary (wins / losses / upcoming / win rate) on the
 * home "I numeri" pane, derived read-only from the live match data.
 * Presentation only — does not mutate any data.
 */
const HomeStats = {
    init: function () {
        if (typeof FirebaseService === 'undefined' || !FirebaseService.isReady()) {
            setTimeout(() => this.init(), 120);
            return;
        }
        if (typeof MatchService === 'undefined') { return; }

        MatchService.subscribeToMatches((matches) => {
            const el = document.getElementById('seasonStatsContainer');
            if (!el) return;

            matches = matches || [];
            const won = matches.filter(m => m.status === 'Won').length;
            const lost = matches.filter(m => m.status === 'Lost').length;
            const upcoming = matches.filter(m => m.status === 'Upcoming').length;
            const played = won + lost;
            const rate = played ? Math.round((won / played) * 100) : 0;

            el.innerHTML =
                this.tile('win', won, 'Vittorie') +
                this.tile('loss', lost, 'Sconfitte') +
                this.tile('', upcoming, 'In arrivo') +
                this.tile('rate', rate + '%', 'Win rate');
        });

        Logger && Logger.info && Logger.info('Home season stats initialized');
    },

    tile: function (variant, value, label) {
        return `
            <div class="stat-tile ${variant}">
                <div class="num">${value}</div>
                <div class="lbl">${label}</div>
            </div>`;
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HomeStats.init());
} else {
    HomeStats.init();
}
