# Sviluppare Wapatanka Volley Tool

🇬🇧 English version: [DEVELOPING.md](DEVELOPING.md)

Questa guida è per principianti. Non serve sapere molto di programmazione. Gran parte del lavoro si può fare chiedendo a Claude Code, e questa guida spiega a te (e a Claude) come farlo in sicurezza.

---

## 1. Come funziona

- Il sito è fatto di **file semplici**: HTML, CSS e JavaScript. Non c'è nessuna "build". Il server di produzione mostra i file esattamente come sono nel repository.
- I dati (giocatori, partite, esercizi, …) stanno in **Firebase Realtime Database**, un database online di Google.
- Quando apri il sito **sul tuo computer** (`localhost` o `127.0.0.1`), **non** usa il database vero. Usa l'**emulatore Firebase**: una copia finta del database che gira solo sul tuo computer.
  Quindi **non puoi rompere il sito vero** mentre lavori. Puoi aggiungere, modificare e cancellare quello che vuoi.
- Se l'emulatore non è acceso, il sito locale resta semplicemente su "caricamento". Non usa mai il database vero al suo posto.

---

## 2. Installazione (una volta sola)

Controlla cosa hai già. In un terminale scrivi questi comandi uno alla volta; se compare un numero di versione, è installato:

```
git --version
node --version
java -version
gh --version
```

Installa solo quello che manca:

| Strumento | Windows (PowerShell) | macOS (Terminale) |
|---|---|---|
| Git | `winget install Git.Git` | `xcode-select --install` |
| Node.js LTS | `winget install OpenJS.NodeJS.LTS` | `brew install node` |
| Java 21 (serve all'emulatore) | `winget install EclipseAdoptium.Temurin.21.JDK` | `brew install --cask temurin@21` |
| GitHub CLI | `winget install GitHub.cli` | `brew install gh` |

- **Windows:** dopo l'installazione chiudi e riapri il terminale (e VS Code). Se PowerShell dice *"l'esecuzione di script è disabilitata"*, scrivi:
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- **macOS:** se manca `brew`, installa prima Homebrew da https://brew.sh
- In VS Code installa l'estensione **Live Server** (`ritwickdey.LiveServer`). VS Code te la suggerisce anche quando apri il progetto.
- Fai il login su GitHub con il **tuo** account:
  `gh auth login` → GitHub.com → HTTPS → Login with a web browser

### Lavorare su un server di sviluppo remoto (VS Code Remote-SSH)

Puoi anche lavorare su un server Linux di sviluppo invece che sul tuo computer. Collegati con l'estensione di VS Code **Remote - SSH** e apri lì la cartella del progetto. I comandi qui sotto sono gli stessi.
VS Code inoltra automaticamente le porte del server sul tuo computer (guarda la scheda **Porte** / **Ports** in basso). Controlla che ci siano le porte **5500**, **9000** e **4000**. Così `http://127.0.0.1:5500` sul tuo computer apre il sito che gira sul server, e usa sempre l'emulatore.

---

## 3. Fork, clone e identità

Il repository principale è **https://github.com/Sandex-31/Volley-Form**. Non lo modifichi direttamente: lavori su una tua copia (un **fork**) e poi chiedi al proprietario di accettare le modifiche con una **pull request**.

1. Crea il tuo fork e scaricalo (solo la prima volta):
   ```
   gh repo fork Sandex-31/Volley-Form --clone
   cd Volley-Form
   ```
   Questo crea due "remote":
   - `origin` = il tuo fork (qui puoi fare push)
   - `upstream` = il repository principale (da qui leggi soltanto)

   Controlla con `git remote -v`.
2. Di' a git chi sei (solo per questo progetto):
   ```
   git config user.name "Il Tuo Nome"
   git config user.email "la-tua-email-github@example.com"
   ```
   Puoi usare l'email privata "noreply" che GitHub mostra in **Settings → Emails**.

---

## 4. Routine di tutti i giorni

Lancia tutti i comandi dalla cartella principale del progetto (`Volley-Form`).

1. **Terminale 1 — avvia il database locale:**
   ```
   npm --prefix dev install
   npm --prefix dev run db
   ```
   (`install` serve solo la prima volta.) Aspetta il messaggio *"All emulators ready"*. Lascia questo terminale aperto.
2. **Terminale 2 — copia i dati veri nel database locale** (solo la prima volta, o dopo un reset):
   ```
   npm --prefix dev run seed
   ```
   Questo comando **legge** soltanto dal database vero. Non ci scrive mai.
3. **Apri il sito:** in VS Code clicca **Go Live** (in basso a destra), poi apri `http://127.0.0.1:5500`.
   Nella console del browser (F12) devi vedere: `🧪 LOCAL DEV: using Firebase emulator`.
4. **Guarda il database:** apri `http://127.0.0.1:4000` → *Realtime Database*. Qui puoi vedere e modificare i dati.
5. **Fermare:** vai nel terminale 1 e premi **Ctrl+C**. I dati locali vengono salvati in `dev/data/` e tornano la volta dopo.
6. **Ripartire da dati freschi:** ferma l'emulatore, cancella la cartella `dev/data`, riavvialo e lancia di nuovo `seed`.

---

## 5. Aggiungere una nuova pagina — checklist

Segui la stessa struttura delle pagine che ci sono già:

- [ ] La pagina va in `src/pages/` (copia una pagina esistente come punto di partenza).
- [ ] Un piccolo file di redirect con lo stesso nome nella cartella principale del repository (vedi `players.html`).
- [ ] L'accesso ai dati in un service in `src/services/`.
- [ ] La logica della pagina in un modulo in `src/modules/<area>/`.
- [ ] Il CSS in `src/styles/`, usando **solo** i token di `theme.css` (niente colori scritti a mano).
- [ ] I nuovi percorsi Firebase aggiunti a `APP_CONSTANTS.FIREBASE_REFS` in `src/config/constants.js`. Lo script di seed li prende automaticamente.
- [ ] Aggiungi il link al menu nella navbar di **tutte** le pagine.
- [ ] Tutti i testi che vede l'utente sono in **italiano**.
- [ ] Aggiungi `?v=` (cache-busting) ai nuovi tag `<script>` e `<link>`, come quelli esistenti.

---

## 6. Checklist di test

Prima di chiedere una pull request:

- [ ] `node --check percorso/del/file.js` su ogni file JavaScript che hai modificato (nessun messaggio = OK).
- [ ] La pagina funziona con il tema **chiaro** e **scuro**.
- [ ] La pagina funziona con la **larghezza di un telefono** (F12 nel browser → modalità dispositivo).
- [ ] Nella scheda **Network** del browser (F12), filtra per `firebase`: **non** devono esserci richieste a `firebasedatabase.app` mentre lavori in locale.

---

## 7. Branch → commit → push → pull request

Non lavorare mai direttamente su `main`. Ogni modifica ha il suo branch.

```
git fetch upstream
git switch -c feat/nome-breve upstream/main
# ... fai le tue modifiche ...
git add -A
git commit -m "[Feat] Breve descrizione della modifica"
git push -u origin feat/nome-breve
gh pr create --repo Sandex-31/Volley-Form --base main
```

I messaggi di commit seguono lo stile del repo: `[Feat]`, `[Fix]`, `[Chore]` + una breve descrizione.

**Tenere aggiornato il tuo fork** (dopo che le tue pull request sono state accettate):

```
gh repo sync <il-tuo-username>/Volley-Form --source Sandex-31/Volley-Form
git switch main
git pull
```

Oppure, per aggiornare un branch su cui stai lavorando: `git fetch upstream` e poi `git rebase upstream/main`.

---

## 8. Problemi comuni

| Problema | Soluzione |
|---|---|
| `java` non trovato / l'emulatore non parte | Installa Java 21 (sezione 2), poi chiudi e riapri il terminale. |
| *Porta 9000 / 4000 / 5500 già in uso* | Un altro emulatore o Live Server è ancora acceso. Chiudi l'altro terminale o finestra di VS Code, oppure riavvia il computer. |
| PowerShell: *"l'esecuzione di script è disabilitata"* | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Pagina bloccata su "caricamento", nessun dato | L'emulatore non è acceso. Avvialo con `npm --prefix dev run db`. (Con Remote-SSH: controlla che la porta 9000 sia nella scheda **Porte**.) |
| Il seed dice *"emulator is not running"* | Come sopra: avvia prima l'emulatore. |
| Avvisi di git sui fine riga (LF/CRLF) | Sono innocui. Ci pensa `.gitattributes`. |
| File/immagini caricati | ⚠️ I caricamenti usano **Supabase**, che **non** è emulato. I file caricati in locale vanno nello storage **vero**. Evita di caricare file di prova, oppure cancellali dopo. |
| L'analisi video con AI non funziona | È normale. Serve un backend Python separato che non fa parte dello sviluppo locale. |

> Nota: `dev/database.rules.json` permette a chiunque di leggere e scrivere nell'emulatore **locale**. Si usa solo sul tuo computer e non tocca mai il database vero.

---

## 9. Istruzioni per Claude (assistente AI)

Se sei un assistente AI che lavora su questo repository:

- Leggi e segui `CLAUDE.md`.
- **Mai** far parlare `localhost` / `127.0.0.1` con il database di produzione. Non togliere né indebolire il controllo dell'emulatore in `src/config/firebase.config.js`.
- **Mai** scrivere in produzione dagli script. `dev/seed.mjs` deve fare solo richieste GET verso la produzione.
- **Chiedi sempre all'utente prima di** `git commit`, `git push` e di aprire una pull request. Mostra prima un riepilogo delle modifiche.
- Lavora su un branch, mai su `main`.
- Non modificare i file di produzione esistenti se il compito non lo richiede. Mantieni le modifiche piccole.
- Spiega i passaggi con parole semplici. Chi lavora qui è principiante.
