const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { readDb, writeDb } = require('../utils/db');
const { authRequired } = require('../utils/authMiddleware');
const { parseResume } = require('../utils/resumeParser');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only PDF, DOCX, or TXT resumes are supported.'));
  },
});

router.post('/upload', authRequired, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  try {
    const parsed = await parseResume(req.file.path, req.file.mimetype);

    const db = readDb();
    const resumeRecord = {
      id: uuidv4(),
      userId: req.user.id,
      fileName: req.file.originalname,
      ...parsed,
      createdAt: new Date().toISOString(),
    };
    db.resumes.push(resumeRecord);
    writeDb(db);

    res.status(201).json({ resume: resumeRecord });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'It is not a resume. Upload once again.' });
  }
});

router.get('/mine', authRequired, (req, res) => {
  const db = readDb();
  const resumes = db.resumes
    .filter((r) => r.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ resumes });
});

module.exports = router;
