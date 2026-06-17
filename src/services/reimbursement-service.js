/**
 * Reimbursement Service
 * Manage the roster of people and their "paid / to-pay" status for money
 * that someone anticipated (fronted) for the team.
 *
 * NOTE: kept intentionally self-contained (its own Firebase refs + helpers) so
 * it can be added on top of the in-progress architecture refactor WITHOUT
 * editing shared files. Once the refactor is finished, REFS / DEFAULT_PEOPLE
 * can be folded into config/constants.js to match the rest of the app.
 *
 * Firebase data model:
 *   reimbursementRoster : [ { id, name }, ... ]              (the people)
 *   reimbursementStatus : { <id>: { paid, note, updatedAt } } (their status)
 *
 * Status is keyed by a stable id (slug of the name), so renaming the list text
 * does not silently wipe someone's status as long as their id is preserved.
 */
const ReimbursementService = {
    REFS: {
        ROSTER: 'reimbursementRoster',
        STATUS: 'reimbursementStatus'
    },

    // Optional starting roster. NOT auto-written to Firebase (that would push
    // placeholder junk into the shared/production DB). Use the admin panel to
    // set the real list. Kept here only as a documented template.
    DEFAULT_PEOPLE: [],

    /**
     * Turn a display name into a stable, Firebase-safe key.
     * Firebase keys may not contain  . # $ [ ] /  so we reduce to [a-z0-9-].
     */
    slugify: function(name) {
        const base = (name || '')
            .toString()
            .trim()
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return base || 'person';
    },

    /**
     * Build a clean roster array of { id, name } from raw names, ensuring
     * every id is unique (duplicates get a numeric suffix).
     */
    buildRoster: function(names) {
        const used = {};
        return names
            .map(n => (n || '').trim())
            .filter(n => n.length > 0)
            .map(name => {
                let id = this.slugify(name);
                if (used[id] !== undefined) {
                    used[id] += 1;
                    id = `${id}-${used[id]}`;
                } else {
                    used[id] = 0;
                }
                return { id, name };
            });
    },

    /**
     * Normalize whatever Firebase returns (array, object, or strings) into a
     * clean { id, name }[] array.
     */
    normalizeRoster: function(data) {
        if (!data) return [];
        const arr = Array.isArray(data) ? data : Object.values(data);
        return arr
            .filter(Boolean)
            .map(item => typeof item === 'string'
                ? { id: this.slugify(item), name: item }
                : { id: item.id || this.slugify(item.name), name: item.name });
    },

    /**
     * Subscribe to roster changes. callback receives a { id, name }[] array.
     */
    subscribeRoster: function(callback) {
        return FirebaseService.subscribe(this.REFS.ROSTER, (data) => {
            callback(this.normalizeRoster(data));
        });
    },

    /**
     * Overwrite the whole roster.
     */
    saveRoster: function(roster) {
        return FirebaseService.write(this.REFS.ROSTER, roster);
    },

    /**
     * Subscribe to status changes. callback receives a { <id>: {...} } object.
     */
    subscribeStatus: function(callback) {
        return FirebaseService.subscribe(this.REFS.STATUS, (data) => {
            callback(data || {});
        });
    },

    /**
     * Update a single person's status (merges fields, stamps updatedAt).
     */
    setStatus: function(id, fields) {
        const payload = { ...fields, updatedAt: new Date().toISOString() };
        return FirebaseService.update(`${this.REFS.STATUS}/${id}`, payload);
    },

    /**
     * Reset every person in the roster back to "to pay" (clears notes).
     * Used by the manual button and, later, by the scheduled cron.
     */
    resetAll: function(roster) {
        const stamp = new Date().toISOString();
        const updates = {};
        roster.forEach(p => {
            updates[p.id] = { paid: false, note: '', updatedAt: stamp };
        });
        return FirebaseService.write(this.REFS.STATUS, updates);
    }
};
