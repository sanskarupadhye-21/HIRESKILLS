const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const skillsDict = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'skills.json'), 'utf-8')
);

async function extractText(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);
  const normalizedPath = filePath.toLowerCase();
  const normalizedMime = (mimeType || '').toLowerCase();

  if (normalizedMime.includes('pdf') || normalizedPath.endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    normalizedMime.includes('wordprocessingml') ||
    normalizedMime.includes('docx') ||
    normalizedPath.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  // Fallback: treat as plain text
  return buffer.toString('utf-8');
}

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function extractPhone(text) {
  const match = text.match(/(\+?\d{1,3}[-.\s]?)?\d{10}/);
  return match ? match[0] : null;
}

function extractName(text) {
  // Heuristic: first non-empty line that looks like a name (2-4 capitalized words)
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    const words = line.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 4 &&
      words.every((w) => /^[A-Z][a-zA-Z.'-]*$/.test(w))
    ) {
      return line;
    }
  }
  return lines[0] || 'Candidate';
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function skillMatches(lowerText, skill) {
  // Word-boundary match so "java" doesn't match inside "javascript", and
  // single-letter skills like "c" or "r" don't match substrings of other words.
  const escaped = escapeRegex(skill.toLowerCase());
  const pattern = /^[a-z0-9]/.test(escaped[0]) && /[a-z0-9]$/.test(escaped[escaped.length - 1])
    ? `(?<![a-z0-9+#.])${escaped}(?![a-z0-9+#])`
    : escaped;
  try {
    return new RegExp(pattern, 'i').test(lowerText);
  } catch (e) {
    return lowerText.includes(skill.toLowerCase());
  }
}

function extractSkills(text) {
  const lowerText = text.toLowerCase();
  const matchedByCategory = {};
  let totalMatched = 0;

  for (const [category, skills] of Object.entries(skillsDict)) {
    const found = skills.filter((skill) => skillMatches(lowerText, skill));
    if (found.length > 0) {
      matchedByCategory[category] = found;
      totalMatched += found.length;
    }
  }

  return { matchedByCategory, totalMatched };
}

function looksLikeResume(text) {
  const lowerText = (text || '').toLowerCase();
  const markers = [
    'education',
    'experience',
    'skills',
    'project',
    'profile',
    'objective',
    'summary',
    'qualification',
    'internship',
    'work experience',
    'contact',
  ];

  const markerHits = markers.filter((marker) => lowerText.includes(marker));
  const hasEmail = Boolean(extractEmail(text));
  const hasPhone = Boolean(extractPhone(text));

  const isTrainingFormat = /training format|training/i.test(lowerText);
  const score = (markerHits.length * 1) + (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0);

  return !isTrainingFormat && score >= 2;
}

function suggestPrimaryRole(matchedByCategory) {
  // The category with the most matched skills becomes the interview focus area
  let best = 'General';
  let bestCount = 0;
  for (const [category, skills] of Object.entries(matchedByCategory)) {
    if (category === 'Soft Skills') continue;
    if (skills.length > bestCount) {
      best = category;
      bestCount = skills.length;
    }
  }
  return best;
}

async function parseResume(filePath, mimeType) {
  const text = await extractText(filePath, mimeType);

  if (!looksLikeResume(text)) {
    throw new Error('It is not a resume. Upload once again.');
  }

  const { matchedByCategory, totalMatched } = extractSkills(text);
  const primaryRole = suggestPrimaryRole(matchedByCategory);

  return {
    rawText: text.slice(0, 20000), // cap stored size
    name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    skills: matchedByCategory,
    totalSkillsMatched: totalMatched,
    suggestedRole: primaryRole,
  };
}

module.exports = { parseResume };
