# Wapatanka Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rinnovare la parte visiva di "Wapatanka - Volley Tool" (HTML/CSS/JS vanilla) con tema chiaro+toggle scuro, palette navy/rosso del logo, hero home con palla Three.js e card/navbar modernizzate — senza toccare la business logic.

**Architecture:** Un file `theme.css` con CSS custom properties è l'unica fonte di verità per colori/font/ombre/raggi; il toggle imposta `data-theme` su `<html>`. Tutti gli stili esistenti (globali, navbar, per-pagina) e i colori inline vengono migrati dai valori dark hardcoded ai token via una mappa di migrazione definita una volta (Task 1). Home è la pagina di riferimento; le altre 8 applicano lo stesso linguaggio.

**Tech Stack:** HTML/CSS/JS vanilla, nessun bundler. Three.js pinnato via CDN (solo home). Google Fonts (Sora + Inter). Firebase/Supabase invariati.

## Global Constraints

- **Nessuna modifica alla business logic**: fetch dati, submit form, validazione, routing, servizi (`src/services/`, `src/config/`, `src/common/` eccetto i nuovi file UI qui elencati), backend `functions/`. Solo markup/stili/animazioni; è ammesso solo il refactor visivo dei colori inline nelle template string JS di rendering.
- **Palette brand (dai pixel del logo)**: Navy `#0D1A3C`, Rosso `#B22823`. Rosso hover `#9A211C`. Rosso su scuro `#D94A44`.
- **Tema chiaro = default**; scuro via `:root[data-theme="dark"]`. Toggle persistito in `localStorage`, rispetta `prefers-color-scheme` al primo accesso.
- **Three.js PINNATO a tag esatto** (`three@0.160.0`), mai `latest`; caricato solo in `index.html` da jsdelivr con `integrity` (SRI sha384) + `crossorigin="anonymous"`.
- **Font**: Sora (titoli, 700–800) + Inter (testo) via `<link>` Google Fonts `display=swap`; fallback sans-serif di sistema.
- **Accessibilità**: contrasto AA in entrambi i temi; `prefers-reduced-motion: reduce` disattiva 3D e reveal-on-scroll.
- **Nessun test runner nel frontend**: la verifica di ogni task è **visiva nel browser** (Live Server o `python -m http.server` dalla root del repo, aprendo `http://localhost:PORT/src/pages/<pagina>.html`). Dove indicato, verifiche di logica JS si fanno nella console del browser.
- **Ordine di caricamento CSS su ogni pagina**: `theme.css` PRIMA di tutti gli altri; l'ordine degli altri resta invariato.

---

## File Structure

**Nuovi file**
- `src/styles/theme.css` — design tokens (variabili), temi chiaro/scuro, utility animazioni. Fonte di verità unica.
- `src/common/theme-init.js` — applica `data-theme` da localStorage/OS **prima** del render (anti-FOUC), espone `ThemeToggle.toggle()`.
- `src/common/scroll-reveal.js` — IntersectionObserver condiviso per `.reveal`.
- `src/common/icons.js` — `Icons.get(name)` → stringa SVG inline (sostituisce le emoji).
- `src/modules/home/volleyball-3d.js` — scena Three.js della hero + fallback.
- `src/assets/logo-wapatanka.png` — nuovo logo (copia con nome pulito).

**File modificati**
- `src/styles/styles.css`, `src/styles/navbar.css`, `src/styles/home.css`, e i CSS per-pagina (`players.css`, `match-table.css`, `match-stats.css`, `public-exercises.css`, `player-detail.css`, `upload-exercises.css`, `video-analysis.css`) → consumano i token.
- Le 9 pagine `src/pages/*.html` → link a `theme.css` + script UI, nuovo blocco `<nav>`, nuovo logo, migrazione colori inline.
- `src/modules/home/home.js` → colori inline delle template string spostati su classi.

## Migration Color Map (definita una volta, usata ovunque)

Ogni valore dark hardcoded (in CSS o inline HTML/JS) va sostituito col token corrispondente. Questa mappa è il riferimento per **tutti** i task di migrazione.

| Vecchio valore dark | Token | Ruolo |
|---|---|---|
| `#1a1f3a`, `#16213e` (body gradient) | `var(--bg)` | sfondo pagina |
| `#242d47` | `var(--surface)` | card/superficie |
| `#1f2635`, `#2d3854`, `#323d54`, `#333d56` | `var(--surface-2)` | superficie annidata/input |
| `#3a4560` | `var(--border)` | bordi |
| `#4a5575`, `#4e5a7b` | `var(--border-strong)` | bordi hover |
| `#f0f4f8`, `#d4d0d0` | `var(--text)` | testo primario |
| `#d0d9e8`, `#b0c4de` | `var(--text-2)` | testo secondario |
| `#8892b0`, `#999`, `#666` | `var(--text-muted)` | testo attenuato |
| `#5b7cfa`, `#748ffc` (accento blu-viola) | `var(--brand)` / `var(--brand-strong)` | struttura/link |
| gradient `#5b7cfa→#748ffc` su CTA/attivi | `var(--accent)` (rosso) | azioni/CTA/attivi |
| `#51a376`, `#69c896` | `var(--success)` | esiti positivi |
| `#c23030`, `#e03131`, `#ff6b6b` | `var(--danger)` | errori/perdite |
| `#ffd93d` | `var(--warning)` | warning |
| `rgba(91,124,250,X)` | `rgba(178,40,35,X)` via `var(--accent-rgb)` | aloni accento |

**Regola CTA/azione vs struttura:** nel vecchio design il blu-viola faceva sia da struttura sia da azione. Nel nuovo: **struttura/link/nav = navy** (`--brand`), **azioni/CTA/stati attivi/hover = rosso** (`--accent`). Quando un elemento è un bottone d'azione o uno stato "attivo/selezionato", usare `--accent`; quando è testo strutturale/link di navigazione, usare `--brand`.

---

## Task 1: Design tokens — `theme.css`

**Files:**
- Create: `src/styles/theme.css`

**Interfaces:**
- Produces: variabili CSS su `:root` (chiaro) e `:root[data-theme="dark"]` (scuro): `--bg, --surface, --surface-2, --border, --border-strong, --text, --text-2, --text-muted, --brand, --brand-strong, --accent, --accent-hover, --accent-rgb, --success, --danger, --warning, --radius, --radius-sm, --shadow-sm, --shadow-md, --shadow-lg, --nav-h, --font-head, --font-body, --ease`. Classi utility `.reveal`, `.reveal.is-visible`, keyframes `fadeSlideUp`.

- [ ] **Step 1: Creare `src/styles/theme.css` con i token e le utility**

```css
/* ===== WAPATANKA THEME TOKENS — single source of truth ===== */
:root {
  color-scheme: light;

  /* Brand (dal logo) */
  --brand:        #0D1A3C;   /* navy */
  --brand-strong: #16264F;   /* navy schiarito per gradienti */
  --accent:       #B22823;   /* rosso */
  --accent-hover: #9A211C;
  --accent-rgb:   178, 40, 35;

  /* Neutri — tema chiaro */
  --bg:            #F4F6FB;
  --surface:       #FFFFFF;
  --surface-2:     #F0F3F9;
  --border:        #E2E7F0;
  --border-strong: #C9D2E3;
  --text:          #0D1A3C;
  --text-2:        #3B475F;
  --text-muted:    #6B7688;

  /* Semantici */
  --success: #1E8E5A;
  --danger:  #C0392B;
  --warning: #C9820A;

  /* Forma */
  --radius:    16px;
  --radius-sm: 10px;
  --nav-h:     64px;

  /* Ombre (morbide, due livelli) */
  --shadow-sm: 0 1px 2px rgba(13,26,60,.06), 0 2px 6px rgba(13,26,60,.06);
  --shadow-md: 0 4px 12px rgba(13,26,60,.08), 0 8px 24px rgba(13,26,60,.08);
  --shadow-lg: 0 12px 32px rgba(13,26,60,.12), 0 24px 48px rgba(13,26,60,.10);

  /* Tipografia */
  --font-head: 'Sora', 'Segoe UI', system-ui, sans-serif;
  --font-body: 'Inter', 'Segoe UI', system-ui, sans-serif;

  --ease: cubic-bezier(.22,.61,.36,1);
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg:            #0A142E;
  --surface:       #101B38;
  --surface-2:     #16223F;
  --border:        #23304F;
  --border-strong: #35456A;
  --text:          #E8ECF4;
  --text-2:        #B7C1D6;
  --text-muted:    #8592AD;

  --brand:        #6D8BE0;   /* navy schiarito per leggibilità su scuro */
  --brand-strong: #8AA3EC;
  --accent:       #D94A44;   /* rosso schiarito (AA su scuro) */
  --accent-hover: #E4635E;
  --accent-rgb:   217, 74, 68;

  --success: #43C08A;
  --danger:  #F06B6B;
  --warning: #E6B23A;

  --shadow-sm: 0 1px 2px rgba(0,0,0,.4);
  --shadow-md: 0 6px 20px rgba(0,0,0,.45);
  --shadow-lg: 0 16px 40px rgba(0,0,0,.55);
}

/* Reveal-on-scroll utility */
.reveal {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity .6s var(--ease), transform .6s var(--ease);
  will-change: opacity, transform;
}
.reveal.is-visible { opacity: 1; transform: none; }

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: none; }
}

/* Rispetto accessibilità movimento */
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  * { animation-duration: .001ms !important; animation-iteration-count: 1 !important; }
}
```

- [ ] **Step 2: Verifica visiva rapida**

Aprire un file HTML temporaneo o una pagina esistente dopo aver linkato `theme.css`; nella console del browser eseguire:
```js
getComputedStyle(document.documentElement).getPropertyValue('--accent')
```
Expected: ` #B22823` (chiaro). Poi `document.documentElement.setAttribute('data-theme','dark')` → ripetere → ` #D94A44`.

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "[Feat] Add theme.css design tokens (light/dark, brand navy/red)"
```

---

## Task 2: Font + refactor `styles.css` sui token

**Files:**
- Modify: `src/styles/styles.css` (colori hardcoded → token, secondo la Migration Color Map)

**Interfaces:**
- Consumes: variabili di Task 1.

- [ ] **Step 1: Sostituire body/base per usare i token**

In `src/styles/styles.css`, sostituire il blocco `body`:
```css
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}
```
E `.container`:
```css
.container {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  padding: 40px;
  max-width: 650px;
  width: 100%;
  border: 1px solid var(--border);
}
```

- [ ] **Step 2: Applicare la Migration Color Map al resto di `styles.css`**

Sostituire ogni occorrenza dei valori dark elencati nella mappa con il token corrispondente in tutto il file (header, progress bar, steps, form input/focus, buttons, summary, success/error, exercise list, rating slider). Regole chiave:
- `.btn-next`, `.add-exercise-btn`, `.step.active` e ogni gradient CTA blu → `background: var(--accent); color:#fff;` (hover `var(--accent-hover)`).
- Titoli `h1/h3` → `font-family: var(--font-head);`.
- Bordi input `#3a4560` → `var(--border)`; focus `#5b7cfa`/box-shadow → `var(--accent)` / `rgba(var(--accent-rgb),.15)`.
- `.error-message` → `background: var(--danger)`; `.success-message` → `background: var(--success)`.
- `.rating-slider` gradient resta (semaforo rosso→giallo→verde) ma thumb border → `var(--accent)`.

- [ ] **Step 3: Aggiungere i `<link>` font + theme.css alle pagine (solo verifica su una pagina qui)**

In `src/pages/index.html` `<head>`, PRIMA degli altri CSS, aggiungere:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap">
<link rel="stylesheet" href="../styles/theme.css">
```
(L'aggiunta a tutte le pagine avviene nei rispettivi task; qui basta index per verificare.)

- [ ] **Step 4: Verifica visiva**

Avviare server statico dalla root: `python -m http.server 8080`. Aprire `http://localhost:8080/src/pages/form.html`. Expected: sfondo chiaro, testo navy leggibile, bottone "Next" rosso, font Inter/Sora attivi. (Nota: la form.html avrà i `<link>` aggiunti nel Task 8; per questa verifica temporaneamente aggiungerli o verificare su index dopo Task 5.)

- [ ] **Step 5: Commit**

```bash
git add src/styles/styles.css src/pages/index.html
git commit -m "[Feat] Migrate global styles.css to theme tokens + load fonts"
```

---

## Task 3: Script UI condivisi — theme toggle, scroll-reveal, icons

**Files:**
- Create: `src/common/theme-init.js`
- Create: `src/common/scroll-reveal.js`
- Create: `src/common/icons.js`

**Interfaces:**
- Produces: `window.ThemeToggle` con `.toggle()` e `.apply(mode)`; auto-init reveal su `.reveal`; `window.Icons.get(name)` → SVG string. Nomi icone: `home, form, exercises, responses, matches, players, ai, manage, ball, calendar, arrow-right`.

- [ ] **Step 1: `theme-init.js` (anti-FOUC, va incluso nel `<head>`)**

```js
/* Applica il tema PRIMA del render per evitare flash. Includere nel <head>. */
(function () {
  try {
    var saved = localStorage.getItem('wapatanka-theme');
    var mode = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', mode);
  } catch (e) {}

  window.ThemeToggle = {
    apply: function (mode) {
      document.documentElement.setAttribute('data-theme', mode);
      try { localStorage.setItem('wapatanka-theme', mode); } catch (e) {}
      var btn = document.getElementById('themeToggleBtn');
      if (btn) btn.setAttribute('aria-label', mode === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro');
    },
    toggle: function () {
      var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      this.apply(cur === 'dark' ? 'light' : 'dark');
    }
  };
})();
```

- [ ] **Step 2: `scroll-reveal.js`**

```js
/* Rivela elementi .reveal quando entrano nel viewport. */
(function () {
  function init() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
```

- [ ] **Step 3: `icons.js` (SVG inline, `stroke="currentColor"` per ereditare il colore)**

```js
/* SVG icon set — currentColor eredita il colore dal contesto. */
window.Icons = (function () {
  var P = 'stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  var S = { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: '1em', height: '1em' };
  function wrap(inner) {
    return '<svg xmlns="' + S.xmlns + '" viewBox="' + S.viewBox + '" width="' + S.width + '" height="' + S.height + '" ' + P + ' aria-hidden="true">' + inner + '</svg>';
  }
  var defs = {
    home:      '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    form:      '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    exercises: '<circle cx="7" cy="12" r="2.5"/><circle cx="17" cy="12" r="2.5"/><path d="M9.5 12h5M4.5 12H3M21 12h-1.5"/>',
    responses: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    matches:   '<path d="M12 2l3 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z"/>',
    players:   '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0"/><path d="M16 6a3 3 0 010 6M21 20a6 6 0 00-4-5.6"/>',
    ai:        '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2"/>',
    manage:    '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 00-1.7-1L16.5 2h-4l-.4 2.4a7 7 0 00-1.7 1l-2.3-1-2 3.4 2 1.6a7 7 0 000 2l-2 1.6 2 3.4 2.3-1a7 7 0 001.7 1l.4 2.4h4l.4-2.4a7 7 0 001.7-1l2.3 1 2-3.4-2-1.6a7 7 0 00.1-1z"/>',
    ball:      '<circle cx="12" cy="12" r="9"/><path d="M12 3a15 15 0 000 18M3.5 8.5c6 2 11 2 17 0M3.5 15.5c6-2 11-2 17 0"/>',
    calendar:  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    sun:  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/>'
  };
  return { get: function (n) { return defs[n] ? wrap(defs[n]) : ''; } };
})();
```

- [ ] **Step 4: Verifica logica nella console**

Includere i tre script in una pagina, poi in console:
```js
ThemeToggle.toggle(); document.documentElement.getAttribute('data-theme'); // cambia light/dark
localStorage.getItem('wapatanka-theme');                                   // persiste
Icons.get('ball').startsWith('<svg');                                      // true
```
Expected: il tema cambia e persiste dopo reload; `Icons.get('ball')` restituisce SVG.

- [ ] **Step 5: Commit**

```bash
git add src/common/theme-init.js src/common/scroll-reveal.js src/common/icons.js
git commit -m "[Feat] Add shared UI scripts: theme toggle, scroll-reveal, SVG icons"
```

---

## Task 4: Navbar modernizzata + hamburger mobile + toggle tema (globale)

**Files:**
- Modify: `src/styles/navbar.css` (riscrittura completa sui token + hamburger + toggle)
- Modify: le 9 pagine `src/pages/*.html` (nuovo blocco `<nav>` identico, con `active` sulla voce giusta; nuovo logo; link `theme.css`+font; script UI)

**Interfaces:**
- Consumes: `ThemeToggle` (Task 3), token (Task 1).
- Produces: markup navbar standard riusato da tutte le pagine.

- [ ] **Step 1: Copiare il nuovo logo con nome pulito**

```bash
cp "ChatGPT_Image_27_giu_2026_15_30_37.png" src/assets/logo-wapatanka.png
```

- [ ] **Step 2: Riscrivere `src/styles/navbar.css`**

```css
/* ===== NAVBAR ===== */
.navbar {
  position: sticky; top: 0; left: 0; z-index: 1000;
  width: 100%; height: var(--nav-h);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  transition: background .3s var(--ease), box-shadow .3s var(--ease), border-color .3s var(--ease);
}
.navbar.scrolled {
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  box-shadow: var(--shadow-md);
}
.navbar-brand {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-head); font-size: 19px; font-weight: 800;
  color: var(--text); text-decoration: none; letter-spacing: .3px;
  transition: transform .3s var(--ease);
}
.navbar-brand:hover { transform: scale(1.02); }
.navbar-brand span { color: var(--brand); }
.navbar-logo { height: 34px; width: auto; object-fit: contain; display: block; }

.navbar-menu { display: flex; align-items: center; gap: 4px; list-style: none; }
.navbar-item a {
  display: flex; align-items: center; gap: 7px;
  color: var(--text-2); text-decoration: none;
  padding: 9px 14px; border-radius: var(--radius-sm);
  font-size: 14px; font-weight: 600; position: relative;
  transition: color .25s var(--ease), background .25s var(--ease);
}
.navbar-item a svg { font-size: 17px; }
.navbar-item a::after {
  content: ''; position: absolute; left: 14px; right: 14px; bottom: 5px; height: 2px;
  background: var(--accent); border-radius: 2px;
  transform: scaleX(0); transform-origin: left; transition: transform .25s var(--ease);
}
.navbar-item a:hover { color: var(--text); }
.navbar-item a:hover::after { transform: scaleX(1); }
.navbar-item.active a { color: var(--accent); background: rgba(var(--accent-rgb), .10); }
.navbar-item.active a::after { transform: scaleX(1); }

/* Right cluster: theme toggle + hamburger */
.navbar-actions { display: flex; align-items: center; gap: 8px; }
.theme-toggle-btn, .navbar-toggle {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border: 1px solid var(--border);
  background: var(--surface-2); color: var(--text); border-radius: 10px;
  cursor: pointer; font-size: 18px; transition: all .25s var(--ease);
}
.theme-toggle-btn:hover, .navbar-toggle:hover { border-color: var(--accent); color: var(--accent); }
.theme-toggle-btn .icon-moon { display: none; }
:root[data-theme="dark"] .theme-toggle-btn .icon-sun  { display: none; }
:root[data-theme="dark"] .theme-toggle-btn .icon-moon { display: inline-flex; }
.navbar-toggle { display: none; }

/* Layout host */
body { display: block; padding: 0; }
.container, .home-container, .players-container, .matches-container { margin: 40px auto; }

/* Mobile */
@media (max-width: 860px) {
  .navbar-toggle { display: flex; }
  .navbar-menu {
    position: fixed; top: var(--nav-h); right: 0;
    width: min(78vw, 320px); height: calc(100vh - var(--nav-h));
    flex-direction: column; align-items: stretch; gap: 4px;
    padding: 16px; background: var(--surface);
    border-left: 1px solid var(--border); box-shadow: var(--shadow-lg);
    transform: translateX(100%); transition: transform .3s var(--ease);
    overflow-y: auto;
  }
  .navbar-menu.open { transform: translateX(0); }
  .navbar-item a { padding: 12px 14px; font-size: 15px; }
  .navbar-item a::after { display: none; }
}
```

- [ ] **Step 3: Definire il blocco `<nav>` standard (template da incollare in ogni pagina)**

Sostituire l'intero `<nav class="navbar">…</nav>` di **ogni** pagina con questo (mantenendo la classe `active` sulla voce corrente della pagina):
```html
<nav class="navbar" id="siteNav">
  <a href="index.html" class="navbar-brand">
    <img src="../assets/logo-wapatanka.png" alt="Wapatanka" class="navbar-logo"> <span>Wapatanka</span>
  </a>
  <ul class="navbar-menu" id="navMenu">
    <li class="navbar-item"><a href="index.html"><span class="nav-ic" data-icon="home"></span> Home</a></li>
    <li class="navbar-item"><a href="form.html"><span class="nav-ic" data-icon="form"></span> Rate Form</a></li>
    <li class="navbar-item"><a href="public-exercises.html"><span class="nav-ic" data-icon="exercises"></span> Exercises</a></li>
    <li class="navbar-item"><a href="responses.html"><span class="nav-ic" data-icon="responses"></span> Responses</a></li>
    <li class="navbar-item"><a href="match-table.html"><span class="nav-ic" data-icon="matches"></span> Matches</a></li>
    <li class="navbar-item"><a href="players.html"><span class="nav-ic" data-icon="players"></span> Players</a></li>
    <li class="navbar-item"><a href="ai-analysis.html"><span class="nav-ic" data-icon="ai"></span> AI Analysis</a></li>
    <li class="navbar-item"><a href="upload-exercises.html"><span class="nav-ic" data-icon="manage"></span> Manage</a></li>
  </ul>
  <div class="navbar-actions">
    <button class="theme-toggle-btn" id="themeToggleBtn" onclick="ThemeToggle.toggle()" aria-label="Cambia tema" type="button">
      <span class="icon-sun" data-icon="sun"></span><span class="icon-moon" data-icon="moon"></span>
    </button>
    <button class="navbar-toggle" id="navToggle" aria-label="Menu" aria-expanded="false" type="button">☰</button>
  </div>
</nav>
```

- [ ] **Step 4: Aggiungere `navbar.js` per hamburger + scroll + iniezione icone nav**

Create `src/common/navbar.js`:
```js
(function () {
  function init() {
    // Inietta icone SVG nei placeholder [data-icon]
    if (window.Icons) {
      document.querySelectorAll('[data-icon]').forEach(function (el) {
        el.innerHTML = Icons.get(el.getAttribute('data-icon'));
      });
    }
    var nav = document.getElementById('siteNav');
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('navMenu');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { menu.classList.remove('open'); });
      });
    }
    if (nav) {
      var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
      window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
```
(Aggiungere `src/common/navbar.js` a File Structure → nuovi file.)

- [ ] **Step 5: Standardizzare `<head>` + script su TUTTE le 9 pagine**

In ogni `src/pages/*.html`:
- Nel `<head>`, come **primissima** cosa dopo `<meta viewport>`: `<script src="../common/theme-init.js"></script>`, poi i due `<link>` font, poi `<link rel="stylesheet" href="../styles/theme.css">`, poi i CSS esistenti della pagina.
- Prima di `</body>` (dopo Firebase/config/common già presenti, ma **prima** dei moduli di pagina): aggiungere
```html
<script src="../common/icons.js"></script>
<script src="../common/navbar.js"></script>
<script src="../common/scroll-reveal.js"></script>
```
- Sostituire il `<nav>` col template dello Step 3 (classe `active` sulla voce giusta) e il logo con `logo-wapatanka.png`.

- [ ] **Step 6: Verifica visiva multi-pagina**

Server attivo, aprire index/form/players/match-table. Expected: navbar chiara con blur, logo nuovo, icone SVG nei link, voce attiva rossa con underline, toggle sole/luna che cambia tema e persiste al reload. Ridurre la finestra <860px: appare l'hamburger, il menu scorre da destra, i link lo chiudono. Scroll: la navbar prende ombra (`.scrolled`).

- [ ] **Step 7: Commit**

```bash
git add src/styles/navbar.css src/common/navbar.js src/assets/logo-wapatanka.png src/pages/*.html
git commit -m "[Feat] Modernize navbar: tokens, mobile hamburger, theme toggle, SVG icons"
```

---

## Task 5: Home — hero, card e `home.css`

**Files:**
- Modify: `src/pages/index.html` (markup hero + card + reveal + contenitore 3D)
- Modify: `src/styles/home.css` (riscrittura sui token + layout hero a due colonne)

**Interfaces:**
- Consumes: token, `Icons`, `.reveal`.
- Produces: `#volleyballCanvas` (contenitore del 3D per Task 6), classi `.hero`, `.hero-3d`.

- [ ] **Step 1: Riscrivere il markup della hero in `index.html`**

Sostituire il blocco `<div class="welcome-hero">…</div>` con:
```html
<section class="hero reveal">
  <div class="hero-copy">
    <span class="hero-kicker">Volley Tool</span>
    <h1>WAPATANKA</h1>
    <p>Il gestionale ufficiale della squadra: feedback allenamenti, calendario partite, roster e statistiche di gioco.</p>
    <div class="hero-cta">
      <a href="form.html" class="btn-accent"><span data-icon="form"></span> Rate Today's Training</a>
      <a href="match-table.html" class="btn-ghost"><span data-icon="matches"></span> View Matches</a>
    </div>
  </div>
  <div class="hero-3d">
    <div id="volleyballCanvas" role="img" aria-label="Palla da pallavolo 3D"></div>
    <img class="hero-3d-fallback" src="../assets/logo-wapatanka.png" alt="Wapatanka" hidden>
  </div>
</section>
```

- [ ] **Step 2: Aggiungere le classi bottone e riscrivere `home.css` sui token**

Riscrivere `src/styles/home.css`. Include hero, bottoni, sezioni, card, roster/match preview, badge — tutti sui token (applicare Migration Color Map). Blocchi chiave:
```css
.home-container { max-width: 980px; width: 100%; margin-bottom: 30px; }

/* Hero */
.hero {
  display: grid; grid-template-columns: 1.1fr .9fr; align-items: center; gap: 32px;
  background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
  border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow-md); padding: 48px 44px; margin-bottom: 30px;
  position: relative; overflow: hidden;
}
.hero-kicker {
  display: inline-block; font-family: var(--font-head); font-weight: 700;
  font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--accent); margin-bottom: 10px;
}
.hero h1 {
  font-family: var(--font-head); font-size: clamp(38px, 6vw, 60px); font-weight: 800;
  line-height: 1; color: var(--text); margin-bottom: 14px; letter-spacing: 1px;
  animation: fadeSlideUp .6s var(--ease) both;
}
.hero p { color: var(--text-2); font-size: 16px; line-height: 1.6; max-width: 46ch; margin-bottom: 24px;
  animation: fadeSlideUp .6s var(--ease) .08s both; }
.hero-cta { display: flex; gap: 14px; flex-wrap: wrap; animation: fadeSlideUp .6s var(--ease) .16s both; }
.hero-3d { position: relative; min-height: 300px; display: flex; align-items: center; justify-content: center; }
#volleyballCanvas { width: 100%; height: 320px; }
.hero-3d-fallback { max-width: 260px; width: 70%; height: auto; filter: drop-shadow(var(--shadow-lg)); }

/* Buttons */
.btn-accent, .btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 13px 22px; border-radius: var(--radius-sm);
  font-family: var(--font-head); font-weight: 700; font-size: 15px;
  text-decoration: none; cursor: pointer; border: 1px solid transparent;
  transition: transform .2s var(--ease), box-shadow .2s var(--ease), background .2s var(--ease);
}
.btn-accent { background: var(--accent); color: #fff; box-shadow: 0 6px 18px rgba(var(--accent-rgb), .35); }
.btn-accent:hover { background: var(--accent-hover); transform: translateY(-2px); box-shadow: 0 10px 24px rgba(var(--accent-rgb), .4); }
.btn-ghost { background: transparent; color: var(--text); border-color: var(--border-strong); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-2px); }

/* Sections & cards */
.home-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 26px 30px; margin-bottom: 26px; box-shadow: var(--shadow-sm); }
.home-section-title { font-family: var(--font-head); font-size: 18px; font-weight: 700; color: var(--text);
  margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 12px;
  display: flex; justify-content: space-between; align-items: center; }
.home-section-title a { font-size: 13px; color: var(--accent); text-decoration: none; font-weight: 600; }
.home-section-title a:hover { text-decoration: underline; }

.home-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 20px; }
.home-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 26px 22px; box-shadow: var(--shadow-sm); text-decoration: none; display: block;
  transition: transform .25s var(--ease), box-shadow .25s var(--ease), border-color .25s var(--ease); }
.home-card:hover { transform: translateY(-6px) scale(1.01); box-shadow: var(--shadow-lg); border-color: var(--accent); }
.home-card .icon { font-size: 30px; color: var(--accent); margin-bottom: 14px; display: inline-flex; }
.home-card h3 { font-family: var(--font-head); font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
.home-card p { font-size: 13.5px; color: var(--text-muted); line-height: 1.5; margin: 0; }

/* Roster / match preview / badges: applicare Migration Color Map ai blocchi esistenti,
   sostituendo #1f2635→var(--surface-2), #3a4560→var(--border), #f0f4f8→var(--text),
   #8892b0→var(--text-muted), accento blu→var(--accent). Badge upcoming→brand, won→success, lost→danger. */

@media (max-width: 820px) {
  .hero { grid-template-columns: 1fr; text-align: center; padding: 36px 24px; }
  .hero p { margin-left: auto; margin-right: auto; }
  .hero-cta { justify-content: center; }
  .hero-3d { min-height: 240px; }
}
```

- [ ] **Step 3: Sostituire le emoji delle quick-nav card con icone SVG**

Nelle 4 `.home-card` di `index.html`, sostituire `<div class="icon">📋</div>` ecc. con `<div class="icon" data-icon="form"></div>`, `exercises`, `matches`, `players`. Aggiungere `class="reveal"` alle `.home-section` e alla griglia per il reveal-on-scroll.

- [ ] **Step 4: Verifica visiva**

Aprire `http://localhost:8080/src/pages/index.html`. Expected: hero a due colonne (copy + area 3D con logo fallback visibile finché Task 6 non attiva il canvas), titolo/paragrafo/CTA con fade-slide in cascata, card con icone rosse che si sollevano all'hover, sezioni che appaiono allo scroll. Toggle tema OK.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.html src/styles/home.css
git commit -m "[Feat] Redesign home hero + cards on theme tokens with SVG icons"
```

---

## Task 6: Palla da volley 3D (Three.js) nella hero

**Files:**
- Create: `src/modules/home/volleyball-3d.js`
- Modify: `src/pages/index.html` (CDN Three.js pinnato + SRI + `defer`; include dello script; fallback)

**Interfaces:**
- Consumes: `#volleyballCanvas`, `.hero-3d-fallback` (Task 5), `THREE` globale dal CDN.

- [ ] **Step 1: Aggiungere il CDN pinnato con SRI in `index.html`**

Calcolare l'hash SRI e inserire prima della chiusura `</body>` (prima dello script della scena):
```bash
curl -s https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
```
Poi:
```html
<script defer src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"
  integrity="sha384-<HASH_CALCOLATO>" crossorigin="anonymous"></script>
<script defer src="../modules/home/volleyball-3d.js"></script>
```

- [ ] **Step 2: Scrivere `volleyball-3d.js` con fallback robusto**

```js
/* Palla da volley 3D nella hero. Fallback all'immagine su problemi reali. */
(function () {
  function showFallback() {
    var img = document.querySelector('.hero-3d-fallback');
    var canvasHost = document.getElementById('volleyballCanvas');
    if (img) img.hidden = false;
    if (canvasHost) canvasHost.style.display = 'none';
  }
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function webglOK() {
    try { var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }

  function start() {
    var host = document.getElementById('volleyballCanvas');
    if (!host) return;
    if (reducedMotion() || typeof THREE === 'undefined' || !webglOK()) { showFallback(); return; }
    try {
      var w = host.clientWidth, h = host.clientHeight || 320;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100); camera.position.z = 3.2;
      var renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h); host.appendChild(renderer.domElement);

      // Palla: sfera bianca con "cuciture" navy/rosse via wireframe leggero sovrapposto
      var geo = new THREE.SphereGeometry(1, 48, 48);
      var ball = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55, metalness: .05 }));
      var seams = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ color: 0x0D1A3C, wireframe: true, transparent: true, opacity: .18 }));
      seams.scale.setScalar(1.002);
      var group = new THREE.Group(); group.add(ball); group.add(seams); scene.add(group);

      scene.add(new THREE.AmbientLight(0xffffff, .75));
      var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 4, 5); scene.add(key);
      var rim = new THREE.DirectionalLight(0xB22823, .5); rim.position.set(-4, -2, -3); scene.add(rim);

      var targetX = 0, targetY = 0;
      host.addEventListener('pointermove', function (e) {
        var r = host.getBoundingClientRect();
        targetY = ((e.clientX - r.left) / r.width - .5) * 0.6;
        targetX = ((e.clientY - r.top) / r.height - .5) * 0.4;
      });

      var running = true;
      document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) loop(); });
      window.addEventListener('resize', function () {
        var nw = host.clientWidth, nh = host.clientHeight || 320;
        camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
      });

      function loop() {
        if (!running) return;
        group.rotation.y += 0.004 + (targetY - group.rotation.y) * 0.0;
        group.rotation.y += (targetY - (group.rotation.y % (Math.PI * 2))) * 0.02;
        group.rotation.x += (targetX - group.rotation.x) * 0.05;
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
      }
      loop();
    } catch (e) { showFallback(); }
  }

  // Three.js è caricato con defer: attendere il load completo del documento.
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
```

- [ ] **Step 3: Verifica visiva + fallback**

Aprire index. Expected: palla bianca 3D che ruota lenta e reagisce al mouse (parallax), luce rossa di rim. Test fallback: in DevTools disabilitare WebGL (o simulare `prefers-reduced-motion`) e ricaricare → compare l'immagine logo, nessun errore in console.

- [ ] **Step 4: Commit**

```bash
git add src/modules/home/volleyball-3d.js src/pages/index.html
git commit -m "[Feat] Add Three.js volleyball hero (pinned CDN+SRI) with robust fallback"
```

---

## Task 7: Refactor colori inline in `home.js`

**Files:**
- Modify: `src/modules/home/home.js` (colori dark nelle template string → classi/token, DOM invariato)
- Modify: `src/styles/home.css` (classi helper per gli stati prima inline)

**Interfaces:**
- Consumes: token, classi `.match-preview-card`, `.player-preview-card`, `.badge*`.
- Produces: nessun cambiamento di API; solo presentazione.

- [ ] **Step 1: Sostituire i colori inline nelle stringhe di rendering**

In `home.js`, negli `innerHTML`: rimuovere gli `style="color:#8892b0…"`, `#5b7cfa`, `#1f2635`, `#748ffc`, `#f0f4f8` e affidarsi alle classi CSS. Esempi:
- Empty-state roster: usare classe `.preview-empty` invece di `style="…color:#8892b0…"` e link `.preview-link` invece di `style="color:#5b7cfa…"`.
- "More players" card: contenuto con classi `.more-count`, `.more-label`, `.more-link`.
- Match preview: titolo kicker con classe `.match-preview-kicker`; il resto già usa `.match-preview-card`/`.badge`.

- [ ] **Step 2: Aggiungere le classi helper in `home.css`**

```css
.preview-empty { grid-column: 1/-1; padding: 20px; text-align: center; color: var(--text-muted); font-style: italic; }
.preview-link, .more-link { color: var(--accent); text-decoration: none; font-weight: 600; }
.player-preview-card.more { justify-content: center; border-style: dashed; border-color: var(--border-strong); }
.more-count { font-size: 20px; color: var(--accent); font-weight: 800; margin-bottom: 4px; }
.more-label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
.match-preview-kicker { font-family: var(--font-head); font-size: 11px; font-weight: 700; color: var(--accent);
  text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
```

- [ ] **Step 3: Verifica visiva (dati reali)**

Aprire index con dati Firebase. Expected: roster preview e next-match widget leggibili sul tema chiaro, badge Won/Lost/Upcoming coi colori semantici, nessun testo grigio-su-chiaro illeggibile. Toggle scuro OK.

- [ ] **Step 4: Commit**

```bash
git add src/modules/home/home.js src/styles/home.css
git commit -m "[Refactor] Move home.js inline colors to theme-aware CSS classes"
```

---

## Task 8: Pagina Form (`form.html`)

**Files:**
- Modify: `src/pages/form.html` (head/nav/script già standardizzati in Task 4; qui: colori inline + reveal)

**Interfaces:** Consumes: token, `.reveal`.

- [ ] **Step 1: Migrare i colori inline**

Sostituire negli inline style: `color:#d4d0d0` → `var(--text)`; `color:#666` → `var(--text-muted)`. Aggiungere `class="reveal"` a `.container`. La logica step/slider è già coperta da `styles.css` (Task 2).

- [ ] **Step 2: Verifica visiva**

Aprire form.html. Expected: card chiara, steps indicator con step attivo rosso, slider rating con semaforo, bottoni Next rosso/Prev neutro, submit funzionante (nessuna modifica JS). Mobile: form usabile, navbar hamburger.

- [ ] **Step 3: Commit**

```bash
git add src/pages/form.html
git commit -m "[Feat] Apply new theme to Form page"
```

---

## Task 9: Pagina Players (`players.html` + `players.css`)

**Files:**
- Modify: `src/styles/players.css` (token; card giocatore con hover-lift)
- Modify: `src/pages/players.html` (colori inline nel modal + reveal)

**Interfaces:** Consumes: token, `.reveal`, `Icons`.

- [ ] **Step 1: Migrare `players.css` ai token**

Applicare la Migration Color Map a tutto `players.css`: sfondi card `#242d47/#1f2635`→`var(--surface)`/`var(--surface-2)`, bordi `#3a4560`→`var(--border)`, testo, e `.player-card` con:
```css
.player-card { border-radius: var(--radius); box-shadow: var(--shadow-sm);
  transition: transform .25s var(--ease), box-shadow .25s var(--ease), border-color .25s var(--ease); }
.player-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); border-color: var(--accent); }
```
Badge ruolo (`.role-setter/.role-banda/.role-opposite/.role-centrale/.role-libero`): mantenere colori distinti ma armonizzati (usare tinte con buon contrasto sul chiaro). `.btn-save`→`var(--accent)`; `.btn-secondary`→superficie neutra con bordo.

- [ ] **Step 2: Migrare i colori inline in `players.html`**

Nel modal e negli slider foto: `background:#1f2635`→`var(--surface-2)`, `#3a4560`→`var(--border)`, `#8892b0`→`var(--text-muted)`, `#242d47`→`var(--surface)`, `color:#f0f4f8`→`var(--text)`. Sostituire l'emoji header `👥` con `<span data-icon="players"></span>`. Aggiungere `class="reveal"` al contenitore.

- [ ] **Step 3: Verifica visiva**

Aprire players.html (modalità pubblica e, se possibile, admin). Expected: griglia roster con card che si sollevano, modal Add/Edit leggibile sul tema chiaro, upload foto + zoom/pan funzionanti (JS invariato), badge ruoli leggibili. Toggle scuro OK.

- [ ] **Step 4: Commit**

```bash
git add src/styles/players.css src/pages/players.html
git commit -m "[Feat] Apply new theme to Players page + roster cards"
```

---

## Task 10: Pagina Matches (`match-table.html` + `match-table.css` + `match-stats.css`)

**Files:**
- Modify: `src/styles/match-table.css`, `src/styles/match-stats.css`
- Modify: `src/pages/match-table.html` (molti colori inline in tabella stats + modali)

**Interfaces:** Consumes: token, `Icons`.

- [ ] **Step 1: Migrare i CSS ai token**

Applicare la Migration Color Map a `match-table.css` e `match-stats.css`: header tabella, righe, bordi `#3a4560`→`var(--border)`, sfondi `#242d47/#1f2635`→`var(--surface)/var(--surface-2)`. Righe hover con `background: var(--surface-2)`. `.stats-modal-content`, `.live-*` sui token. Le colonne colorate della stats table (service/errori/punti) → usare `rgba(var(--accent-rgb),.08)` per errori, `rgba(30,142,90,.10)` per punti, tinta brand per service.

- [ ] **Step 2: Migrare i colori inline in `match-table.html`**

Sostituire nelle tabelle e modali: `background-color:#1f2635/#242d47`→token, `border:1px solid #3a4560`→`1px solid var(--border)`, `rgba(91,124,250,.1)`→`rgba(var(--accent-rgb),.1)` o brand, `color:#f0f4f8/#8892b0`→token, `color:#999`→`var(--text-muted)`. Sostituire emoji header `🏆` con `<span data-icon="matches"></span>`. Le emoji semantiche nelle intestazioni stats (🏐⚠️🔥) possono restare (sono etichette, non icone UI) o diventare SVG a scelta; mantenerle per semplicità.

- [ ] **Step 3: Verifica visiva**

Aprire match-table.html. Expected: tabella partite leggibile sul chiaro, badge status semantici, modal Add Match, **Stats modal** (tabella larga con scroll orizzontale che resta usabile) e **Live Tracker** leggibili e funzionanti (JS invariato: aggiunta/modifica match, incremento stat, sync status). Toggle scuro OK.

- [ ] **Step 4: Commit**

```bash
git add src/styles/match-table.css src/styles/match-stats.css src/pages/match-table.html
git commit -m "[Feat] Apply new theme to Matches page, stats & live tracker modals"
```

---

## Task 11: Pagina Responses (`responses.html` + eventuale CSS)

**Files:**
- Modify: `src/pages/responses.html`
- Modify: eventuale CSS referenziato dalla pagina (verificare i `<link>` in testa)

**Interfaces:** Consumes: token, `Icons`, `.reveal`.

- [ ] **Step 1: Ispezionare e migrare**

Aprire `responses.html`, individuare i suoi `<link>` CSS e la struttura (liste/card di risposte). Applicare la Migration Color Map a colori inline e al CSS di pagina; card risposte con `.home-card`-like (raggio, ombra, hover-lift dove sono elementi cliccabili). Emoji header `📊` → `<span data-icon="responses"></span>`. Aggiungere `.reveal` ai blocchi principali.

- [ ] **Step 2: Verifica visiva**

Aprire responses.html. Expected: elenco risposte leggibile sul chiaro, eventuali grafici/statistiche coerenti, nessun testo illeggibile, toggle scuro OK. Dati/JS invariati.

- [ ] **Step 3: Commit**

```bash
git add src/pages/responses.html src/styles/*.css
git commit -m "[Feat] Apply new theme to Responses page"
```

---

## Task 12: Pagina Exercises pubblica (`public-exercises.html` + `public-exercises.css`)

**Files:**
- Modify: `src/styles/public-exercises.css`
- Modify: `src/pages/public-exercises.html`

**Interfaces:** Consumes: token, `Icons`, `.reveal`.

- [ ] **Step 1: Migrare CSS + inline**

Applicare la Migration Color Map a `public-exercises.css` e agli inline della pagina. Le card esercizio: raggio `var(--radius)`, `var(--shadow-sm)`, hover-lift con bordo `var(--accent)`. Emoji header `💪` → `<span data-icon="exercises"></span>`. `.reveal` sui gruppi.

- [ ] **Step 2: Verifica visiva**

Aprire public-exercises.html. Expected: database esercizi leggibile, card con hover coerente, filtri/ricerca (se presenti) funzionanti (JS invariato). Toggle scuro OK.

- [ ] **Step 3: Commit**

```bash
git add src/styles/public-exercises.css src/pages/public-exercises.html
git commit -m "[Feat] Apply new theme to public Exercises page"
```

---

## Task 13: Pagina AI Analysis (`ai-analysis.html` + `video-analysis.css`)

**Files:**
- Modify: `src/styles/video-analysis.css`
- Modify: `src/pages/ai-analysis.html`

**Interfaces:** Consumes: token, `Icons`, `.reveal`.

- [ ] **Step 1: Migrare CSS + inline**

Applicare la Migration Color Map a `video-analysis.css` e agli inline. Aree upload/video/report: superfici `var(--surface)/var(--surface-2)`, bordi tratteggiati upload `var(--border-strong)`, CTA `var(--accent)`. Emoji header `🎥` → `<span data-icon="ai"></span>`. `.reveal` sui pannelli.

- [ ] **Step 2: Verifica visiva**

Aprire ai-analysis.html. Expected: interfaccia analisi video leggibile sul chiaro, dropzone/pulsanti coerenti, flusso di analisi invariato (JS/API Gemini intatti). Toggle scuro OK.

- [ ] **Step 3: Commit**

```bash
git add src/styles/video-analysis.css src/pages/ai-analysis.html
git commit -m "[Feat] Apply new theme to AI Analysis page"
```

---

## Task 14: Pagina Manage / Upload Exercises (`upload-exercises.html` + `upload-exercises.css`)

**Files:**
- Modify: `src/styles/upload-exercises.css`
- Modify: `src/pages/upload-exercises.html`

**Interfaces:** Consumes: token, `Icons`, `.reveal`.

- [ ] **Step 1: Migrare CSS + inline**

Applicare la Migration Color Map a `upload-exercises.css` e agli inline. Form di upload/gestione: input sui token (già coperti da `styles.css` se usano gli elementi base), liste/card gestione con superfici token. Emoji header `⚙️` → `<span data-icon="manage"></span>`. `.reveal` sui blocchi.

- [ ] **Step 2: Verifica visiva**

Aprire upload-exercises.html. Expected: pannello gestione esercizi leggibile, form upload funzionante (JS invariato), toggle scuro OK.

- [ ] **Step 3: Commit**

```bash
git add src/styles/upload-exercises.css src/pages/upload-exercises.html
git commit -m "[Feat] Apply new theme to Manage/Upload page"
```

---

## Task 15: Pagina Player Detail (`player-detail.html` + `player-detail.css`)

**Files:**
- Modify: `src/styles/player-detail.css`
- Modify: `src/pages/player-detail.html`

**Interfaces:** Consumes: token, `Icons`, `.reveal`. **Nota:** questa pagina ha già "full 3D sets" (commit recenti) — verificare che il redesign non interferisca con eventuale codice 3D/canvas esistente.

- [ ] **Step 1: Ispezionare l'eventuale 3D esistente**

Aprire `player-detail.html` e `src/modules/players/player-detail.js`: identificare canvas/librerie già usate per i "3d sets". Non toccare quella logica; migrare solo colori/superfici circostanti ai token, assicurando contrasto della scena esistente sul nuovo sfondo.

- [ ] **Step 2: Migrare CSS + inline**

Applicare la Migration Color Map a `player-detail.css` e agli inline (head/nav già standardizzati in Task 4). Card statistiche/dettaglio giocatore con raggio/ombre token e hover dove cliccabili.

- [ ] **Step 3: Verifica visiva**

Aprire player-detail.html (con un giocatore reale). Expected: scheda dettaglio leggibile sul chiaro, eventuale visualizzazione 3D dei set ancora funzionante, statistiche coerenti. Toggle scuro OK.

- [ ] **Step 4: Commit**

```bash
git add src/styles/player-detail.css src/pages/player-detail.html
git commit -m "[Feat] Apply new theme to Player Detail page"
```

---

## Task 16: Pass finale — responsive, accessibilità, pulizia

**Files:**
- Modify: qualsiasi file con problemi emersi
- Delete (opzionale): `ChatGPT_Image_27_giu_2026_15_30_37.png` dalla root se confermato

**Interfaces:** nessuna nuova.

- [ ] **Step 1: Checklist responsive/accessibilità su tutte le pagine**

A larghezze 375px / 768px / 1200px verificare per ogni pagina: navbar hamburger, nessun overflow orizzontale, tabelle larghe con scroll interno, contrasto testo AA (chiaro e scuro), `prefers-reduced-motion` disattiva 3D e reveal. Annotare e correggere i difetti.

- [ ] **Step 2: Verificare che il vecchio `logo.png` non sia più referenziato**

```bash
grep -rn "assets/logo.png" src/pages src/modules src/styles
```
Expected: nessun risultato (tutte le pagine usano `logo-wapatanka.png`). Correggere eventuali residui.

- [ ] **Step 3: Verifica funzionale (logica intatta)**

Su ogni pagina con backend attivo: submit form, add/edit player, add/edit match + stats live, upload esercizio, analisi AI, dettaglio giocatore. Expected: tutto funziona come prima (nessuna regressione logica).

- [ ] **Step 4: Commit finale**

```bash
git add -A
git commit -m "[Polish] Responsive/a11y pass and cleanup for visual redesign"
```

---

## Self-Review (eseguito in fase di scrittura del piano)

**Spec coverage:** tema chiaro+toggle (Task 1,3), palette dal logo (Task 1), font moderni (Task 2), hero 3D Three.js pinnato+SRI+fallback (Task 6), micro-animazioni ingresso (Task 5 hero) e reveal-on-scroll (Task 3), card ridisegnate+hover (Task 5,9,12), icone SVG (Task 3,4,5+), navbar sticky/blur/scroll/hamburger (Task 4), responsive+a11y (Task 16), architettura theme.css unica fonte (Task 1) con refactor globale (Task 2 + Migration Map), logo integrato (Task 4), tutte le 8 pagine estese (Task 8–15). Business logic intatta (Global Constraints + verifiche funzionali). Nessun gap rilevato.

**Placeholder scan:** l'unico segnaposto intenzionale è `<HASH_CALCOLATO>` per l'SRI (Task 6 Step 1), che va calcolato al momento col comando fornito — non è un placeholder vago ma un valore da generare con istruzioni esatte.

**Type/naming consistency:** `ThemeToggle.toggle/apply`, `Icons.get(name)`, id `volleyballCanvas`, `themeToggleBtn`, `navToggle`, `navMenu`, `siteNav`, classi `.reveal/.is-visible`, `.btn-accent/.btn-ghost`, token `--brand/--accent/--surface/...` usati coerentemente tra i task.
