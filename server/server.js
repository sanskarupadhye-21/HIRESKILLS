require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { ensureDb } = require('./utils/db');

ensureDb();

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const interviewRoutes = require('./routes/interview');

const app = express();
const basePort = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'HireSkill AI API' }));

// Serve the frontend (static, no-build vanilla JS app)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

function startServer(port, attemptsLeft = 10) {
  const server = app.listen(port, () => {
    console.log(`\n🚀 HireSkill AI server running at http://localhost:${port}\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`Port ${port} is busy. Trying ${port + 1}...`);
      server.close(() => startServer(port + 1, attemptsLeft - 1));
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

startServer(basePort);
