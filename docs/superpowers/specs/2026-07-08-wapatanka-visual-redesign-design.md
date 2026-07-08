# Wapatanka — Rinnovo Design Visivo

**Data**: 2026-07-08
**Stato**: Approvato (direzione) — in attesa di revisione spec

## Obiettivo

Rinnovare la parte visiva (HTML/CSS/JS) della web app "Wapatanka - Volley Tool"
con un design moderno, interattivo, a tema pallavolo, mantenendo **intatta tutta
la logica funzionale** (form, fetch dati, routing, chiamate Firebase). Si tocca
solo markup, stili e animazioni; nessuna modifica alla business logic.

## Contesto tecnico (stack esistente)

- **Frontend**: HTML/CSS/JS vanilla, nessun bundler. Script caricati con `<script src>`.
- **Backend**: Firebase Functions (`functions/`) — non toccato.
- **Firebase SDK**: caricato via CDN (compat 9.23.0) nelle pagine.
- **Struttura**:
  - Pagine: `src/pages/` (index, form, public-exercises, responses, match-table,
    players, ai-analysis, upload-exercises, player-detail)
  - Moduli JS: `src/modules/<feature>/` — **business logic, da non toccare**
  - Servizi/config/common: `src/services/`, `src/config/`, `src/common/`
  - Stili: `src/styles/` — `styles.css` (globale) + `navbar.css` (globale) +
    un CSS per pagina
  - Asset: `src/assets/logo.png` (vecchio), nuovo logo in root da integrare
- **Stato attuale**: tema SCURO (navy `#1a1f3a`/`#16213e`, accento blu-viola
  `#5b7cfa`), navbar sticky con blur già presente, emoji come icone, nessuna
  animazione 3D. Colori hardcoded sparsi in ogni CSS.

## Decisioni di design (approvate)

1. **Base tema**: chiaro come default + **toggle** per tema scuro.
2. **Accento**: rosso + navy, estratti dai pixel del nuovo logo.
3. **Elemento 3D**: palla da volley in **Three.js** (CDN), solo nella home.

## Palette (bloccata dai colori del logo)

Colori brand campionati dai pixel di `ChatGPT_Image_27_giu_2026_15_30_37.png`:

| Ruolo | HEX |
|---|---|
| Navy (primario/struttura/testo) | `#0D1A3C` |
| Rosso (azione/CTA/highlight) | `#B22823` |

**Tema chiaro (default)**
- Sfondo `#FFFFFF`, superfici `#F4F6FB`, card bianche con ombra morbida
- Testo primario navy `#0D1A3C`, secondario `#5A6478`
- Struttura/navbar/link = navy; CTA e stati attivi = rosso `#B22823` (hover `#9A211C`)

**Tema scuro (toggle)**
- Sfondo navy `#0A142E`, superfici `#16223F`, testo `#E8ECF4`
- Rosso schiarito `#D94A44` per contrasto AA su fondo scuro

## Architettura CSS

**Nuovo file `src/styles/theme.css`** = unica fonte di verità, caricato **per
primo** su ogni pagina. Contiene:

- CSS custom properties (`:root`) per colori, ombre, raggi, spaziature, font,
  durate transizioni — per il tema chiaro.
- Override `:root[data-theme="dark"]` per il tema scuro (stesse variabili, valori invertiti).
- Import dei font (Sora/Space Grotesk + Inter) via CDN `@import`/`<link>`.
- Utility di animazione condivise (`.reveal`, keyframes fade/slide) e helper responsive.

`styles.css`, `navbar.css` e i CSS di pagina vengono **rifattorizzati per
consumare le variabili** invece dei colori hardcoded. Cambiare palette = un solo punto.

**Toggle tema**: piccolo script condiviso `src/common/theme-toggle.js` che
imposta `data-theme` su `<html>`, lo persiste in `localStorage`, e rispetta
`prefers-color-scheme` al primo accesso. Un pulsante toggle nella navbar.

## Componenti

### Tipografia
- Titoli: **Sora** (default; Space Grotesk come alternativa equivalente) — geometrico, sportivo, peso 700–800.
- Testo: **Inter**. Gerarchia chiara di dimensioni/pesi definita in `theme.css`.
- Caricamento via `<link>` Google Fonts con `display=swap`; fallback sans-serif di sistema.

### Navbar (globale — `navbar.css`)
- Sticky con blur già presente, sfondo che si **intensifica allo scroll**
  (classe `.scrolled` aggiunta via listener scroll leggero).
- Link con underline animato; stato attivo in rosso.
- **Menu hamburger mobile** vero: sotto ~768px il menu collassa in un pannello
  a scomparsa con pulsante hamburger (sostituisce l'attuale wrap poco elegante).
- Logo nuovo integrato.

### Hero home (`index.html` + `home.css`)
- Layout a due colonne: a sinistra titolo + sottotitolo + CTA (Rate Training /
  View Matches); a destra **palla da volley Three.js** (bianca con cuciture
  navy/rosse coerenti col pallone del logo) che ruota lenta e reagisce al mouse (parallax).
- Three.js caricato via CDN con **versione pinnata** (vedi sezione Dipendenze),
  `defer`; init in nuovo file `src/modules/home/volleyball-3d.js`.
- **Strategia fallback** (nessuna esclusione per classe di dispositivo — i
  telefoni provano a caricare la scena; fallback solo in caso di problemi reali):
  1. Se `prefers-reduced-motion: reduce` → salta il 3D a priori.
  2. Altrimenti si tenta di inizializzare la scena su tutti i dispositivi,
     telefoni inclusi.
  3. Fallback all'immagine/animazione CSS statica **solo** se: WebGL non
     disponibile (`getContext('webgl')` fallisce), lo script Three.js non carica
     (errore o timeout), o l'init lancia un'eccezione.
  - Accorgimenti prestazionali (non gating, sempre attivi): `devicePixelRatio`
    limitato (max ~2), `antialias` off su schermi ad alta densità, animazione in
    pausa quando la tab non è visibile (`visibilitychange`).
- Micro-animazioni d'ingresso a cascata (fade/slide-in) su titolo, testo, bottoni.

### Card (home + pagine)
- Raggi coerenti (~16px), ombre morbide a due livelli.
- Hover: `translateY(-6px)` + scala lieve + bordo/ombra accento.
- **Icone SVG inline** leggere al posto delle emoji (volley, calendario,
  roster, statistiche, ecc.). Stack vanilla senza partial server-side: le icone
  sono SVG inline nel markup, con un helper JS condiviso opzionale
  (`src/common/icons.js`) che restituisce l'SVG per nome per evitare duplicazione.

### Animazioni / accessibilità
- `IntersectionObserver` per reveal-on-scroll delle sezioni (script condiviso leggero).
- `prefers-reduced-motion: reduce` → disattiva 3D e reveal, mantiene layout usabile.
- Contrasto testo AA mantenuto in entrambi i temi.

## Logo

Copiare il nuovo logo in `src/assets/logo-wapatanka.png` (nome pulito). Usato in
navbar e hero. Il file sorgente in root resta finché non confermata la sostituzione.

## Nuovi file / dipendenze

**Nuovi file**
- `src/styles/theme.css` — variabili + temi + utility
- `src/common/theme-toggle.js` — toggle chiaro/scuro
- `src/common/scroll-reveal.js` — IntersectionObserver condiviso (o incluso in theme-toggle)
- `src/modules/home/volleyball-3d.js` — scena Three.js della hero
- `src/assets/logo-wapatanka.png` — nuovo logo

**Dipendenze esterne (CDN, no npm sul frontend)**
- **Three.js — versione PINNATA a un tag esatto** (es. `three@0.160.0`), mai
  `latest`/major flottante, così un cambio di versione sul CDN non rompe la scena
  senza preavviso. Caricato solo in `index.html` da un CDN che espone build
  con hash immutabile (es. `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js`).
  Aggiungere attributo **`integrity` (SRI)** + `crossorigin="anonymous"`
  calcolando l'hash sha384 della build pinnata in fase di implementazione
  (jsdelivr/unpkg supportano SRI). Se in futuro serve un modulo aggiuntivo
  (es. controlli orbit), pinnare alla **stessa** versione esatta.
- Google Fonts: Sora/Space Grotesk + Inter (tutte le pagine) — anch'essi con
  URL versionato fornito da Google Fonts.

## Ordine di implementazione

1. `theme.css` (variabili + temi) e refactor `styles.css`/`navbar.css` per usarle.
2. Toggle tema + scroll-reveal condivisi + navbar modernizzata (hamburger mobile).
3. **Home** (`index.html`): hero + Three.js + card ridisegnate + icone SVG →
   pagina di riferimento.
4. Estendere lo stesso linguaggio (navbar/card/palette/font/icone) alle altre 8
   pagine: form, public-exercises, responses, match-table, players, ai-analysis,
   upload-exercises, player-detail — senza reinventare lo stile.
5. Verifica responsive/mobile + accessibilità su ogni pagina.

## Fuori scope (YAGNI)

- Nessuna modifica alla logica di business, ai servizi dati, alla validazione,
  al routing o al backend.
- Nessun bundler/npm sul frontend: si resta su CDN e script tag.
- Nessun redesign del contenuto/informazioni: solo presentazione visiva.

## Criteri di successo

- Tutte le pagine condividono palette, font, navbar e stile card coerenti,
  guidati da `theme.css`.
- Toggle chiaro/scuro funzionante e persistente, contrasto AA in entrambi.
- Home con palla 3D interattiva (con fallback) e micro-animazioni fluide.
- Navbar con hamburger mobile funzionante; tutto responsive.
- Logica esistente invariata e funzionante (form invio, fetch dati, ecc.).
