# HireSkill AI — AI Interview Practice Platform

An end-to-end AI interview practice platform: upload a resume, get role-matched
interview questions, take a live mock interview that reads both your speech and
your facial expressions, and get an instant scorecard with feedback.

Built from the HireSkill AI project brief — resume analysis → AI-driven mock
interviews → facial expression + speech evaluation → performance dashboard.

## Features

- **Auth** — simple email/password accounts (bcrypt-hashed, JWT sessions)
- **Resume analysis** — upload a PDF / DOCX / TXT resume; the server extracts your
  name, email, phone, and skills (matched against a categorized skills dictionary)
  and recommends an interview track (e.g. Web Development, AI/ML, Databases...)
- **AI-generated questions** — 2 general/behavioral + 3 technical questions picked
  from a bank matched to your detected skill track
- **Live mock interview**
  - Webcam facial-expression analysis in the browser, via [face-api.js](https://github.com/justadudewhohacks/face-api.js)
    (tiny face detector + expression net) — tracks happy/neutral/sad/fearful/etc.
    per frame, live, client-side
  - Real speech-to-text via the browser's Web Speech API, so you can watch your
    answer transcribe as you speak (or type/edit manually as a fallback)
- **Scoring engine** — combines:
  - Technical/content score (keyword coverage against each question's expected concepts)
  - Speech clarity (pace in words-per-minute, filler-word ratio)
  - Facial confidence (blend of positive/calm vs. fearful/negative expressions)
  - Engagement (how consistently your face was detected in frame)
  - → weighted into one final score, with auto-generated strengths & improvement notes
- **Dashboard** — score history chart, best/average score, full interview log
- **Report page** — full scorecard with a question-by-question breakdown of what
  you said and how it scored

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js + Express |
| Storage | JSON-file database (`server/data/db.json`) — zero setup, no native builds |
| Frontend | Plain HTML/CSS/JS (no build step) |
| Resume parsing | `pdf-parse`, `mammoth` |
| Face & emotion detection | `face-api.js` (runs in-browser) |
| Speech-to-text | Web Speech API (built into Chrome/Edge) |
| Charts | Chart.js |

This intentionally avoids MongoDB/React/a build pipeline from the original slide
deck's tech list, so the whole project runs with a single `npm install` and no
extra services. If you'd like, it can be migrated to MongoDB or a React frontend
later — the API layer is already separated from storage and UI.

## Getting started

**Requirements:** Node.js 18+ and a modern browser (Chrome or Edge recommended —
they have the most complete Web Speech API support; camera/mic access requires
`localhost` or HTTPS, which `localhost` satisfies automatically).

```bash
cd server
npm install
npm start
```

Then open **http://localhost:4000** in your browser.

The server serves both the API (`/api/...`) and the frontend (static files in
`public/`) from one process, so there's nothing else to run.

### First run

1. Sign up for an account.
2. Upload a resume (PDF/DOCX/TXT) on the Resume page — or skip and pick a track manually.
3. Click "Start mock interview," allow camera + microphone access.
4. Answer each question (click **Start answer**, speak, click **Stop & save answer**),
   then **Next question**.
5. After the last question, you're redirected to your full report.
6. Visit the Dashboard any time to see your score trend across sessions.

## Project structure

```
hireskill-ai/
├── server/
│   ├── server.js              # Express entrypoint (serves API + frontend)
│   ├── routes/
│   │   ├── auth.js            # register / login
│   │   ├── resume.js          # upload + parse resume
│   │   └── interview.js       # generate questions, submit + score session
│   ├── utils/
│   │   ├── db.js              # tiny JSON-file datastore
│   │   ├── authMiddleware.js  # JWT verification
│   │   ├── resumeParser.js    # text extraction + skill matching
│   │   └── scoring.js         # speech / technical / emotion / final scoring
│   ├── data/
│   │   ├── skills.json        # skill dictionary used for resume parsing
│   │   ├── questionBank.json  # question bank per skill track
│   │   └── db.json            # created automatically on first run
│   └── uploads/                # uploaded resumes land here
└── public/
    ├── index.html              # landing + login/register
    ├── dashboard.html          # score history & interview log
    ├── resume.html             # resume upload & track selection
    ├── interview.html          # live mock interview (webcam + speech)
    ├── report.html             # full scorecard for one session
    ├── css/style.css
    └── js/api.js                # shared fetch/auth/render helpers
```

## Notes & next steps

- **Data storage**: the JSON-file DB (`server/data/db.json`) is fine for a
  student project / demo, but isn't meant for concurrent production traffic.
  Swapping in MongoDB (as the original stack listed) mainly means rewriting
  `server/utils/db.js` — the routes already read/write through that one module.
- **Browser support**: live speech-to-text needs a Chromium-based browser
  (Chrome/Edge). Firefox and Safari lack full `SpeechRecognition` support; the
  interview still works there, you'd just type answers manually.
- **Privacy**: video/audio never leave the browser — only the resulting
  transcript text and computed emotion-probability numbers are sent to the
  server.
- **Extending the question bank**: add entries to `server/data/questionBank.json`
  under a track key that matches a category in `server/data/skills.json`.
