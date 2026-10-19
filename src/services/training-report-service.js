/**
 * Training Report Service
 * Post-training reports ("Diario tecnico") and their comments in Firebase
 *
 * trainingReports/{id}:
 *   { id, date: 'YYYY-MM-DD', goals, present: [playerId], trend,
 *     observations: [{ players: [playerId], text, future }],
 *     suggestions, rating: 0-5, notes, videos: [url], createdAt, updatedAt }
 * trainingReportComments/{reportId}/{id}:
 *   { id, author, text, createdAt, edited, ownerHash }
 */

const TrainingReportService = {
    reports: [],

    /**
     * Subscribe to all reports (newest first)
     */
    subscribeToReports: function(callback) {
        if (!FirebaseService.isReady()) {
            Logger.error('Firebase not initialized');
            return null;
        }
        return FirebaseService.subscribe(
            APP_CONSTANTS.FIREBASE_REFS.TRAINING_REPORTS,
            (data) => {
                this.reports = data ? Object.values(data).map(r => this.normalizeReport(r)) : [];
                this.reports.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
                callback(this.reports);
            },
            (error) => Logger.error(`Failed to load training reports: ${error.message}`)
        );
    },

    /**
     * Firebase drops empty arrays: give every report the full shape
     */
    normalizeReport: function(r) {
        return {
            id: r.id,
            date: r.date || '',
            goals: r.goals || '',
            present: r.present || [],
            trend: r.trend || '',
            observations: (r.observations || []).map(o => ({
                players: o.players || [],
                text: o.text || '',
                future: o.future || ''
            })),
            suggestions: r.suggestions || '',
            rating: Number(r.rating) || 0,
            notes: r.notes || '',
            videos: r.videos || [],
            createdAt: r.createdAt || 0,
            updatedAt: r.updatedAt || 0
        };
    },

    getReport: function(id) {
        return this.reports.find(r => r.id === id) || null;
    },

    /**
     * Split a textarea into video links (one per line), adding https:// when missing
     */
    parseVideoLinks: function(text) {
        return String(text || '').split(/\s+/).filter(Boolean)
            .map(u => /^https?:\/\//i.test(u) ? u : 'https://' + u);
    },

    /**
     * YouTube video id from any YouTube link (watch, youtu.be, embed, shorts, live)
     */
    youtubeId: function(url) {
        const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/i);
        return m ? m[1] : '';
    },

    /**
     * Video title from YouTube oEmbed (public and unlisted videos). Cached per page load.
     * Returns '' when unavailable (private video, not YouTube, offline).
     */
    videoTitles: {},
    fetchVideoTitle: async function(url) {
        if (!this.youtubeId(url)) return '';
        if (!(url in this.videoTitles)) {
            this.videoTitles[url] = fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url))
                .then(res => res.ok ? res.json() : null)
                .then(data => (data && data.title) || '')
                .catch(() => '');
        }
        return this.videoTitles[url];
    },

    /**
     * Create or update a report. Returns the id, or null on failure
     */
    saveReport: async function(report) {
        if (!FirebaseService.isReady()) {
            UIService.showMessage('⚠️ Firebase non disponibile', 'error');
            return null;
        }
        const now = Date.now();
        const id = report.id || 'report_' + now;
        const data = {
            ...this.normalizeReport(report),
            id: id,
            observations: report.observations.filter(o => o.players.length && (o.text || o.future)),
            createdAt: report.createdAt || now,
            updatedAt: now
        };
        const ok = await FirebaseService.write(`${APP_CONSTANTS.FIREBASE_REFS.TRAINING_REPORTS}/${id}`, data);
        return ok ? id : null;
    },

    /**
     * Delete a report and all its comments
     */
    deleteReport: async function(id) {
        const ok = await FirebaseService.delete(`${APP_CONSTANTS.FIREBASE_REFS.TRAINING_REPORTS}/${id}`);
        if (ok) await FirebaseService.delete(`${APP_CONSTANTS.FIREBASE_REFS.TRAINING_REPORT_COMMENTS}/${id}`);
        return ok;
    },

    // ---------- COMMENTS ----------

    /**
     * Subscribe to the comments of one report (oldest first)
     */
    subscribeToComments: function(reportId, callback) {
        return FirebaseService.subscribe(
            `${APP_CONSTANTS.FIREBASE_REFS.TRAINING_REPORT_COMMENTS}/${reportId}`,
            (data) => {
                const list = data ? Object.values(data) : [];
                list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                callback(list);
            },
            (error) => Logger.error(`Failed to load comments: ${error.message}`)
        );
    },

    addComment: async function(reportId, author, text, ownerHash) {
        const id = 'comment_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        return await FirebaseService.write(`${APP_CONSTANTS.FIREBASE_REFS.TRAINING_REPORT_COMMENTS}/${reportId}/${id}`, {
            id: id,
            author: String(author).trim().slice(0, 40),
            text: String(text).trim().slice(0, 500),
            createdAt: Date.now(),
            edited: false,
            ownerHash: ownerHash
        });
    },

    editComment: async function(reportId, id, text) {
        return await FirebaseService.update(`${APP_CONSTANTS.FIREBASE_REFS.TRAINING_REPORT_COMMENTS}/${reportId}/${id}`, {
            text: String(text).trim().slice(0, 500),
            edited: true
        });
    },

    deleteComment: async function(reportId, id) {
        return await FirebaseService.delete(`${APP_CONSTANTS.FIREBASE_REFS.TRAINING_REPORT_COMMENTS}/${reportId}/${id}`);
    },

    // ---------- DEVICE TOKEN (recognises "my" comments on this device) ----------

    /**
     * Random token kept in this browser. Only its hash is stored in the database.
     */
    getDeviceToken: function() {
        const key = APP_CONSTANTS.STORAGE_KEYS.REPORT_DEVICE_TOKEN;
        let token = StorageService.getItem(key);
        if (!token) {
            token = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
                : Date.now() + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
            StorageService.setItem(key, token);
        }
        return token;
    },

    /**
     * SHA-256 of the device token (crypto.subtle needs https or localhost;
     * plain http falls back to a simple non-cryptographic hash)
     */
    getOwnerHash: async function() {
        const token = this.getDeviceToken();
        if (window.crypto && crypto.subtle) {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        let h = 0x811c9dc5;
        for (let i = 0; i < token.length; i++) h = Math.imul(h ^ token.charCodeAt(i), 0x01000193);
        return 'fnv-' + (h >>> 0).toString(16);
    }
};
