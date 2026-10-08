const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'so', 'i mean'];

// --- Speech / verbal clarity scoring -------------------------------------
function analyzeSpeech(transcript, durationSec) {
  const clean = (transcript || '').trim();
  if (!clean) {
    return { wordCount: 0, wpm: 0, fillerCount: 0, fillerRatio: 0, clarityScore: 0 };
  }

  const words = clean.toLowerCase().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minutes = Math.max(durationSec / 60, 0.15);
  const wpm = Math.round(wordCount / minutes);

  let fillerCount = 0;
  const lowerText = clean.toLowerCase();
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) fillerCount += matches.length;
  }
  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;

  // Ideal speaking pace ~110-160 wpm. Score decays outside that band.
  let paceScore = 100;
  if (wpm < 90) paceScore = Math.max(40, 100 - (90 - wpm) * 1.2);
  else if (wpm > 180) paceScore = Math.max(40, 100 - (wpm - 180) * 1.0);

  const fillerPenalty = Math.min(40, fillerRatio * 300);
  const lengthBonus = Math.min(15, Math.floor(wordCount / 15)); // rewards substantive answers

  const clarityScore = Math.max(
    0,
    Math.min(100, Math.round(paceScore - fillerPenalty + lengthBonus))
  );

  return { wordCount, wpm, fillerCount, fillerRatio: Number(fillerRatio.toFixed(3)), clarityScore };
}

// --- Technical content scoring (keyword overlap) --------------------------
function scoreAnswerContent(transcript, keywords) {
  if (!transcript || !keywords || keywords.length === 0) return 50; // neutral default
  const lowerText = transcript.toLowerCase();
  const hits = keywords.filter((k) => lowerText.includes(k.toLowerCase()));
  const coverage = hits.length / keywords.length;
  // Even partial coverage should score reasonably if the answer is substantive
  const lengthFactor = Math.min(1, transcript.split(/\s+/).length / 40);
  const score = Math.round((coverage * 0.7 + lengthFactor * 0.3) * 100);
  return Math.max(10, Math.min(100, score));
}

// --- Facial / emotion scoring ---------------------------------------------
// Expects an array of emotion samples captured client-side, e.g.
// { happy, neutral, sad, angry, fearful, disgusted, surprised, faceDetected }
function analyzeEmotions(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return { confidenceScore: 50, engagementScore: 50, dominantEmotion: 'neutral' };
  }

  const faceDetectedCount = samples.filter((sample) => sample?.faceDetected).length;
  const faceRate = faceDetectedCount / samples.length;
  const avgNeutral = samples.reduce((sum, sample) => sum + (sample?.neutral || 0), 0) / samples.length;
  const avgHappy = samples.reduce((sum, sample) => sum + (sample?.happy || 0), 0) / samples.length;
  const avgFearful = samples.reduce((sum, sample) => sum + (sample?.fearful || 0), 0) / samples.length;
  const avgSad = samples.reduce((sum, sample) => sum + (sample?.sad || 0), 0) / samples.length;

  const confidenceScore = Math.max(0, Math.min(100, Math.round(faceRate * 60 + avgNeutral * 20 + avgHappy * 20)));
  const engagementScore = Math.max(0, Math.min(100, Math.round(faceRate * 80 + (1 - avgFearful - avgSad) * 20)));

  const dominantEmotion = avgHappy > avgFearful && avgHappy > avgSad ? 'happy' : avgFearful > avgSad ? 'fearful' : 'neutral';

  return { confidenceScore, engagementScore, dominantEmotion };
}

// --- Final report combining all signals ------------------------------------
function computeFinalReport(perQuestionResults, emotionSummary) {
  const technicalScores = perQuestionResults.map((r) => r.technicalScore);
  const clarityScores = perQuestionResults.map((r) => r.clarityScore);

  const avg = (arr) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const technicalScore = avg(technicalScores);
  const speechScore = avg(clarityScores);
  const confidenceScore = emotionSummary.confidenceScore;
  const engagementScore = emotionSummary.engagementScore;

  // Weighted blend: content 40%, speech clarity 25%, facial confidence 25%, engagement 10%
  const finalScore = Math.round(
    technicalScore * 0.4 + speechScore * 0.25 + confidenceScore * 0.25 + engagementScore * 0.1
  );

  const strengths = [];
  const improvements = [];

  if (technicalScore >= 70) strengths.push('Strong grasp of technical/domain concepts');
  else improvements.push('Deepen technical answers with more specific examples and terminology');

  if (speechScore >= 70) strengths.push('Clear and well-paced verbal communication');
  else improvements.push('Reduce filler words and aim for a steadier speaking pace');

  if (confidenceScore >= 70) strengths.push('Confident, composed on-camera presence');
  else improvements.push('Work on maintaining a calm, positive expression under pressure');

  if (engagementScore >= 70) strengths.push('Consistent eye contact and camera engagement');
  else improvements.push('Stay framed in the camera and maintain steady eye contact');

  return {
    technicalScore,
    speechScore,
    confidenceScore,
    engagementScore,
    finalScore,
    strengths,
    improvements,
  };
}

module.exports = { analyzeSpeech, scoreAnswerContent, analyzeEmotions, computeFinalReport };
