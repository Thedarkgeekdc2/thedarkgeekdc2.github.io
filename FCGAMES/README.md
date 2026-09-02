# Flashcard Champ

A colourful, tap-to-answer flashcard game for primary-school students (currently
Class 3–4, Maths and Hindi), with a full browser-based Admin Panel for teachers
to add questions, manage topics, and customise branding — no server or
database required. It runs as plain static files, so it can be hosted for
free on GitHub Pages.

---

## Contents
1. [Quick start (run it locally)](#quick-start-run-it-locally)
2. [Deploying to GitHub Pages](#deploying-to-github-pages)
3. [Using the app — students](#using-the-app--students)
4. [Using the Admin Panel — teachers](#using-the-admin-panel--teachers)
5. [Question JSON format reference](#question-json-format-reference)
6. [Important things to know](#important-things-to-know)
7. [Project structure](#project-structure)
8. [Development history](#development-history)

---

## Quick start (run it locally)
This is a static site — no build step, no install. From this folder, run:

```
python -m http.server 8000
```

Then open **http://127.0.0.1:8000/** in a browser.

(A plain double-click on `index.html` will *not* work fully — some browsers
block module/script loading from the `file://` protocol. Always use a local
server, even a simple one like the command above.)

---

## Deploying to GitHub Pages
1. Push this project's contents to a GitHub repository — the whole folder,
   including the hidden `.nojekyll` file.
2. In the repo, go to **Settings → Pages**, set **Source** to the branch you
   pushed (e.g. `main`) and the root folder, then save.
3. Your site publishes at `https://<username>.github.io/<repo-name>/` (or
   `https://<username>.github.io/` for a user/organization page). Every asset
   in this project uses a relative path, so it works the same at either kind
   of address — nothing to configure.
4. There is no offline service worker, so every visit loads the latest
   deployed files directly — no stale cache to worry about after you push an
   update.

---

## Using the app — students
1. Open the site → pick a **Class** → pick a **Subject** → pick a **Topic**
   → pick a **Difficulty**.
2. Answer each flashcard by tapping — no typing is required anywhere in the
   game.
3. At the end, a results screen shows the score, and the student can play
   again or pick a new topic.

---

## Using the Admin Panel — teachers

Go to `admin/login.html` (linked from the game footer). Default login:

| Field | Default value |
|---|---|
| Username | `admin` |
| Password | `KV2KGP` |

**Change this password** — it's stored in plain text in
`config/admin-config.json`, which is a public file on a static site (anyone
who opens their browser's dev tools can read it). This is fine for
classroom-level "don't let students poke around" protection, but it is
**not** real security — there's no backend to enforce anything stronger on a
free static host. To change it, edit `adminPassword` in
`config/admin-config.json` and push the change.

Once logged in, the **Dashboard** links to every tool:

- **Question Builder** — create or edit a question of any supported type,
  with a live preview. See the [format reference](#question-json-format-reference)
  below for what each type needs.
- **Question Library** — search, filter, edit, or delete questions (built-in
  and custom). Shows a 🖼️ badge on any question that has an image attached.
- **Classes & Subjects (Catalog)** — add new classes/subjects so they appear
  in the Builder and in the student pickers.
- **Topics** — add or remove topics per class/subject.
- **Images** — every image currently used by a question, with a broken-link
  check and a one-tap "copy path" button, plus the curated asset library from
  `data/media-manifest.json`. Since this is a static site there's no upload
  button that saves anywhere — add new image files into
  `assets/images/<subject>/<folder>/` yourself (via GitHub or your editor),
  then reference that path. A small preview tool lets you check an image
  from your own device and get a suggested path first.
- **Settings** — school name, footer text, theme, and game rules (questions
  per game, lives, timer, points, streaks). See the caveat below.
- **Data Tools** — Import a questions JSON file, Export your custom
  questions, or take a full Backup/Restore. See the caveat below.

---

## Question JSON format reference
Every topic file (built-in or imported) looks like this:

```json
{
  "class": 3,
  "subject": "maths",
  "topic": "Addition",
  "questions": [ /* one object per question, shapes below */ ]
}
```

A downloadable file with a **working example of all 11 supported types** —
already tested against the app's own import checker — is available:
`sample-all-question-types.json` (ask for it again any time). Quick
reference for each type's shape:

```jsonc
// mcq / choose_answer / odd_one_out — plain options
{ "id": "q1", "type": "mcq", "question": "2 + 2 = ?",
  "options": ["3","4","5","6"], "answer": "4", "difficulty": "easy" }

// true_false — answer is a boolean
{ "id": "q2", "type": "true_false", "question": "A week has 7 days.",
  "answer": true, "difficulty": "easy" }

// yes_no — answer is the string "Yes" or "No"
{ "id": "q3", "type": "yes_no", "question": "Is 10 even?",
  "answer": "Yes", "difficulty": "easy" }

// image_based / image_mcq — one image + plain options
{ "id": "q4", "type": "image_based", "question": "What time is shown?",
  "image": "assets/images/maths/clocks/clock-0300.svg",
  "options": ["2:00","3:00","4:00"], "answer": "3:00", "difficulty": "easy" }

// identify_picture — options can each carry their own image
// (mix plain strings and image options freely)
{ "id": "q5", "type": "identify_picture", "question": "Which one is the elephant?",
  "options": [
    { "answer": "Elephant", "label": "Elephant", "image": "assets/images/hindi/pictures/elephant.svg" },
    { "answer": "Horse", "label": "Horse", "image": "assets/images/hindi/pictures/horse.svg" },
    "Lion"
  ], "answer": "Elephant", "difficulty": "easy" }

// match — pairs, no "answer" field needed
{ "id": "q6", "type": "match", "question": "Match the shape to its sides.",
  "pairs": [ { "left": "Triangle", "right": "3" }, { "left": "Square", "right": "4" } ],
  "difficulty": "medium" }

// drag_drop — "target" can optionally show a picture instead of plain text
{ "id": "q7", "type": "drag_drop", "question": "Drag each item to its picture.",
  "pairs": [ { "drag": "1/2", "target": "Half", "image": "assets/images/maths/fractions/half.svg" } ],
  "difficulty": "medium" }

// arrange_order — items + the correct order
{ "id": "q8", "type": "arrange_order", "question": "Smallest to largest.",
  "items": ["45","12","78"], "answer": ["12","45","78"], "difficulty": "medium" }
```

**Not supported:** typing-based answers (Fill in the Blank / One Word).
Every question type is tap-to-answer.

Importing a file: **Admin → Data Tools → Import**. It merges by `id` — a
question with a new `id` is added, a matching existing `id` is updated.

---

## Important things to know

**Everything you do in the Admin Panel is saved to that one browser only.**
This app has no server or database — Question Builder saves, JSON imports,
Settings changes (including the school name), Catalog/Topic edits — all of
it is written to that browser's `localStorage`, on that one device.

- A student (or you, on a different device/browser) will **not** see
  anything you added this way. They'll only ever see what's actually in the
  project's files on GitHub.
- Clearing that browser's site data/cache will erase everything you added.
- To make something appear for **everyone**, permanently, you must edit the
  actual project files and push the change to GitHub:
  - New/changed questions → add them to a file in `data/<subject>/` and list
    it in `data/manifest.json`.
  - Default school name shown to first-time visitors → edit the fallback
    text in `index.html` (search for `PM SHRI KV 2 KGP`) and the `DEFAULTS`
    object in `js/storage/settings-store.js`.
  - Admin password → `config/admin-config.json`.
- **Use Data Tools → Export / Backup regularly** and keep the downloaded
  file somewhere safe — it's the only copy of anything you've built through
  the Admin Panel that lives outside that one browser.

---

## Project structure
```
index.html            Student app entry point (single page, js/app.js)
admin/                 Admin Panel pages (login, dashboard, builder, etc.)
js/app.js              Student game engine
js/admin/              Admin Panel logic
js/storage/            localStorage-backed data layer (settings, catalog, custom questions)
js/data/loader.js      Loads and merges built-in + custom questions
js/media/              Image validation/preload helpers
data/                  Built-in question files + manifest.json + media-manifest.json
config/                Reference-only JSON (admin login, defaults)
styles/                CSS, one file per page/section
assets/                Icons and question images
```

---

## Development history
<details>
<summary>Phase-by-phase build notes (click to expand)</summary>

- **Phase 3 Fixed** — Single non-module `js/app.js` entry point so the home
  screen never disappears if ES-module loading fails.
- **Phase 4** — Manifest-driven question loading, basic JSON validation.
- **Phase 5** — Arrange Order fixes, image manager utilities, click-to-enlarge,
  broken-image fallback.
- **Phase 6** — Admin Login foundation, Admin Dashboard shell.
- **Phase 7** — Real Question Builder for all question types, live preview.
- **Phase 8** — Working Drag & Drop (desktop + touch), Question Library.
- **Phase 9** — JSON Import/Export, Backup/Restore, Topic Manager.
- **Phase 10 (+ 4 follow-up fixes)** — Dynamic Class/Subject catalog wired
  through every admin page and the student pickers.
- **Phase 11** — Admin Settings: branding, footer, game rules, theme.
- **Phase 12 — Final release** — PWA manifest + offline service worker,
  mobile/accessibility polish, admin session hardening.
- **Phase 13 — GitHub Pages release**
  - Removed the offline service worker and its cache (a plain static site
    now); added `.nojekyll` for GitHub Pages.
  - Removed the two typing-based question types (Fill in the Blank, One
    Word) everywhere — game, Builder, Library, import validator. The 13
    built-in questions that used them were converted to multiple choice
    with the same content.
  - Finished image support across every question type: `image_mcq` is now
    buildable in the Question Builder, every type can carry an optional
    image, options can carry their own image, and Drag & Drop targets can
    use a picture.
  - Added the **Admin → Images** page (previously a "Coming next"
    placeholder): usage gallery with broken-link checking, asset library
    browser, copy-path buttons, and a local file-preview tool.
  - Corrected a stale `data/media-manifest.json` that had drifted out of
    sync with the actual `assets/images` folder.
  - Added Google's "Baloo 2" — a rounded, playful font covering both
    English and Hindi — across the student-facing pages only.
  - Minor fixes: a missing status element on the Topics admin page, and a
    stray-object bug in the Question Builder's "+ Add Pair" button.

</details>
