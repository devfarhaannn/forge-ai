"use client"

import { Message, StatusStep } from '@/types/worksapce';
import React, { useRef, useState } from 'react'
import { BlueTitle } from './reusable';
import PricingModal from './Pricingmodal';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
    messages: Message[];
    isGenerating: boolean;
    isImproving: boolean;
    statusLog: StatusStep[];
    credits: number;
    initialPrompt: string | null;
    onGenerate: (prompt: string, imageUrl?: string) => Promise<void>;
    //onStop: () => void;
    userId: string;
    workspaceId: string | null;
    appTitle: string | null;
}

function ChatPanel({
    messages,
    isGenerating,
    isImproving,
    statusLog,
    credits,
    initialPrompt,
    onGenerate,
    //onStop,
    userId,
    workspaceId,
    appTitle,
}: ChatPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [input, setInput] = useState("");
    // TODO: pendindImagageUrl state - added when image upload is wired
    // TODO : isUploading state - added when image upload is wired

    const hasAutoSubmittedRef = useRef(false);
    const noCredits = credits <= 0;
    const onSubmit = input.trim().length > 0 && !isGenerating && !isImproving && !noCredits
    return (
        <div className="flex w-[320px] shrink-0 flex-col bg-[#0d0d0d]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/6 px-2 py-3">
                <BlueTitle>{appTitle}</BlueTitle>
                <PricingModal reason={noCredits ? "credits" : "upgrade"}>
                    <span
                        className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] transition-colors",
                            noCredits
                                ? "bg-red-500/15 text-red-400/80 hover:bg-red-500/25"
                                : "bg-white/6 text-white/30 hover:bg-white/10 hover:text-white/50"
                        )}
                    >
                        {noCredits
                            ? "No credits · Upgrade"
                            : `${credits} credit${credits !== 1 ? "s" : ""}`}
                    </span>
                </PricingModal>
            </div>
        </div>

    )
}

export default ChatPanel