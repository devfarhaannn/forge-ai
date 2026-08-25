import { CREDIT_COST_PER_GENERATION } from "@/lib/constants";
import { db } from "@/lib/prisma";
import { FileData, Message } from "@/types/worksapce";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });


// ─── History trimming ─────────────────────────────────────────────────────────

function trimHistory(messages: Message[]): Message[] {
    if (messages.length <= 10) return messages;
    return [messages[0], ...messages.slice(-8)];
}

// ─── Gemini contents builder ──────────────────────────────────────────────────

function buildContents(messages: Message[], fileData: FileData | null) {
    const trimmed = trimHistory(messages);

    return trimmed.map((msg, idx) => {
        const role = msg.role === "assistant" ? "model" : "user";

        if (msg.role === "user") {
            const parts: object[] = [];

            let text = msg.content;

            if (msg.imageUrl) {
                text = `[The user has attached an image. Use this URL directly in the generated app where relevant (as img src, background-image, etc.): ${msg.imageUrl}]\n\n${text}`;
            }

            const isLast = idx === trimmed.length - 1;
            if (isLast && fileData) {
                text +=
                    "\n\nCurrent project files for context:\n" +
                    JSON.stringify(fileData, null, 2);
            }

            parts.push({ text });
            return { role, parts };
        }

        return { role, parts: [{ text: msg.content }] };
    });
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert React developer. Your job is to generate complete, working React applications based on user prompts.

RULES:
1. Always respond with a valid JSON object — no markdown fences, no extra text.
2. The JSON must match this exact shape:
{
  "assistantMessage": "<brief explanation of what you built/changed>",
  "title": "<short 2-4 word title for the app, e.g. 'Todo List App'>",
  "files": {
    "/App.js": { "code": "<full file content>" },
    "/components/SomeComponent.js": { "code": "<full file content>" }
  },
  "dependencies": {
    "some-package": "latest"
  }
}
3. Use React (functional components + hooks). Do NOT use TypeScript in generated files.
4. Use Tailwind CSS for all styling. Do not use CSS modules or inline styles unless absolutely necessary.
5. The entry point must always be /App.js and must export a default component.
6. All imports must reference files you include in "files" or packages in "dependencies".
7. Do not include react, react-dom, or tailwindcss in "dependencies" — they are always available.
8. When modifying existing code, include ALL files (both changed and unchanged) in "files".
9. Keep code clean, readable, and production-quality.
10. If the user attaches an image, use it as a design reference and match the layout/style as closely as possible.`;

export async function POST(request: NextRequest) {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
        return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, userId, messages, fileData } = body as {
        workspaceId: string | null;
        userId: string;
        messages: Message[];
        fileData: FileData | null;
    };

    if (!messages?.length) {
        return Response.json({ message: "No messages provided" }, { status: 400 });
    }

    // ── Arcjet: rate limit, prompt injection, sensitive info ──────────────────

    const user = await db.user.findUnique({
        where: { id: userId, clerkId },
        select: { id: true, credits: true },
    });

    if (!user)
        return Response.json({ message: "User not found" }, { status: 404 });

    if (user.credits < CREDIT_COST_PER_GENERATION) {
        return Response.json({ message: "Insufficient credits" }, { status: 402 });
    }

    const encoder = new TextEncoder();

    const steam = new ReadableStream({
        async start(controller) {
            const enqueue = (chunk: string) =>
                controller.enqueue(encoder.encode(chunk))

            try {
                const contents = buildContents(messages, fileData);

                const geminiStream = await ai.models.generateContentStream({
                    model: "gemini-3.7-flash",
                    contents,
                    config: {
                        systemInstruction: SYSTEM_PROMPT,
                        temperature: 0.7,
                        // Force JSON output — Gemini will never wrap the response in markdown
                        responseMimeType: "application/json",
                        thinkingConfig: {
                            // Gemini emits thought chunks before the actual output.
                            // We extract short labels from them and emit as status events
                            // so the user sees "Designing layout...", "Adding interactivity..." etc.
                            includeThoughts: true,
                        },
                    },
                });

            }
            catch (error) {

            }
        }
    })
}