"use client"

import React, { useCallback, useState } from 'react'
import { CodePanel } from './CodePanel';
import { FileData, Message, StatusStep, WorkspaceData } from '@/types/worksapce';
import ChatPanel from './ChatPanel';

interface WorkspaceClientProps {
    initialPrompt: string | null;
    //workspace: WorkspaceData | null;
    userCredits: number;
    userId: string;
    userPlan: string;
}

const WorkspaceClient = ({ initialPrompt, userCredits, userId, userPlan }: WorkspaceClientProps) => {
    const[workspaceId, setWorkspaceId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([]);
    const [credits, setCredits] = useState(userCredits);
    const [isImproving, setIsImproving] = useState(false);

    const [fileData, setFileData] = useState<FileData | null>(null)
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusLog, setStatusLog] = useState<StatusStep[]>([]);

    const handleFilePatch = useCallback((patches: FileData) => {
        setFileData(patches)
    }, [])

    const handleGenerate = useCallback(
        async(prompt:string, imageUrl?:string) => {},
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
                appTitle={'Test title'}
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