/**
 * TACTICS BOARD
 * Ephemeral virtual whiteboard: formations, arrows, freehand strokes.
 *
 * Nothing drawn here is persisted — no Firebase writes, no localStorage.
 * The roster is read (subscribe only) to populate the bench.
 *
 * Three stacked layers share one coordinate space:
 *   1. #tbField  static court (SVG)
 *   2. #tbInk    arrows + pen strokes (SVG paths)
 *   3. #tbTokens player/ball discs (absolutely positioned divs, % coords)
 *
 * The court is always 900 units (9m) wide; height is 1800 (full) or 900 (half).
 * Discs live in percentages, so they survive a mode switch untouched.
 */
const TacticsBoard = {
    SVG_NS: 'http://www.w3.org/2000/svg',
    VIEW_W: 900,
    VIEW_H: 1800,

    /** Minimum drag distance (viewBox units) before an arrow is kept. */
    MIN_ARROW: 40,

    mode: 'full',
    tool: 'move',
    strokes: [],   // drawn <path> nodes, in creation order (undo pops the tail)
    chips: {},     // token id -> bench chip element
    drag: null,    // { el, chip }
    draw: null,    // { path, start, pts }
    ballEl: null,

    init: function () {
        this.court = document.getElementById('tbCourt');
        if (!this.court) return;

        this.field = document.getElementById('tbField');
        this.ink = document.getElementById('tbInk');
        this.tokensLayer = document.getElementById('tbTokens');
        this.benchRoster = document.getElementById('tbBenchRoster');
        this.benchOpp = document.getElementById('tbBenchOpp');

        this._onMove = this.onPointerMove.bind(this);
        this._onUp = this.onPointerUp.bind(this);

        this.bindToolbar();
        this.court.addEventListener('pointerdown', this.onCourtPointerDown.bind(this));

        this.buildOpponentChips();
        this.resetBall();
        this.setTool('move');

        // A 9x18m court barely fits a phone screen; the square half does, and its
        // discs stay finger-sized. Desktop has the room for the whole thing.
        const narrow = window.matchMedia && window.matchMedia('(max-width: 860px)').matches;
        this.setMode(narrow ? 'half' : 'full');

        if (typeof PlayerService !== 'undefined') {
            PlayerService.subscribeToPlayers((players) => this.renderRosterBench(players));
        } else if (this.benchRoster) {
            this.benchRoster.innerHTML = '<p class="tb-empty">Roster non disponibile.</p>';
        }

        if (typeof Logger !== 'undefined' && Logger.info) Logger.info('Tactics board initialized');
    },

    /* ===== TOOLBAR ===== */

    bindToolbar: function () {
        const board = this;

        document.querySelectorAll('.tb-tool').forEach(function (btn) {
            btn.addEventListener('click', function () { board.setTool(btn.dataset.tool); });
        });

        document.querySelectorAll('.tb-mode').forEach(function (btn) {
            btn.addEventListener('click', function () { board.setMode(btn.dataset.mode); });
        });

        const undo = document.getElementById('tbUndo');
        if (undo) undo.addEventListener('click', function () { board.undo(); });

        const clear = document.getElementById('tbClear');
        if (clear) clear.addEventListener('click', function () { board.clearAll(); });
    },

    setTool: function (tool) {
        this.tool = tool;
        this.court.dataset.tool = tool;
        document.querySelectorAll('.tb-tool').forEach(function (btn) {
            const on = btn.dataset.tool === tool;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    },

    /* ===== COURT MODE ===== */

    /**
     * Switch between full court (9x18m) and our half (9x9m).
     * Strokes are dropped: they were drawn in the old viewBox and would not
     * survive the remap. Discs are in %, so they stay where they are.
     */
    setMode: function (mode) {
        const changed = mode !== this.mode;
        this.mode = mode;
        this.court.dataset.mode = mode;

        if (changed) {
            this.strokes.forEach(function (p) { p.remove(); });
            this.strokes = [];
        }

        document.querySelectorAll('.tb-mode').forEach(function (btn) {
            const on = btn.dataset.mode === mode;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        this.renderField();
    },

    renderField: function () {
        const half = this.mode === 'half';
        this.VIEW_H = half ? 900 : 1800;

        const box = '0 0 ' + this.VIEW_W + ' ' + this.VIEW_H;
        this.field.setAttribute('viewBox', box);
        this.ink.setAttribute('viewBox', box);

        let markings;
        if (half) {
            // Net along the top edge, attack line 3m below it.
            markings =
                '<rect class="tb-line" x="15" y="15" width="870" height="870"></rect>' +
                '<line class="tb-line" x1="15" y1="305" x2="885" y2="305"></line>' +
                '<line class="tb-net" x1="0" y1="15" x2="900" y2="15"></line>';
        } else {
            // Net across the middle, an attack line 3m either side.
            markings =
                '<rect class="tb-line" x="15" y="15" width="870" height="1770"></rect>' +
                '<line class="tb-line" x1="15" y1="605" x2="885" y2="605"></line>' +
                '<line class="tb-line" x1="15" y1="1195" x2="885" y2="1195"></line>' +
                '<line class="tb-net" x1="0" y1="900" x2="900" y2="900"></line>';
        }

        this.field.innerHTML =
            '<rect class="tb-floor" x="0" y="0" width="' + this.VIEW_W + '" height="' + this.VIEW_H + '"></rect>' +
            markings;
    },

    undo: function () {
        const path = this.strokes.pop();
        if (path) path.remove();
    },

    clearAll: function () {
        if (this.strokes.length || this.tokensLayer.children.length > 1) {
            if (!window.confirm('Svuotare la lavagna? Frecce, tratti e formazione verranno rimossi.')) return;
        }

        this.strokes.forEach(function (p) { p.remove(); });
        this.strokes = [];

        Array.prototype.slice.call(this.tokensLayer.children).forEach(function (el) { el.remove(); });
        Object.keys(this.chips).forEach(function (id) {
            this.chips[id].classList.remove('is-placed');
        }, this);

        this.ballEl = null;
        this.resetBall();
    },

    /* ===== COORDINATES ===== */

    /** Pointer -> court percentage. Not clamped: callers test for "dragged off court". */
    pct: function (e) {
        const r = this.court.getBoundingClientRect();
        return {
            x: ((e.clientX - r.left) / r.width) * 100,
            y: ((e.clientY - r.top) / r.height) * 100
        };
    },

    /** Pointer -> viewBox units, clamped to the court. */
    viewPt: function (e) {
        const p = this.pct(e);
        return {
            x: (this.clamp(p.x) / 100) * this.VIEW_W,
            y: (this.clamp(p.y) / 100) * this.VIEW_H
        };
    },

    clamp: function (v) {
        return Math.max(0, Math.min(100, v));
    },

    /* ===== TOKENS ===== */

    makeToken: function (data) {
        const el = document.createElement('div');
        el.className = 'tb-token tb-token--' + data.team;
        el.dataset.id = data.id;

        if (data.team === 'ball') {
            el.setAttribute('aria-label', 'Palla');
        } else {
            const num = document.createElement('span');
            num.className = 'tb-token-num';
            num.textContent = data.num;
            el.appendChild(num);

            const name = document.createElement('span');
            name.className = 'tb-token-name';
            name.textContent = data.name;
            el.appendChild(name);
        }

        const board = this;
        el.addEventListener('pointerdown', function (e) {
            if (board.tool !== 'move') return;
            e.stopPropagation();
            e.preventDefault();
            board.beginDrag(e, el, null);
        });

        return el;
    },

    placeToken: function (el, p) {
        el.style.left = this.clamp(p.x) + '%';
        el.style.top = this.clamp(p.y) + '%';
    },

    resetBall: function () {
        if (!this.ballEl) {
            this.ballEl = this.makeToken({ id: 'ball', team: 'ball' });
            this.tokensLayer.appendChild(this.ballEl);
        }
        this.placeToken(this.ballEl, { x: 50, y: 50 });
    },

    returnToBench: function (el) {
        const chip = this.chips[el.dataset.id];
        if (chip) chip.classList.remove('is-placed');
        el.remove();
    },

    /* ===== BENCH ===== */

    makeChip: function (data) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'tb-chip tb-chip--' + data.team;

        const num = document.createElement('span');
        num.className = 'tb-chip-num';
        num.textContent = data.num;
        el.appendChild(num);

        const name = document.createElement('span');
        name.className = 'tb-chip-name';
        name.textContent = data.name;
        el.appendChild(name);

        const board = this;
        el.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            const token = board.makeToken(data);
            board.tokensLayer.appendChild(token);
            el.classList.add('is-placed');
            board.beginDrag(e, token, el);
        });

        return el;
    },

    isPlaced: function (id) {
        return Array.prototype.some.call(this.tokensLayer.children, function (c) {
            return c.dataset.id === id;
        });
    },

    renderRosterBench: function (players) {
        if (!this.benchRoster) return;
        this.benchRoster.innerHTML = '';

        if (!players || !players.length) {
            this.benchRoster.innerHTML = '<p class="tb-empty">Nessun giocatore nel roster.</p>';
            return;
        }

        players.forEach(function (p) {
            const id = 'us-' + (p.id || p.number || p.name);
            const chip = this.makeChip({
                id: id,
                num: p.number || '–',
                name: p.name || 'Giocatore',
                team: 'us'
            });
            if (this.isPlaced(id)) chip.classList.add('is-placed');
            this.chips[id] = chip;
            this.benchRoster.appendChild(chip);
        }, this);
    },

    buildOpponentChips: function () {
        if (!this.benchOpp) return;
        for (let i = 1; i <= 6; i++) {
            const id = 'opp-' + i;
            const chip = this.makeChip({ id: id, num: i, name: 'Avversario', team: 'opp' });
            this.chips[id] = chip;
            this.benchOpp.appendChild(chip);
        }
    },

    /* ===== DRAG ===== */

    beginDrag: function (e, el, chip) {
        this.drag = { el: el, chip: chip };
        el.classList.add('is-dragging');
        this.placeToken(el, this.pct(e));
        this.listen();
    },

    /* ===== DRAWING ===== */

    onCourtPointerDown: function (e) {
        if (this.tool === 'move') return;
        e.preventDefault();

        const start = this.viewPt(e);
        const path = document.createElementNS(this.SVG_NS, 'path');
        path.setAttribute('class', 'tb-path tb-path--' + this.tool);
        if (this.tool === 'arrow') path.setAttribute('marker-end', 'url(#tbArrowHead)');
        this.ink.appendChild(path);

        this.draw = { path: path, start: start, pts: [start] };
        this.updatePath(start);
        this.listen();
    },

    updatePath: function (pt) {
        const d = this.draw;
        d.last = pt;
        if (this.tool === 'arrow') {
            d.path.setAttribute('d', 'M' + d.start.x + ' ' + d.start.y + ' L' + pt.x + ' ' + pt.y);
            return;
        }
        const parts = d.pts.map(function (p, i) {
            return (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y;
        });
        d.path.setAttribute('d', parts.join(' '));
    },

    /* ===== POINTER PLUMBING ===== */

    listen: function () {
        window.addEventListener('pointermove', this._onMove);
        window.addEventListener('pointerup', this._onUp);
        window.addEventListener('pointercancel', this._onUp);
    },

    unlisten: function () {
        window.removeEventListener('pointermove', this._onMove);
        window.removeEventListener('pointerup', this._onUp);
        window.removeEventListener('pointercancel', this._onUp);
    },

    onPointerMove: function (e) {
        if (this.drag) {
            this.placeToken(this.drag.el, this.pct(e));
            return;
        }
        if (!this.draw) return;

        const pt = this.viewPt(e);
        if (this.tool === 'pen') this.draw.pts.push(pt);
        this.updatePath(pt);
    },

    onPointerUp: function (e) {
        if (this.drag) {
            const raw = this.pct(e);
            const offCourt = raw.x < -2 || raw.x > 102 || raw.y < -2 || raw.y > 102;
            this.drag.el.classList.remove('is-dragging');
            if (offCourt && this.drag.el !== this.ballEl) this.returnToBench(this.drag.el);
            this.drag = null;
        }

        if (this.draw) {
            const d = this.draw;
            const last = d.last || d.start;
            const span = Math.hypot(last.x - d.start.x, last.y - d.start.y);

            // Drop accidental taps: a stray click shouldn't leave a dot on the court.
            const tooSmall = this.tool === 'arrow' ? span < this.MIN_ARROW : d.pts.length < 3;
            if (tooSmall) d.path.remove();
            else this.strokes.push(d.path);

            this.draw = null;
        }

        this.unlisten();
    }
};

document.addEventListener('DOMContentLoaded', function () {
    TacticsBoard.init();
});
