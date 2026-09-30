/**
 * Exercise Display Module
 * Public page: upcoming trainings with their exercises + library by role
 */

const ExerciseDisplay = {
    library: {},
    days: [],
    sessions: {},
    role: EXERCISE_ROLES[0],

    init: function() {
        if (!FirebaseService.isReady()) {
            setTimeout(() => this.init(), 100);
            return;
        }
        document.getElementById('roleTabs').innerHTML = EXERCISE_ROLES.map(r =>
            `<button class="tr-tab" data-role="${r}" onclick="ExerciseDisplay.setRole('${r}')">${r}</button>`).join('');
        ExerciseService.subscribeLibrary((lib) => { this.library = lib; this.render(); });
        ExerciseService.subscribeTrainingDays((days) => { this.days = days; this.render(); });
        ExerciseService.subscribeSessions((s) => { this.sessions = s; this.render(); });
        document.getElementById('firebaseStatus').textContent = '';
        Logger.info('Exercise display module initialized');
    },

    setRole: function(role) {
        this.role = role;
        this.renderLibrary();
    },

    render: function() {
        this.renderUpcoming();
        this.renderLibrary();
    },

    row: function(id) {
        const ex = this.library[id];
        const imgs = (ex.images || []).length;
        return `
            <button class="tr-row tr-row-link" onclick="ExerciseDisplay.open('${id}')">
                <span class="tr-role">${ex.role}</span>
                <span class="tr-row-title">${ExerciseService.escapeHtml(ex.title)}</span>
                ${imgs ? `<span class="tr-meta">${imgs} img</span>` : ''}
            </button>`;
    },

    renderUpcoming: function() {
        const el = document.getElementById('upcomingTrainings');
        const info = document.getElementById('trainingDaysInfo');
        const order = [1, 2, 3, 4, 5, 6, 0].filter(d => this.days.includes(d));
        info.textContent = order.length ? `Ci alleniamo: ${order.map(d => WEEKDAY_NAMES[d]).join(', ')}` : '';

        const dates = ExerciseService.upcomingDates(this.days, 1);
        if (!dates.length) {
            el.innerHTML = '<p class="tr-empty">Nessun giorno di allenamento impostato.</p>';
            return;
        }
        el.innerHTML = dates.map(date => {
            const ids = (this.sessions[date] || []).filter(id => this.library[id]);
            return `
            <div class="tr-session">
                <div class="tr-session-date">${ExerciseService.formatDate(date)}</div>
                ${ids.length ? `<div class="tr-session-list">${ids.map(id => this.row(id)).join('')}</div>`
                    : '<p class="tr-empty">Programma non ancora definito.</p>'}
            </div>`;
        }).join('');
    },

    renderLibrary: function() {
        document.querySelectorAll('#roleTabs .tr-tab').forEach(b => b.classList.toggle('active', b.dataset.role === this.role));
        const ids = Object.keys(this.library).filter(id => this.library[id].role === this.role);
        document.getElementById('libraryByRole').innerHTML = ids.length
            ? ids.map(id => this.row(id)).join('')
            : '<p class="tr-empty">Nessun esercizio per questo ruolo.</p>';
    },

    open: function(id) {
        const ex = this.library[id];
        if (!ex) return;
        const esc = ExerciseService.escapeHtml;
        document.getElementById('exerciseDialogBody').innerHTML = `
            <span class="tr-role">${ex.role}</span>
            <h2>${esc(ex.title)}</h2>
            ${ex.description ? `<p class="tr-desc">${esc(ex.description)}</p>` : ''}
            <div class="tr-gallery">
                ${(ex.images || []).map(url => `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(ex.title)}" loading="lazy"></a>`).join('')}
            </div>`;
        document.getElementById('exerciseDialog').showModal();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ExerciseDisplay.init());
} else {
    ExerciseDisplay.init();
}
