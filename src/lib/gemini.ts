/**
 * Google Gemini AI Service
 * Provides AI-powered features for task verification, task generation, and more
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface TaskVerificationResult {
  isVerified: boolean;
  confidence: number;
  feedback: string;
  suggestions?: string[];
}

interface GeneratedTask {
  title: string;
  description: string;
  category: string;
  points: number;
  estimatedMinutes: number;
}

/**
 * Call the Gemini API
 */
async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const body: Record<string, unknown> = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 1.0,
    }
  };

  if (systemInstruction) {
    body.system_instruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/**
 * Call Gemini with JSON response format
 */
async function callGeminiJSON<T>(prompt: string, schema: object, systemInstruction?: string): Promise<T> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const body: Record<string, unknown> = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 1.0,
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  };

  if (systemInstruction) {
    body.system_instruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return JSON.parse(text) as T;
}

/**
 * Verify task completion using AI analysis of photo proof
 */
export async function verifyTaskWithAI(
  taskTitle: string,
  taskDescription: string,
  photoBase64: string,
  childAge: number
): Promise<TaskVerificationResult> {
  if (!GEMINI_API_KEY) {
    // Fallback when AI not available
    return {
      isVerified: true,
      confidence: 0.5,
      feedback: 'Photo received! Parent approval needed.',
      suggestions: []
    };
  }

  const schema = {
    type: 'object',
    properties: {
      isVerified: { type: 'boolean' },
      confidence: { type: 'number' },
      feedback: { type: 'string' },
      suggestions: { type: 'array', items: { type: 'string' } }
    },
    required: ['isVerified', 'confidence', 'feedback']
  };

  const systemPrompt = `You are a friendly task verification assistant for a children's task app called Posty MagicMail Club.
Your job is to look at photos that kids submit as proof of completing tasks, and provide encouraging feedback.
Be kind, supportive, and age-appropriate. The child is ${childAge} years old.
Even if the task isn't perfectly done, encourage effort and provide helpful suggestions.
Only mark as not verified if there's clearly no attempt at the task.`;

  const prompt = `A child submitted this photo as proof of completing this task:

Task: ${taskTitle}
Description: ${taskDescription}

Please analyze if this photo shows the task being completed and provide feedback.
Be encouraging and supportive!`;

  try {
    // Call with image
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: photoBase64 } }
          ]
        }],
        generationConfig: {
          temperature: 1.0,
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    return JSON.parse(text) as TaskVerificationResult;
  } catch (error) {
    console.log('AI verification error:', error);
    return {
      isVerified: true,
      confidence: 0.5,
      feedback: 'Great job submitting your proof! Your parent will review it.',
      suggestions: []
    };
  }
}

/**
 * Generate personalized tasks for a child based on age and preferences
 */
export async function generatePersonalizedTasks(
  childName: string,
  childAge: number,
  ageGroup: string,
  completedTaskTitles: string[],
  count: number = 5
): Promise<GeneratedTask[]> {
  if (!GEMINI_API_KEY) {
    return [];
  }

  const schema = {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            points: { type: 'number' },
            estimatedMinutes: { type: 'number' }
          },
          required: ['title', 'description', 'category', 'points', 'estimatedMinutes']
        }
      }
    },
    required: ['tasks']
  };

  const systemPrompt = `You are a task generator for Posty MagicMail Club, a children's task app.
Generate fun, educational, and age-appropriate tasks that help kids build discipline, creativity, and good habits.
Categories: reading, chores, creativity, kindness, fitness, mindset, learning, goals, entrepreneur
Points should be 10-50 based on difficulty. Estimated minutes should be 5-30.`;

  const recentTasks = completedTaskTitles.slice(0, 10).join(', ') || 'none';

  const prompt = `Generate ${count} new tasks for ${childName}, age ${childAge} (${ageGroup} age group).
Recently completed tasks: ${recentTasks}
Make the tasks different from recently completed ones and appropriate for the age group.
Be creative and fun!`;

  try {
    const result = await callGeminiJSON<{ tasks: GeneratedTask[] }>(prompt, schema, systemPrompt);
    return result.tasks ?? [];
  } catch (error) {
    console.log('Task generation error:', error);
    return [];
  }
}

/**
 * Generate encouraging message from Posty
 */
export async function generatePostyMessage(
  childName: string,
  context: 'task_complete' | 'streak' | 'level_up' | 'mail_unlock' | 'login'
): Promise<string> {
  if (!GEMINI_API_KEY) {
    // Fallback messages
    const fallbacks = {
      task_complete: `Great job, ${childName}! You're making amazing progress!`,
      streak: `Wow, ${childName}! Your streak is on fire! Keep it going!`,
      level_up: `Level up! ${childName}, you're becoming a superstar!`,
      mail_unlock: `Exciting news, ${childName}! Your mail is on the way!`,
      login: `Hey ${childName}! Ready for some fun tasks today?`
    };
    return fallbacks[context];
  }

  const systemPrompt = `You are Posty, a friendly mail-carrier dog mascot for Posty MagicMail Club.
You're enthusiastic, encouraging, and love helping kids complete their tasks to earn mail rewards.
Keep messages short (1-2 sentences), fun, and age-appropriate. Use simple language.
Sign your messages with "- Posty 🐕"`;

  const contextPrompts = {
    task_complete: `Write an encouraging message for ${childName} who just completed a task!`,
    streak: `Write an exciting message for ${childName} who is on a streak of completing tasks!`,
    level_up: `Write a celebration message for ${childName} who just leveled up!`,
    mail_unlock: `Write an exciting message for ${childName} who just unlocked a mail delivery!`,
    login: `Write a welcoming message for ${childName} who just logged in to the app!`
  };

  try {
    return await callGemini(contextPrompts[context], systemPrompt);
  } catch (error) {
    const fallbacks = {
      task_complete: `Great job, ${childName}! You're making amazing progress! - Posty 🐕`,
      streak: `Wow, ${childName}! Your streak is on fire! Keep it going! - Posty 🐕`,
      level_up: `Level up! ${childName}, you're becoming a superstar! - Posty 🐕`,
      mail_unlock: `Exciting news, ${childName}! Your mail is on the way! - Posty 🐕`,
      login: `Hey ${childName}! Ready for some fun tasks today? - Posty 🐕`
    };
    return fallbacks[context];
  }
}

/**
 * Check if Gemini AI is available
 */
export function isGeminiEnabled(): boolean {
  return !!GEMINI_API_KEY;
}
