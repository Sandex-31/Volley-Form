/**
 * Exercise Upload Manager
 * Admin: training days, per-session plans, exercise library (role, description, images, sketches)
 */

const Sketchpad = {
    canvas: null,
    ctx: null,
    history: [],
    color: null,
    drawing: false,
    dirty: false,

    init: function(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.color = this.token('--board-text');
        this.clear();
        canvas.addEventListener('pointerdown', (e) => {
            this.drawing = true;
            canvas.setPointerCapture(e.pointerId);
            this.history.push(this.ctx.getImageData(0, 0, canvas.width, canvas.height));
            if (this.history.length > 30) this.history.shift();
            const p = this.point(e);
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
            this.ctx.lineTo(p.x + 0.1, p.y + 0.1);
            this.stroke();
        });
        canvas.addEventListener('pointermove', (e) => {
            if (!this.drawing) return;
            const p = this.point(e);
            this.ctx.lineTo(p.x, p.y);
            this.stroke();
        });
        const end = () => { this.drawing = false; };
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
    },

    token: function(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    },

    point: function(e) {
        const r = this.canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * this.canvas.width / r.width, y: (e.clientY - r.top) * this.canvas.height / r.height };
    },

    stroke: function() {
        Object.assign(this.ctx, { strokeStyle: this.color, lineWidth: 5, lineCap: 'round', lineJoin: 'round' });
        this.ctx.stroke();
        this.dirty = true;
    },

    /**
     * Reset to an empty full court (18 x 9 m, net in the middle, 3 m attack lines)
     */
    clear: function() {
        const { ctx, canvas } = this;
        const m = 50, w = canvas.width - 2 * m, h = canvas.height - 2 * m;
        ctx.fillStyle = this.token('--board-bg');
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = this.token('--board-muted');
        ctx.lineWidth = 3;
        ctx.strokeRect(m, m, w, h);
        ctx.beginPath();
        [w / 3, 2 * w / 3].forEach(x => { ctx.moveTo(m + x, m); ctx.lineTo(m + x, m + h); });
        ctx.stroke();
        ctx.strokeStyle = this.token('--board-text');
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(m + w / 2, m - 20);
        ctx.lineTo(m + w / 2, m + h + 20);
        ctx.stroke();
        this.history = [];
        this.dirty = false;
    },

    undo: function() {
        const snap = this.history.pop();
        if (snap) this.ctx.putImageData(snap, 0, 0);
        this.dirty = this.history.length > 0;
    },

    toBlob: function() {
        return new Promise(resolve => this.canvas.toBlob(resolve, 'image/png'));
    }
};

const ExerciseUploadManager = {
    isAdminLoggedIn: false,
    library: {},
    days: [],
    sessions: {},
    editingId: null,
    // Each entry: { url } (already uploaded) or { blob, preview, ext } (pending)
    images: [],
    subscribed: false,

    init: function() {
        this.setupEventListeners();
        Sketchpad.init(document.getElementById('sketchCanvas'));
        this.checkAdminLogin();
        Logger.info('Exercise upload manager initialized');
    },

    setupEventListeners: function() {
        const $ = (id) => document.getElementById(id);
        $('loginBtn').addEventListener('click', () => this.loginAdmin());
        $('adminPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.loginAdmin(); });
        $('logoutBtn').addEventListener('click', () => this.logoutAdmin());
        $('exRole').innerHTML = EXERCISE_ROLES.map(r => `<option value="${r}">${r}</option>`).join('');
        $('exImages').addEventListener('change', (e) => this.addFiles(e.target.files));
        $('saveExerciseBtn').addEventListener('click', () => this.saveExercise());
        $('cancelExerciseBtn').addEventListener('click', () => this.resetForm());
        $('sketchUndo').addEventListener('click', () => Sketchpad.undo());
        $('sketchClear').addEventListener('click', () => Sketchpad.clear());
        $('sketchAdd').addEventListener('click', () => this.addSketch());
        $('sketchColors').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-color]');
            if (!btn) return;
            Sketchpad.color = Sketchpad.token(btn.dataset.color);
            $('sketchColors').querySelectorAll('[data-color]').forEach(b => b.classList.toggle('active', b === btn));
        });
    },

    loginAdmin: function() {
        const input = document.getElementById('adminPassword');
        if (!input.value) {
            UIService.showMessage('Inserisci la password amministratore', 'error');
            return;
        }
        if (input.value !== APP_CONSTANTS.ADMIN_PASSWORD) {
            UIService.showMessage('Password non corretta', 'error');
            return;
        }
        input.value = '';
        StorageService.setItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN, true);
        this.showAdmin();
        UIService.showMessage('Accesso effettuato', 'success');
    },

    logoutAdmin: function() {
        this.isAdminLoggedIn = false;
        StorageService.removeItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN);
        UIService.toggleElement('loginSection', true);
        UIService.toggleElement('uploadSection', false);
        this.resetForm();
        UIService.showMessage('Uscita effettuata', 'success');
    },

    checkAdminLogin: function() {
        if (StorageService.hasItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN)) this.showAdmin();
    },

    showAdmin: function() {
        this.isAdminLoggedIn = true;
        UIService.toggleElement('loginSection', false);
        UIService.toggleElement('uploadSection', true);
        if (this.subscribed) return;
        if (!FirebaseService.isReady()) {
            setTimeout(() => this.showAdmin(), 100);
            return;
        }
        this.subscribed = true;
        ExerciseService.subscribeLibrary((lib) => { this.library = lib; this.renderLibrary(); this.renderPlanner(); });
        ExerciseService.subscribeTrainingDays((days) => { this.days = days; this.renderDays(); this.renderPlanner(); });
        ExerciseService.subscribeSessions((s) => { this.sessions = s; this.renderPlanner(); });
    },

    /* ===== TRAINING DAYS ===== */

    renderDays: function() {
        // Monday-first order
        const order = [1, 2, 3, 4, 5, 6, 0];
        document.getElementById('trainingDays').innerHTML = order.map(d => `
            <label class="day-chip">
                <input type="checkbox" value="${d}" ${this.days.includes(d) ? 'checked' : ''}
                    onchange="ExerciseUploadManager.toggleDay(${d}, this.checked)">
                <span>${WEEKDAY_NAMES[d].slice(0, 3)}</span>
            </label>`).join('');
    },

    toggleDay: async function(day, on) {
        const days = on ? [...new Set([...this.days, day])].sort() : this.days.filter(d => d !== day);
        if (!await ExerciseService.saveTrainingDays(days)) UIService.showMessage('Salvataggio giorni non riuscito', 'error');
    },

    /* ===== SESSION PLANNER ===== */

    exerciseOptions: function() {
        return EXERCISE_ROLES.map(role => {
            const items = Object.entries(this.library).filter(([, ex]) => ex.role === role);
            if (!items.length) return '';
            return `<optgroup label="${role}">${items.map(([id, ex]) =>
                `<option value="${id}">${ExerciseService.escapeHtml(ex.title)}</option>`).join('')}</optgroup>`;
        }).join('');
    },

    renderPlanner: function() {
        const el = document.getElementById('sessionPlanner');
        const dates = ExerciseService.upcomingDates(this.days, 6);
        if (!dates.length) {
            el.innerHTML = '<p class="tr-empty">Seleziona prima i giorni di allenamento.</p>';
            return;
        }
        const options = this.exerciseOptions();
        el.innerHTML = dates.map(date => {
            const ids = this.currentIds(date);
            return `
            <div class="tr-session">
                <div class="tr-session-date">${ExerciseService.formatDate(date)}</div>
                <ol class="tr-session-list">
                    ${ids.map((id, i) => `
                    <li class="tr-row">
                        <span class="tr-role">${this.library[id].role}</span>
                        <span class="tr-row-title">${ExerciseService.escapeHtml(this.library[id].title)}</span>
                        <button class="tr-icon-btn" title="Su" onclick="ExerciseUploadManager.moveInSession('${date}', ${i}, -1)">↑</button>
                        <button class="tr-icon-btn" title="Giù" onclick="ExerciseUploadManager.moveInSession('${date}', ${i}, 1)">↓</button>
                        <button class="tr-icon-btn danger" title="Rimuovi" onclick="ExerciseUploadManager.removeFromSession('${date}', ${i})">×</button>
                    </li>`).join('')}
                </ol>
                ${options ? `
                <div class="tr-add">
                    <select id="add-${date}"><option value="">+ Aggiungi esercizio…</option>${options}</select>
                    <button class="tr-btn" onclick="ExerciseUploadManager.addToSession('${date}')">Aggiungi</button>
                </div>` : '<p class="tr-empty">Crea prima qualche esercizio.</p>'}
            </div>`;
        }).join('');
    },

    currentIds: function(date) {
        return (this.sessions[date] || []).filter(id => this.library[id]);
    },

    saveSession: async function(date, ids) {
        if (!await ExerciseService.saveSession(date, ids)) UIService.showMessage('Salvataggio allenamento non riuscito', 'error');
    },

    addToSession: function(date) {
        const id = document.getElementById(`add-${date}`).value;
        if (!id) return;
        this.saveSession(date, [...this.currentIds(date), id]);
    },

    removeFromSession: function(date, i) {
        const ids = this.currentIds(date);
        ids.splice(i, 1);
        this.saveSession(date, ids);
    },

    moveInSession: function(date, i, dir) {
        const ids = this.currentIds(date);
        const j = i + dir;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        this.saveSession(date, ids);
    },

    /* ===== LIBRARY ===== */

    renderLibrary: function() {
        const el = document.getElementById('libraryList');
        const html = EXERCISE_ROLES.map(role => {
            const items = Object.entries(this.library).filter(([, ex]) => ex.role === role);
            if (!items.length) return '';
            return `<h3 class="tr-role-title">${role}</h3>` + items.map(([id, ex]) => `
                <div class="tr-row">
                    <span class="tr-row-title">${ExerciseService.escapeHtml(ex.title)}</span>
                    <span class="tr-meta">${(ex.images || []).length} img</span>
                    <button class="tr-btn" onclick="ExerciseUploadManager.editExercise('${id}')">Modifica</button>
                    <button class="tr-icon-btn danger" title="Elimina" onclick="ExerciseUploadManager.deleteExercise('${id}')">×</button>
                </div>`).join('');
        }).join('');
        el.innerHTML = html || '<p class="tr-empty">Nessun esercizio ancora.</p>';
    },

    addFiles: function(files) {
        [...files].forEach(file => {
            if (!file.type.startsWith('image/')) return;
            if (file.size > 10 * 1024 * 1024) {
                UIService.showMessage(`${file.name}: massimo 10 MB`, 'error');
                return;
            }
            this.images.push({ blob: file, preview: URL.createObjectURL(file), ext: file.name.split('.').pop().toLowerCase() || 'jpg' });
        });
        document.getElementById('exImages').value = '';
        this.renderImages();
    },

    addSketch: async function() {
        if (!Sketchpad.dirty) {
            UIService.showMessage('Disegna qualcosa prima di aggiungere lo sketch', 'error');
            return;
        }
        const blob = await Sketchpad.toBlob();
        this.images.push({ blob, preview: URL.createObjectURL(blob), ext: 'png' });
        Sketchpad.clear();
        this.renderImages();
    },

    removeImage: function(i) {
        this.images.splice(i, 1);
        this.renderImages();
    },

    renderImages: function() {
        document.getElementById('exPreview').innerHTML = this.images.map((img, i) => `
            <div class="tr-thumb">
                <img src="${ExerciseService.escapeHtml(img.url || img.preview)}" alt="">
                <button class="tr-icon-btn danger" title="Rimuovi" onclick="ExerciseUploadManager.removeImage(${i})">×</button>
            </div>`).join('');
    },

    editExercise: function(id) {
        const ex = this.library[id];
        if (!ex) return;
        this.editingId = id;
        document.getElementById('exRole').value = ex.role;
        document.getElementById('exTitle').value = ex.title;
        document.getElementById('exDescription').value = ex.description || '';
        this.images = (ex.images || []).map(url => ({ url }));
        this.renderImages();
        document.getElementById('exFormTitle').textContent = 'Modifica esercizio';
        document.getElementById('exFormTitle').scrollIntoView({ behavior: 'smooth' });
    },

    resetForm: function() {
        this.editingId = null;
        this.images = [];
        document.getElementById('exTitle').value = '';
        document.getElementById('exDescription').value = '';
        document.getElementById('exFormTitle').textContent = 'Nuovo esercizio';
        Sketchpad.clear();
        this.renderImages();
    },

    saveExercise: async function() {
        const title = document.getElementById('exTitle').value.trim();
        if (!title) {
            UIService.showMessage('Inserisci il nome dell\'esercizio', 'error');
            return;
        }
        if (Sketchpad.dirty && !confirm('C\'è uno sketch non aggiunto. Salvare comunque senza?')) return;

        const btn = document.getElementById('saveExerciseBtn');
        btn.disabled = true;
        btn.textContent = 'Salvataggio…';
        const id = this.editingId || ExerciseService.newId();
        try {
            const urls = [];
            for (const img of this.images) {
                urls.push(img.url || await ExerciseService.uploadImage(id, img.blob, img.ext));
            }
            const ok = await ExerciseService.saveExercise(id, {
                role: document.getElementById('exRole').value,
                title,
                description: document.getElementById('exDescription').value.trim(),
                images: urls
            });
            if (!ok) throw new Error('scrittura Firebase fallita');
            UIService.showMessage('Esercizio salvato', 'success');
            this.resetForm();
        } catch (error) {
            Logger.error(`Save exercise failed: ${error.message}`);
            UIService.showMessage(`Salvataggio non riuscito: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Salva esercizio';
        }
    },

    deleteExercise: async function(id) {
        const ex = this.library[id];
        if (!ex || !confirm(`Eliminare "${ex.title}"?`)) return;
        if (await ExerciseService.deleteExercise(id)) {
            if (this.editingId === id) this.resetForm();
            UIService.showMessage('Esercizio eliminato', 'success');
        } else {
            UIService.showMessage('Eliminazione non riuscita', 'error');
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ExerciseUploadManager.init());
} else {
    ExerciseUploadManager.init();
}
