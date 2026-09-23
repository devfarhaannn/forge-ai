const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function main() {
  console.log("Testing Gemini...");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Create a simple Todo App using React.",
      config: {
        systemInstruction: `
You are an expert React developer.

Return valid JSON only.

Return this structure:
{
  "assistantMessage": "short explanation",
  "title": "short title",
  "files": {
    "/App.js": {
      "code": "complete React code"
    }
  },
  "dependencies": {}
}

Use plain JavaScript.
Do not use TypeScript.
`,
        responseMimeType: "application/json",
      },
    });

    console.log("SUCCESS:");
    console.log(response.text);
  } catch (error) {
    console.error("FAILED:");
    console.error(error);
  }
}

main();