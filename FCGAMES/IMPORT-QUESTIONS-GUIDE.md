![Flashcard Champ](https://img.shields.io/badge/Flashcard%20Champ-AI%20Question%20Generator-6c4df0?style=for-the-badge)
![Steps](https://img.shields.io/badge/Steps-6%20Easy%20Steps-1fb579?style=for-the-badge)
![Level](https://img.shields.io/badge/Level-Beginner%20Friendly-ffb020?style=for-the-badge)

# 🧠✨ AI Se Questions Banao — Import Guide

> 🎯 **Is guide se aap sirf ek chapter ki PDF se, AI (Claude/ChatGPT) ki madad se, poora question bank 5 minute me bana sakte ho — bina ek bhi line code likhe!**

---

## 📦 Kya Chahiye (What you need)

| # | Cheez | Kahan se milegi |
|---|-------|------------------|
| 1️⃣ | 📄 **Sample JSON file** | Admin Panel se download hogi (Step 1 me batayenge) |
| 2️⃣ | 📖 **Chapter/Lesson ki PDF** | Aapki textbook / notes |
| 3️⃣ | 🤖 **Claude ya ChatGPT** | claude.ai ya chatgpt.com |
| 4️⃣ | ⏱️ **5 minute** | Bas! |

---

## 🪜 6 Aasaan Steps

### 1️⃣ 📥 Sample JSON Download Karo

Apne Admin Panel me jao:

```
Admin → Import Export→ "📥 Download Sample" button dabao
```

Isse `sample-all-question-types.json` naam ki file download hogi. Is file me app ke **saare 11 question types** ka ek-ek example already bana hua hai — ye file AI ko "sahi format" sikhane ke kaam aayegi. 🧩

> 💡 **Tip:** Is file ko dobara mat likhna — bas aage AI ko dikhane ke liye use hoga.

---

### 2️⃣ 📤 Dono Files AI Ko Upload Karo

1. **Claude** ([claude.ai](https://claude.ai)) ya **ChatGPT** ([chatgpt.com](https://chatgpt.com)) khol lo.
2. Ek **naya chat** shuru karo.
3. **Do files attach karo** (📎 button se):
   - 📄 Wahi **Sample JSON** jo Step 1 me download ki
   - 📖 Us **Chapter ki PDF** jiska game banana hai

---

### 3️⃣ 📝 Magic Prompt Copy-Paste Karo

Neeche diya hua **ready-made prompt** copy karo, `[  ]` wali jagah apni details bhar do, aur AI ko bhej do. Poora prompt niche "📝 Copy-Paste Prompt" section me hai. 👇

---

### 4️⃣ 🔢 Questions Ki Ginti (Count) Set Karo

Prompt ke andar hi ek jagah likha hai **"[TOTAL QUESTIONS]"** — bas wahan number daal do (jaise `15` ya `25`). AI utne hi questions banayega. Zyada chapter bada ho to zyada number rakh sakte ho. 📊

---

### 5️⃣ 💾 JSON Download Karke Import Karo

1. AI jo JSON reply dega, use **poora copy** karo.
2. Kisi bhi text editor (Notepad, ya phone me Notes app) me paste karke `.json` extension se save karo — jaise `chapter1-questions.json`.
3. Wapas Admin Panel me jao:

```
Admin → Data Tools → Import → apni file select karo → Import button dabao ✅
```

Bas — aapke naye questions turant game me aa jayenge! 🎉

---

### 6️⃣ 🏷️ Naya Topic / Class / Subject Bhi Khud-Ba-Khud Ban Jayega

Agar prompt me aapne koi **naya Topic** (jo pehle se catalog me nahi tha) diya, to import karte hi wo **apne aap** Topics list aur Catalog me add ho jayega — alag se kahin manually add karne ki **zaroorat nahi hai**. Class/Subject bhi wahi honge jo aapne JSON me likhwaye. 🪄

---

## 📝 Copy-Paste Prompt

> Isko copy karo, `[  ]` wali saari jagah apni details se badlo, phir Claude/ChatGPT ko bhej do:

```
You are helping me create a question bank for a school flashcard app
called "Flashcard Champ".

I am attaching two files:
1. A sample JSON file showing the exact format and every question type
   the app supports.
2. A PDF of a school chapter/lesson.

Using ONLY the content of the attached chapter PDF, generate a NEW JSON
file with [TOTAL QUESTIONS] good quality questions, covering as many of
the question types shown in the sample as reasonably make sense for this
content (mix different types, don't use only one type).

Use these values for every question:
- Class: [CLASS NUMBER, e.g. 3]
- Subject: [SUBJECT NAME, e.g. maths / hindi]
- Topic: [TOPIC NAME, e.g. Fractions]

Rules to follow exactly:
1. Follow the exact JSON structure and field names shown in the sample
   file (id, type, question, options, answer, difficulty, pairs, items,
   image, etc.) — copy the pattern precisely for whichever type you use.
2. Every "id" must be unique text, no spaces (e.g. "ch1-q01", "ch1-q02").
3. Do NOT use "fill_blank" or "one_word" types — they are not supported.
   Every question must be answerable by tapping an option, never by
   typing an answer.
4. Do NOT use "image_based", "image_mcq", or "identify_picture" types —
   skip these unless I separately tell you which image files exist in
   the project, since a made-up image path will just show broken.
5. Mix difficulty levels: "easy", "medium", "challenge".
6. Wrap everything in one object like this:
   { "class": ..., "subject": "...", "topic": "...", "questions": [...] }
7. Return ONLY the final JSON — no explanation before or after, no
   markdown code fences — just the raw JSON so I can copy-paste it
   straight into a .json file.
```

> ⚠️ **Note:** Prompt me point 4 jaan-bujh kar image types "skip" karne ko bola hai, kyunki AI ko nahi pata aapke project me kaunsi image files maujood hain — agar wo khud se image path bana degi to wo image game me **broken/tooti hui** dikhegi. Agar aap image wale questions chahte ho, wo baad me khud **Admin → Question Builder** ya **Admin → Images** se add kar sakte ho (real image path select karke).

---

## ⚠️ Zaroori Baatein (Please Read)

- ✋ **Import se pehle ek baar khud padh lo** — AI kabhi-kabhi galti kar sakta hai, saare questions sahi hain ye confirm kar lo.
- 🚫 **Typing wale questions kabhi nahi banenge** — is app me sirf tap-karke-jawab-do wale questions chalte hain.
- 🖼️ **Image wale questions tabhi use karo** jab aapko pata ho konsi image files project me maujood hain (`Admin → Images` me dekh sakte ho).
- 💾 **Import se pehle ek Backup le lo** (`Admin → Data Tools → Backup`) — agar kuch galat ho jaye to turant wapas la sakte ho.
- 🔁 Ye poora process **har chapter ke liye dobara** kar sakte ho — bas naya PDF upload karo aur Topic ka naam badal do.

---

## 🙌 Credits

Made with ❤️ for teachers and students.

**Contact / Credit: DK CHAUDHARY**

---

<p align="center">✨ Happy Question Making! ✨</p>
