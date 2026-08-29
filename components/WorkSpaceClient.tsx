"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CodePanel } from './CodePanel';
import { FileData, Message, StatusStep, WorkspaceData } from '@/types/worksapce';
import ChatPanel from './ChatPanel';
import { MIN_CREDITS_TO_GENERATE } from '@/lib/constants';
import { toast } from 'sonner';

interface WorkspaceClientProps {
    initialPrompt: string | null;
    workspace: WorkspaceData | null;
    userCredits: number;
    userId: string;
    userPlan: string;
}

function parseMessages(raw: unknown): Message[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(
        (m): m is Message =>
            typeof m === "object" && m !== null && "role" in m && "content" in m
    );
}

function parseFileData(raw: unknown): FileData | null {
    if (!raw || typeof raw !== "object") return null;
    const f = raw as Record<string, unknown>;
    if (!f.files || !f.dependencies) return null;
    return raw as FileData;
}

const WorkspaceClient = ({ initialPrompt, userCredits, userId, userPlan, workspace }: WorkspaceClientProps) => {
    const [workspaceId, setWorkspaceId] = useState<string | null>(
        workspace?.id ?? null
    )
    const [messages, setMessages] = useState<Message[]>(
        parseMessages(workspace?.messages)
    );
    const [fileData, setFileData] = useState<FileData | null>(
         parseFileData(workspace?.fileData)
    )

    const [credits, setCredits] = useState(userCredits);

    const [isImproving, setIsImproving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusLog, setStatusLog] = useState<StatusStep[]>([]);

    // Refs to avoid stale closures in callbacks
    const messagesRef = useRef<Message[]>(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const workspaceIdRef = useRef<string | null>(workspaceId);
    useEffect(() => {
        workspaceIdRef.current = workspaceId;
    }, [workspaceId]);

    // fileData ref — so handleImprove never closes over stale fileData
    // even as file_patch events stream in
    const fileDataRef = useRef<FileData | null>(fileData);
    useEffect(() => {
        fileDataRef.current = fileData;
    }, [fileData]);

    const handleFilePatch = useCallback((patches: FileData) => {
        setFileData(patches)
    }, [])

    const pushStep = (label: string) => {
        setStatusLog((prev) => [
            ...prev.map((s, i) =>
                i === prev.length - 1 ? { ...s, status: "done" as const } : s
            ),
            { label, status: "running" as const },
        ]);
    };

    const completeSteps = () => {
        setStatusLog((prev) =>
            prev.map((s, i) =>
                i === prev.length - 1 ? { ...s, status: "done" as const } : s
            )
        );
    };

    const handleGenerate = useCallback(
        async (prompt: string, imageUrl?: string) => {
            if (isGenerating) return;
            if (credits < MIN_CREDITS_TO_GENERATE) return;

            const userMessage: Message = {
                role: "user",
                content: prompt,
                ...(imageUrl ? { imageUrl } : {}),
            };

            const currentMessages = messagesRef.current;
            const currentWorkspaceId = workspaceIdRef.current;

            setMessages((prev) => [...prev, userMessage]);
            setIsGenerating(true);
            setStatusLog([{ label: "Thinking…", status: "running" }]);

            try {
                const res = await fetch("/api/gen-ai-code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    //signal: abortController.signal,
                    body: JSON.stringify({
                        workspaceId: currentWorkspaceId,
                        userId,
                        messages: [...currentMessages, userMessage],
                        fileData: fileDataRef.current,
                    }),
                });

                if (res.status === 402) {
                    toast.error("Not enough credits.");
                    setMessages((prev) => prev.slice(0, -1));
                    return;
                }
                if (res.status === 429) {
                    toast.error("Too many requests. Please slow down.");
                    setMessages((prev) => prev.slice(0, -1));
                    return;
                }
                if (!res.ok || !res.body) throw new Error("Generation failed");

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n\n");
                    // Example buffer after a few chunks might look like:
                    // "data: {...}\n\ndata: {...}\n\ndata: {inc"
                    // After split:
                    // ["data: {...}", "data: {...}", "data: {inc"]
                    buffer = lines.pop() ?? "";

                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;

                        try {
                            // Strip the "data: " prefix (6 characters) and parse the JSON payload
                            const event = JSON.parse(line.slice(6));

                            if (event.type === "status") {
                                // Gemini thought label — adds a new step to the status log
                                // e.g. "Designing layout...", "Adding interactivity..."
                                pushStep(event.message);
                            } else if (event.type === "done") {
                                completeSteps();
                                setWorkspaceId(event.workspaceId);
                                setFileData(event.fileData);
                                setCredits(event.creditsRemaining);
                                setMessages((prev) => [
                                    ...prev,
                                    { role: "assistant", content: event.assistantMessage },
                                ]);
                                window.history.replaceState(
                                    null,
                                    "",
                                    `/workspace?id=${event.workspaceId}`
                                );
                            } else if (event.type === "error") {
                                throw new Error(event.message);
                            }
                        } catch (error) {
                            // skip malformed SSE lines
                        }
                    }
                }
            } catch (error) {
                toast.error(
                    error instanceof Error ? error.message : "Something went wrong."
                );
                setMessages((prev) => prev.slice(0, -1));
            } finally {
                // generateAbortRef.current = null;
                setIsGenerating(false);
                setStatusLog([]);
            }
        },
        [credits, isGenerating, userId]
    )

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#0a0a0a]">
            {/* Chat panel — left */}
            <ChatPanel
                messages={messages}
                isGenerating={isGenerating}
                isImproving={isImproving}
                statusLog={statusLog}
                credits={credits}
                initialPrompt={initialPrompt}
                onGenerate={handleGenerate}
                //onStop={handleStop}
                userId={userId}
                workspaceId={workspaceId}
                appTitle={fileData?.title ?? workspace?.title ?? null}
            />

            {/* Code panel — right */}
            <CodePanel
                fileData={fileData}
                isGenerating={isGenerating}
                statusLog={statusLog}
                onFilePatch={handleFilePatch} />
        </div>
    );
};

export default WorkspaceClient