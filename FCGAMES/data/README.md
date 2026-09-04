# Question Data

Content is organized **by class, then by subject**:

```
data/
  class-1/   hindi/  english/  maths/  gk/
  class-2/   hindi/  english/  maths/  gk/
  class-3/   hindi/  english/  maths/  twau/   (TWAU = The World Around Us / EVS)
  class-4/   hindi/  english/  maths/  twau/
  class-5/   hindi/  english/  maths/  twau/
```

Class 1 & 2 use the subjects **Hindi, English, Maths, GK**.
Class 3, 4 & 5 use the subjects **Hindi, English, Maths, TWAU (EVS)**.

Empty subject folders contain a `.gitkeep` placeholder just so the folder
exists in the repo - delete it once you add your first topic file there.

## Adding new questions - just drop the file in, nothing else to edit

1. Create a topic JSON file with this shape:
   ```json
   {
     "class": 2,
     "subject": "Hindi",
     "topic": "Your Topic Name",
     "questions": [
       {
         "id": "unique-id-1",
         "type": "mcq",
         "question": "Your question text?",
         "options": ["A", "B", "C", "D"],
         "answer": "A",
         "difficulty": "easy"
       }
     ]
   }
   ```
   - `class` must match the folder's class number.
   - `subject` must match the subject name exactly as used in the app
     (case-insensitive): `Hindi`, `English`, `Maths`, `GK`, or `TWAU (EVS)`.
   - `id` should be unique across all your question files.
   - Other question types support `image`, `pairs`, `items`, etc. - see
     `sample-all-question-types.json` in the project root for examples.

2. Save it inside the matching folder, e.g. `data/class-2/hindi/my-topic.json`.

3. **You do not need to touch `manifest.json` by hand.** Run:
   ```
   node scripts/generate-manifest.js
   ```
   This scans every `data/class-*/*/*.json` file and rebuilds
   `data/manifest.json` automatically (it reads the `class`/`subject`/`topic`
   straight out of your file, so there's nothing to duplicate or forget).

   If this repo is on GitHub, `.github/workflows/build-manifest.yml` runs
   this same script automatically on every push that touches a file under
   `data/class-*/`, and commits the updated `manifest.json` for you - so in
   that case even step 3 is optional, just push your new topic file.

The Admin Question Builder in the app is a second, separate way to add
questions (saved in the browser's local storage) without touching these
files at all.
