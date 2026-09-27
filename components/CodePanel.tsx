"use client"
// ─── Placeholder ──────────────────────────────────────────────────────────────

import { FileData, StatusStep } from "@/types/worksapce";
import { useEffect, useRef, useState } from "react";
import {
    SandpackProvider,
    SandpackLayout,
    SandpackCodeEditor,
    SandpackPreview,
    SandpackFileExplorer,
    useSandpack,
} from "@codesandbox/sandpack-react";
import { dracula } from "@codesandbox/sandpack-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Code2, Eye } from "lucide-react";
import { RingLoader } from "react-spinners";

const PLACEHOLDER_FILES = {
    "/App.js": {
        code: `export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
        <p style={{ fontSize: 14 }}>Your app will appear here</p>
      </div>
    </div>
  );
}`,
    },
};

// ─── Base dependencies ────────────────────────────────────────────────────────

const BASE_DEPENDENCIES: Record<string, string> = {
    "react-is": "latest",
    "react-router-dom": "latest",
    "lucide-react": "latest",
    recharts: "latest",
    "date-fns": "latest",
    "framer-motion": "latest",
    "react-hook-form": "latest",
    "@hookform/resolvers": "latest",
    zod: "latest",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-tooltip": "latest",
    "@radix-ui/react-accordion": "latest",
    "@radix-ui/react-select": "latest",
    axios: "latest",
    clsx: "latest",
    "class-variance-authority": "latest",
    "tailwind-merge": "latest",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = "preview" | "code";

interface CodePanelProps {
    fileData: FileData | null;
    isGenerating: boolean;
    statusLog: StatusStep[];
    onFilePatch: (patches: FileData) => void;
    isImproving: boolean

}

function SandpackInner({
    isGenerating,
    statusLog,
    activeTab,
    setActiveTab,
    fileData,
    isImproving,
    //   onImprove,
    //   onFixError,
    //   appTitle,

    //   isProUser,
}: {
    fileData: FileData | null;
    isGenerating: boolean;
    statusLog: StatusStep[];
    activeTab: ActiveTab;
    setActiveTab: (t: ActiveTab) => void;
    isImproving: boolean;
    //   onImprove: (userRequest: string) => Promise<void>;
    //   onFixError: (error: string) => Promise<void>;
    //   appTitle: string | null;
    //   isProUser: boolean;
}) {
    const { sandpack, listen } = useSandpack();
    // TODO: listen - imported from useSandpack for error detection

    // -- Push file updates into Sandpack without remounting ------------.
    // We key SandpackProvider on the file PATH SET only.
    // When file CONTENTS change (after generation), we push them via updateFile()
    // so Sandpack stays mounted and the preview refreshes in place

    const prevFilesRef = useRef<Record<string, { code: string }>>({});

    useEffect(() => {
        if (!fileData?.files) return;
        const prev = prevFilesRef.current;
        for (const [path, { code }] of Object.entries(fileData.files)) {
            if (prev[path]?.code !== code) {
                sandpack.updateFile(path, code);
            }
        }
        prevFilesRef.current = fileData.files;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileData?.files]);
    // TODO: useEffect listen() for Sandpack preview errors
    // msg.type === "action" && msg.action === "show-error" → setPreviewError
    // msg.type === "compile" && "error" in msg → setPreviewError
    // msg.type === "success" → setPreviewError(null)

    useEffect(() => {
        if (fileData) setActiveTab("preview");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileData]);

    return (
        <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as ActiveTab)}
            className="flex h-full flex-col gap-0"
        >
            <div className="flex items-center justify-between border-b border-white/6 px-2">
                <TabsList variant="line"
                    className="h-auto gap-0 rounded-none bg-transparent p-0">
                    <TabsTrigger className="border-b-2 pt-2" value="code">
                        <Code2 className="h-3.5 w-3.5" />
                        Code
                    </TabsTrigger>
                    <TabsTrigger className="border-b-2 pt-2" value="preview">
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                    </TabsTrigger>
                </TabsList>
                {/* TODO: Improve with AI button (Pro/Starter only, Pricingmodal for free) */}
                {/* TODO: Download zip button) */}
            </div>

            <div className="relative flex-1 overflow-hidden">
                {(isGenerating || isImproving) && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[#0a0a0a]/85 backdrop-blur-sm">
                        <RingLoader color="#60a5fa" size={64} speedMultiplier={0.8} />
                        <div className="flex flex-col items-center gap-1.5">
                            <p className="text-sm font-medium text-white/60">
                                {isImproving
                                    ? "Improving with Cline AI…"
                                    : (statusLog[statusLog.length - 1]?.label ?? "Generating")}
                            </p>
                            <p className="text-xs text-white/20">
                                This usually takes 40–50 seconds
                            </p>
                        </div>
                    </div>
                )}

                <SandpackLayout
                    style={{
                        height: "100vh",
                        border: "none",
                        borderRadius: 0,
                        background: "transparent",
                    }}
                >
                    <TabsContent
                        value="preview"
                        keepMounted
                        className="mt-0 h-full w-full"
                    >
                        <SandpackPreview
                            style={{ height: "89%" }}
                            showOpenInCodeSandbox={false}
                        />
                    </TabsContent>

                    <TabsContent
                        value="code"
                        keepMounted
                        className="mt-0 flex h-full w-full"
                    >
                        <SandpackFileExplorer
                            style={{
                                height: "90%",
                                width: "180px",
                                borderRight: "0.5px solid rgba(255,255,255,0.08)",
                            }}
                        />
                        <SandpackCodeEditor
                            style={{ height: "90%", flex: 1 }}
                            showTabs
                            showLineNumbers
                            showInlineErrors
                            closableTabs
                            readOnly
                        // readonly - users modify via prompts, not direct editing
                        />
                    </TabsContent>
                </SandpackLayout>
            </div>

        </Tabs>
    )

}

export function CodePanel({
    fileData,
    isGenerating,
    statusLog,
    onFilePatch: _onFilePatch,
    isImproving
}: CodePanelProps) {
    const [activeTab, setActiveTab] = useState<ActiveTab>("preview");

    const files = fileData?.files ?? PLACEHOLDER_FILES;

    const dependencies = {
        ...BASE_DEPENDENCIES,
        ...(fileData?.dependencies ?? {}),
    };

    // Key only on file path set — NOT on file contents.
    // Content changes go through sandpack.updateFile() inside SandpackInner.
    // This prevents Sandpack from remounting when only code changes.

    const filePathKey = Object.keys(files).sort().join("|");

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <SandpackProvider
                key={filePathKey}
                template="react"
                theme={dracula}
                files={files}
                customSetup={{ dependencies }}
                options={{
                    externalResources: ["https://cdn.tailwindcss.com"],
                    recompileMode: "delayed",
                    recompileDelay: 500,
                }}>
                <SandpackInner
                    isGenerating={isGenerating}
                    isImproving={isImproving}
                    statusLog={statusLog}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    fileData={fileData} />
            </SandpackProvider>
        </div>
    )
}
