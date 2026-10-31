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

// SEO & Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 301 Canonical Redirect: remove trailing .html for clean SEO URLs
app.use((req, res, next) => {
  if (req.path !== '/' && req.path.endsWith('.html')) {
    const cleanPath = req.path.slice(0, -5);
    const query = req.url.slice(req.path.length);
    return res.redirect(301, cleanPath + query);
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'HireSkill AI API' }));

// Serve frontend with clean html extensions
const publicDir = path.join(__dirname, '..', 'public');

// Serve robots.txt and sitemap.xml explicitly with appropriate content types
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(publicDir, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(publicDir, 'sitemap.xml'));
});

app.use(express.static(publicDir, { extensions: ['html', 'htm'] }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Global API error handler ensuring clean JSON responses
app.use((err, req, res, next) => {
  console.error('API Error:', err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'An internal server error occurred.'
  });
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
