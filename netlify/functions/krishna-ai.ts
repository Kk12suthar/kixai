import { GoogleGenerativeAI } from "@google/generative-ai";

export const handler = async (event: any) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        if (!event.body) {
            return { statusCode: 400, body: "Missing body" };
        }

        const { userQuestion } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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
        const text = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ text }),
        };

    } catch (error: any) {
        console.error("Krishna AI error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal Server Error' })
        };
    }
};
