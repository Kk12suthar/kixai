import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildKixPrompt, normalizeKixMode } from "../lib/kixPrompt";
import type { ThemeMode } from "../types";

const GEMINI_MODEL = "gemini-flash-latest";

const getGenerativeModel = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is missing in your environment variables. Please add it to your .env.local file.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
};

const KIX_CHAT_ENDPOINT = "/.netlify/functions/kix-chat";

const requestKixFromFunction = async (userPrompt: string, mode: ThemeMode): Promise<string | null> => {
  const isLocalViteDev = import.meta.env.DEV && window.location.port === "3000";

  if (isLocalViteDev) {
    console.info("KiX AI: skipping Netlify function in local Vite dev and using direct Gemini SDK.");
    return null;
  }

  try {
    const response = await fetch(KIX_CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userPrompt, mode }),
    });

    const payload = await response.json().catch(() => ({}));

    if (response.ok && typeof payload.text === "string" && payload.text.trim()) {
      return payload.text;
    }

    console.warn("KiX AI function returned a non-success response.", {
      status: response.status,
      payload,
    });

    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error(typeof payload.error === "string" ? payload.error : "KiX AI is unavailable right now.");
    }
  } catch (error) {
    console.warn("KiX AI function request failed. Falling back to direct Gemini SDK.", error);
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw error;
    }
  }

  return null;
};

export const generateCinematicPlot = async (userPrompt: string, mode: ThemeMode): Promise<string> => {
  const normalizedMode = normalizeKixMode(mode);

  try {
    const functionResponse = await requestKixFromFunction(userPrompt, normalizedMode);
    if (functionResponse) {
      return functionResponse;
    }

    const model = getGenerativeModel();
    const prompt = buildKixPrompt(userPrompt, normalizedMode);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini generation error:", error);
    if (import.meta.env.DEV) {
      return `KiX AI error: ${error?.message ?? "Unknown error"}`;
    }
    return normalizedMode === "calm"
      ? "The shore is quiet right now. Ask once more in a moment."
      : "The signal snapped in the storm. Ask again.";
  }
};

export const generateKrishnaAdvice = async (userQuestion: string): Promise<string> => {
  try {
    const model = getGenerativeModel();
    const prompt = `
You are Lord Krishna (श्री कृष्ण), speaking directly to the seeker as you once guided Arjuna on the battlefield of Kurukshetra.

SACRED ROLE:
- Speak with compassion, clarity, depth, and quiet authority
- Address the seeker as "पार्थ", "प्रिय भक्त", or "dear child" when natural
- Sound timeless, not theatrical
- Give wisdom that feels spiritually grounded and emotionally useful

USER'S QUESTION OR DILEMMA:
"${userQuestion}"

RESPONSE FORMAT (STRICT):

1. SANSKRIT SHLOKA (श्लोक)
Choose one relevant verse from the Bhagavad Gita in proper Devanagari script.

2. TRANSLITERATION
Give the shloka in Roman transliteration.

3. HINDI TRANSLATION (हिंदी अर्थ)
Explain the meaning in Hindi.

4. ENGLISH TRANSLATION
Explain the meaning in clear English.

5. KRISHNA'S GUIDANCE (कृष्ण उवाच)
Now guide the seeker directly:
- Use "I", not "Krishna says"
- Connect the modern problem to Dharma, Karma, Nishkama Karma, Atma, or Maya when relevant
- Be spiritually deep but easy to understand
- End with encouragement and blessing

STYLE RULES:
- Keep the overall response meaningful but not too long
- Guidance section should stay under 300 words
- Use real Devanagari correctly
- Avoid broken encoding or garbled text
- Do not invent fake verses
`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Krishna AI error:", error);
    throw error;
  }
};
