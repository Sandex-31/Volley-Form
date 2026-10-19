# Developing Wapatanka Volley Tool

🇮🇹 Versione italiana: [DEVELOPING.it.md](DEVELOPING.it.md)

This guide is for beginners. You don't need to know much about programming. Most of the work can be done by asking Claude Code, and this guide tells you (and Claude) how to do it safely.

---

## 1. How it works

- The site is made of **plain files**: HTML, CSS and JavaScript. There is no build step. The production server shows the files exactly as they are in the repository.
- The data (players, matches, exercises, …) lives in **Firebase Realtime Database**, an online database from Google.
- When you open the site on **your computer** (`localhost` or `127.0.0.1`), it does **not** use the real database. It uses the **Firebase emulator**: a fake copy of the database that runs only on your computer.
  This means **you can't break the real site** while you work. You can add, edit and delete anything.
- If the emulator is not running, the local site simply stays on "loading". It never falls back to the real database.

---

## 2. One-time setup

Check what you already have. In a terminal, type each command; if it prints a version number, it's installed:

```
git --version
node --version
java -version
gh --version
```

Install only what is missing:

| Tool | Windows (PowerShell) | macOS (Terminal) |
|---|---|---|
| Git | `winget install Git.Git` | `xcode-select --install` |
| Node.js LTS | `winget install OpenJS.NodeJS.LTS` | `brew install node` |
| Java 21 (needed by the emulator) | `winget install EclipseAdoptium.Temurin.21.JDK` | `brew install --cask temurin@21` |
| GitHub CLI | `winget install GitHub.cli` | `brew install gh` |

- **Windows:** after installing, close and reopen the terminal (and VS Code). If PowerShell says *"running scripts is disabled"*, run:
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- **macOS:** if `brew` is missing, install Homebrew first from https://brew.sh
- In VS Code, install the extension **Live Server** (`ritwickdey.LiveServer`). VS Code will also suggest it when you open the project.
- Log in to GitHub with **your own** account:
  `gh auth login` → GitHub.com → HTTPS → Login with a web browser

### Working on a remote dev server (VS Code Remote-SSH)

You can also work on a Linux dev server instead of your own computer. Connect with the VS Code extension **Remote - SSH** and open the project folder there. The commands below are the same.
VS Code forwards the server's ports to your computer automatically (see the **Ports** tab at the bottom). Make sure ports **5500**, **9000** and **4000** are listed. Then `http://127.0.0.1:5500` on your computer opens the site running on the server, still using the emulator.

---

## 3. Fork, clone and identity

The main repository is **https://github.com/Sandex-31/Volley-Form**. You don't change it directly: you work on your own copy (a **fork**) and then ask the owner to accept your changes with a **pull request**.

1. Create your fork and download it (only the first time):
   ```
   gh repo fork Sandex-31/Volley-Form --clone
   cd Volley-Form
   ```
   This creates two "remotes":
   - `origin` = your fork (you can push here)
   - `upstream` = the main repository (you only read from here)

   Check with `git remote -v`.
2. Tell git who you are (only for this project):
   ```
   git config user.name "Your Name"
   git config user.email "your-github-email@example.com"
   ```
   You can use the private "noreply" email that GitHub shows in **Settings → Emails**.

---

## 4. Daily routine

Run all commands from the main project folder (`Volley-Form`).

1. **Terminal 1 — start the local database:**
   ```
   npm --prefix dev install
   npm --prefix dev run db
   ```
   (`install` is needed only the first time.) Wait for *"All emulators ready"*. Leave this terminal open.
2. **Terminal 2 — copy the real data into the local database** (only the first time, or after a reset):
   ```
   npm --prefix dev run seed
   ```
   This only **reads** from the real database. It never writes to it.
3. **Open the site:** in VS Code click **Go Live** (bottom right), then open `http://127.0.0.1:5500`.
   In the browser console (F12) you should see: `🧪 LOCAL DEV: using Firebase emulator`.
4. **See the database:** open `http://127.0.0.1:4000` → *Realtime Database*. You can look at and edit the data here.
5. **Stop:** go to terminal 1 and press **Ctrl+C**. Your local data is saved in `dev/data/` and comes back next time.
6. **Reset to fresh data:** stop the emulator, delete the `dev/data` folder, start it again and run `seed`.

---

## 5. Adding a new page — checklist

Follow the same structure as the existing pages:

- [ ] The page goes in `src/pages/` (copy an existing page as a starting point).
- [ ] A small redirect file with the same name in the repository root (see `players.html`).
- [ ] Data access in a service in `src/services/`.
- [ ] Page logic in a module in `src/modules/<area>/`.
- [ ] CSS in `src/styles/`, using **only** the tokens from `theme.css` (no hardcoded colours).
- [ ] New Firebase paths added to `APP_CONSTANTS.FIREBASE_REFS` in `src/config/constants.js`. The seed script picks them up automatically.
- [ ] Add the menu link to the navbar of **every** page.
- [ ] All text the user sees is in **Italian**.
- [ ] Add `?v=` cache-busting to new `<script>` and `<link>` tags, like the existing ones.

---

## 6. Testing checklist

Before asking for a pull request:

- [ ] `node --check path/to/file.js` on every JavaScript file you changed (no output = OK).
- [ ] The page works in **light** and **dark** theme.
- [ ] The page works at **phone width** (browser F12 → device toolbar).
- [ ] In the browser's **Network** tab (F12), filter by `firebase`: there must be **no** requests to `firebasedatabase.app` while working locally.

---

## 7. Branch → commit → push → pull request

Never work directly on `main`. Every change gets its own branch.

```
git fetch upstream
git switch -c feat/short-name upstream/main
# ... make your changes ...
git add -A
git commit -m "[Feat] Short description of the change"
git push -u origin feat/short-name
gh pr create --repo Sandex-31/Volley-Form --base main
```

Commit messages follow the repo style: `[Feat]`, `[Fix]`, `[Chore]` + a short description.

**Keep your fork up to date** (after your pull requests are merged):

```
gh repo sync <your-username>/Volley-Form --source Sandex-31/Volley-Form
git switch main
git pull
```

Or, to update a branch you're working on: `git fetch upstream` then `git rebase upstream/main`.

---

## 8. Troubleshooting

| Problem | Solution |
|---|---|
| `java` not found / emulator won't start | Install Java 21 (section 2), then close and reopen the terminal. |
| *Port 9000 / 4000 / 5500 already in use* | Another emulator or Live Server is still running. Close the other terminal or VS Code window, or restart the computer. |
| PowerShell: *"running scripts is disabled"* | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Page stuck on "loading", no data | The emulator is not running. Start it with `npm --prefix dev run db`. (Remote-SSH: check that port 9000 is in the **Ports** tab.) |
| Seed says *"emulator is not running"* | Same as above: start the emulator first. |
| Git warnings about line endings (LF/CRLF) | Harmless. `.gitattributes` handles it. |
| Uploaded files/images | ⚠️ Uploads use **Supabase**, which is **not** emulated. Files uploaded locally go to the **real** storage. Avoid uploading test files, or delete them afterwards. |
| AI video analysis doesn't work | Expected. It needs a separate Python backend that isn't part of local development. |

> Note: `dev/database.rules.json` lets anyone read and write the **local** emulator. It is only used on your computer and never affects the real database.

---

## 9. Instructions for Claude (AI assistant)

If you are an AI assistant working on this repository:

- Read and follow `CLAUDE.md`.
- **Never** make `localhost` / `127.0.0.1` talk to the production database. Never remove or weaken the emulator check in `src/config/firebase.config.js`.
- **Never** write to production from scripts. `dev/seed.mjs` must only send GET requests to production.
- **Always ask the user before** `git commit`, `git push` and opening a pull request. Show a summary of the changes first.
- Work on a branch, never on `main`.
- Don't change existing production files unless the task needs it. Keep diffs small.
- Explain steps in simple words. The people working here are beginners.
