const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

function extractJsonPayload(content) {
  if (!content) return null;

  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch (innerError) {
        return null;
      }
    }
    return null;
  }
}

async function generateInterviewQuestions({ role, requestedCount, resumeSkills = [] }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const skillSummary = resumeSkills.length ? resumeSkills.join(', ') : 'general professional experience';
  const prompt = [
    `You are an expert interview coach creating a concise interview for a ${role || 'general professional'} candidate.`,
    `Create ${requestedCount} interview questions tailored to the candidate's background and skills: ${skillSummary}.`,
    'Return valid JSON with a top-level key called "questions".',
    'Each item must include: "text" (string), "keywords" (array of 3-6 short strings), and "sampleAnswer" (short example answer string).',
    'Keep the questions practical and realistic for a hiring interview. Do not include extra commentary.'
  ].join(' ');

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1800,
        messages: [
          {
            role: 'system',
            content: 'You generate interview questions and short answer guides. Respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Groq interview generation failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = extractJsonPayload(content);

    if (!parsed || !Array.isArray(parsed.questions)) {
      return null;
    }

    return parsed.questions
      .filter((item) => item && typeof item.text === 'string')
      .slice(0, requestedCount)
      .map((item) => ({
        text: item.text,
        keywords: Array.isArray(item.keywords) ? item.keywords.slice(0, 6) : [],
        sampleAnswer: typeof item.sampleAnswer === 'string' ? item.sampleAnswer : null
      }));
  } catch (error) {
    console.warn('Groq interview generation error:', error.message);
    return null;
  }
}

module.exports = {
  generateInterviewQuestions,
};
