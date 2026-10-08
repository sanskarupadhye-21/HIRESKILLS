const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { readDb, writeDb } = require('../utils/db');
const { authRequired } = require('../utils/authMiddleware');
const { analyzeSpeech, scoreAnswerContent, analyzeEmotions, computeFinalReport } = require('../utils/scoring');
const { generateInterviewQuestions } = require('../utils/groq');

const router = express.Router();

const questionBank = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'questionBank.json'), 'utf-8')
);

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function buildUniqueQuestionSet(roleQuestions, generalQuestions, fallbackQuestions, isManualMode, requestedCount) {
  const primaryPool = isManualMode ? [...roleQuestions] : [...generalQuestions, ...roleQuestions];
  const pool = [...primaryPool, ...fallbackQuestions];
  const selected = [];
  const seen = new Set();

  for (const question of pool.sort(() => 0.5 - Math.random())) {
    const key = question.q || question.text;
    if (seen.has(key)) continue;
    selected.push(question);
    seen.add(key);
    if (selected.length === requestedCount) break;
  }

  return selected;
}

// Generate a question set based on resume-detected role (or explicit role override)
router.post('/start', authRequired, async (req, res) => {
  const { resumeId, role, questionCount } = req.body;
  const db = readDb();
  const requestedCount = Math.max(1, Math.min(10, Number(questionCount) || 5));

  let selectedRole = role;
  let resume = null;
  if (resumeId) {
    resume = db.resumes.find((r) => r.id === resumeId && r.userId === req.user.id);
    if (!selectedRole && resume) selectedRole = resume.suggestedRole;
  }

  if (!selectedRole || !questionBank[selectedRole]) selectedRole = 'General';

  const resumeSkillCategories = resume
    ? Object.keys(resume.skills || {}).filter((category) => questionBank[category])
    : [];

  const roleQuestions = resumeId
    ? resumeSkillCategories.flatMap((category) => questionBank[category] || [])
    : questionBank[selectedRole] || [];

  const manualMode = !resumeId && Boolean(role);
  const generalQuestions = resumeId
    ? []
    : pickRandom(questionBank['General'] || [], Math.min(3, requestedCount));

  const fallbackQuestions = Object.entries(questionBank)
    .filter(([category]) => category !== selectedRole && category !== 'General')
    .flatMap(([, questions]) => questions)
    .sort(() => 0.5 - Math.random());

  let allQuestions = [];
  const groqQuestions = await generateInterviewQuestions({
    role: selectedRole,
    requestedCount,
    resumeSkills: resume ? Object.values(resume.skills || {}).flat() : []
  });

  if (groqQuestions && groqQuestions.length) {
    allQuestions = groqQuestions.map((q, idx) => ({
      id: `q${idx + 1}`,
      text: q.text,
      keywords: q.keywords,
      sampleAnswer: q.sampleAnswer,
    }));
  } else {
    allQuestions = buildUniqueQuestionSet(
      roleQuestions,
      generalQuestions,
      fallbackQuestions,
      manualMode,
      requestedCount
    ).map((q, idx) => ({
      id: `q${idx + 1}`,
      text: q.q,
      keywords: q.keywords,
    }));
  }

  const interviewDraft = {
    id: uuidv4(),
    userId: req.user.id,
    resumeId: resumeId || null,
    role: selectedRole,
    questions: allQuestions,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
  };

  db.interviews.push(interviewDraft);
  writeDb(db);

  res.status(201).json({ interview: interviewDraft });
});

// Submit full interview: answers (transcripts per question) + emotion samples + durations
router.post('/:id/submit', authRequired, (req, res) => {
  const { id } = req.params;
  const { answers, emotionSamples, totalDurationSec } = req.body;
  // answers: [{ questionId, transcript, durationSec }]
  // emotionSamples: [{ happy, neutral, sad, angry, fearful, disgusted, surprised, faceDetected }]

  const db = readDb();
  const interview = db.interviews.find((i) => i.id === id && i.userId === req.user.id);
  if (!interview) return res.status(404).json({ error: 'Interview session not found.' });

  const perQuestionResults = (answers || []).map((ans) => {
    const question = interview.questions.find((q) => q.id === ans.questionId);
    const speech = analyzeSpeech(ans.transcript, ans.durationSec || 30);
    const technicalScore = scoreAnswerContent(ans.transcript, question ? question.keywords : []);
    return {
      questionId: ans.questionId,
      questionText: question ? question.text : '',
      transcript: ans.transcript || '',
      technicalScore,
      clarityScore: speech.clarityScore,
      wpm: speech.wpm,
      fillerCount: speech.fillerCount,
    };
  });

  const emotionSummary = analyzeEmotions(emotionSamples || []);
  const report = computeFinalReport(perQuestionResults, emotionSummary);

  interview.status = 'completed';
  interview.answers = perQuestionResults;
  interview.emotionSummary = emotionSummary;
  interview.report = report;
  interview.totalDurationSec = totalDurationSec || null;
  interview.completedAt = new Date().toISOString();

  writeDb(db);

  res.json({ interview });
});

router.get('/mine', authRequired, (req, res) => {
  const db = readDb();
  const interviews = db.interviews
    .filter((i) => i.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ interviews });
});

router.delete('/:id', authRequired, (req, res) => {
  const db = readDb();
  const index = db.interviews.findIndex((i) => i.id === req.params.id && i.userId === req.user.id);
  if (index === -1) return res.status(404).json({ error: 'Interview session not found.' });

  db.interviews.splice(index, 1);
  writeDb(db);
  res.status(204).send();
});

router.get('/:id', authRequired, (req, res) => {
  const db = readDb();
  const interview = db.interviews.find((i) => i.id === req.params.id && i.userId === req.user.id);
  if (!interview) return res.status(404).json({ error: 'Interview session not found.' });
  res.json({ interview });
});

module.exports = router;
