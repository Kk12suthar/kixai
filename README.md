<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# KiX | The Aura Portfolio

This project is a Solo Leveling inspired developer portfolio for KiX (Kishor Kumar Suthar), featuring custom high-octane UI themes (Rage and Calm) and integrated Gemini AI features.

## Why Google AI Studio?

This repository was initialized via a Google AI Studio template. The project links to AI Studio because:
- **Prompt Prototyping & Testing**: The underlying AI features (such as the Screenwriter bot and Lord Krishna AI) utilize prompts designed and tested within the Google AI Studio interface.
- **Workspace Link**: The link below redirects you to the Google AI Studio interface, allowing you to view and interact with the prompt models and configurations associated with this project:
  [View Prompt Workspace in AI Studio](https://ai.studio/apps/drive/1f9zz95NQ5Zm9-MflGc61Hk4Rcv05ytPQ)

---

## Run Locally

**Prerequisites:** Node.js

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Set up API Keys:**
   Create a `.env.local` file in the root directory (already ignored by Git) and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. **Run the development server:**
   ```bash
   npm run dev
   ```
