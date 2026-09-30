/**
 * Exercise Service
 * Exercise library (by role), training days and per-session exercise plans.
 *
 * Firebase layout:
 *   exerciseLibrary/{id}      -> { role, title, description, images: [url], updatedAt }
 *   trainingDays              -> [weekday] (0 = domenica … 6 = sabato)
 *   trainingSessions/{date}   -> [exerciseId] (date = YYYY-MM-DD, local)
 */

const EXERCISE_ROLES = ['Generale', 'Palleggiatore', 'Schiacciatore', 'Opposto', 'Centrale', 'Libero'];
const WEEKDAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

const ExerciseService = {
    allExercises: [],

    /**
     * Preset names still used by the evaluation form
     */
    loadExercises: function() {
        const saved = StorageService.getItem(APP_CONSTANTS.STORAGE_KEYS.EXERCISES_LIST);
        this.allExercises = saved || DEFAULT_EXERCISES;
        return this.allExercises;
    },

    getPresetExercises: function() {
        if (this.allExercises.length === 0) this.loadExercises();
        return this.allExercises;
    },

    /**
     * Subscribe to a path, passing `fallback` when the node is empty
     */
    _subscribe: function(path, fallback, callback) {
        return FirebaseService.subscribe(path, (data) => callback(data || fallback), (error) => {
            Logger.error(`Failed to load ${path}: ${error.message}`);
            UIService.showMessage('⚠️ Impossibile caricare i dati degli allenamenti', 'error');
        });
    },

    subscribeLibrary: function(cb) { return this._subscribe(APP_CONSTANTS.FIREBASE_REFS.EXERCISE_LIBRARY, {}, cb); },
    subscribeTrainingDays: function(cb) { return this._subscribe(APP_CONSTANTS.FIREBASE_REFS.TRAINING_DAYS, [], cb); },
    subscribeSessions: function(cb) { return this._subscribe(APP_CONSTANTS.FIREBASE_REFS.TRAINING_SESSIONS, {}, cb); },

    saveExercise: function(id, data) {
        return FirebaseService.write(`${APP_CONSTANTS.FIREBASE_REFS.EXERCISE_LIBRARY}/${id}`,
            { ...data, updatedAt: new Date().toISOString() });
    },

    // ponytail: session lists keep ids of deleted exercises; renderers skip unknown ids
    deleteExercise: function(id) {
        return FirebaseService.delete(`${APP_CONSTANTS.FIREBASE_REFS.EXERCISE_LIBRARY}/${id}`);
    },

    saveTrainingDays: function(days) {
        return FirebaseService.write(APP_CONSTANTS.FIREBASE_REFS.TRAINING_DAYS, days);
    },

    saveSession: function(date, ids) {
        const path = `${APP_CONSTANTS.FIREBASE_REFS.TRAINING_SESSIONS}/${date}`;
        return ids.length ? FirebaseService.write(path, ids) : FirebaseService.delete(path);
    },

    newId: function() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    },

    /**
     * Upload an image/sketch blob to Supabase storage, returns its public URL
     */
    uploadImage: async function(exerciseId, blob, ext) {
        const client = SupabaseModule.getClient();
        if (!client) throw new Error('Supabase non disponibile');
        const path = `library/${exerciseId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error } = await client.storage.from('exercises').upload(path, blob, { contentType: blob.type });
        if (error) throw new Error(error.message);
        return client.storage.from('exercises').getPublicUrl(path).data.publicUrl;
    },

    /**
     * Local YYYY-MM-DD for a Date
     */
    dateKey: function(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    /**
     * Next `count` training dates (today included) from the configured weekdays
     */
    upcomingDates: function(days, count) {
        const out = [];
        if (!days || !days.length) return out;
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        for (let i = 0; i < 60 && out.length < count; i++) {
            if (days.includes(d.getDay())) out.push(this.dateKey(d));
            d.setDate(d.getDate() + 1);
        }
        return out;
    },

    formatDate: function(key) {
        const [y, m, d] = key.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    },

    escapeHtml: function(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text ?? '').replace(/[&<>"']/g, m => map[m]);
    }
};

ExerciseService.loadExercises();
