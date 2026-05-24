import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildKixPrompt, normalizeKixMode } from "../../lib/kixPrompt";

export const handler = async (event: any) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        console.log("Function invoked");

        if (!event.body) {
            console.error("No body provided");
            return { statusCode: 400, body: "Missing body" };
        }

        const { userPrompt, mode } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        const themeMode = normalizeKixMode(mode);

        console.log("API Key present:", !!apiKey); // Log true/false, do not log the key

        if (!apiKey) {
            console.error("API Key is missing in environment variables");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error: API Key missing' })
            };
        }

        // Initialize the API with the correct class
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const prompt = buildKixPrompt(userPrompt, themeMode);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ text }),
        };

    } catch (error: any) {
        console.error("Gemini generation error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal Server Error' })
        };
    }
};
