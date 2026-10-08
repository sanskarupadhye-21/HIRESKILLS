// Lightweight JSON-file database — no native build tools required,
// keeps the whole project easy to run anywhere Node runs.
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const DEFAULT_DATA = {
  users: [],       // {id, name, email, passwordHash, createdAt}
  resumes: [],      // {id, userId, fileName, rawText, skills, name, email, createdAt}
  interviews: [],   // {id, userId, resumeId, role, questions, answers, transcript,
                     //  speechScore, emotionScore, technicalScore, finalScore,
                     //  feedback, createdAt, durationSec}
};

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb, ensureDb };
