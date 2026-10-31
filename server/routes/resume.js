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

const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'];

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext) || (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype.includes('pdf') || file.mimetype.includes('text')))) {
      cb(null, true);
    } else {
      cb(new Error(`File format "${ext}" is not supported. Please upload a PDF, DOCX, TXT, or Image (JPG, PNG).`));
    }
  },
});

// Middleware to catch multer errors gracefully without 500 crash
function handleUpload(req, res, next) {
  upload.single('resume')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 15MB limit.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }
    next();
  });
}

router.post('/upload', authRequired, handleUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded. Please choose a resume file.' });

  try {
    const parsed = await parseResume(req.file.path, req.file.mimetype, req.file.originalname);

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
    console.error('Resume processing error:', err.message);
    res.status(400).json({ error: err.message || 'Could not parse resume. Please verify the document and try again.' });
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
