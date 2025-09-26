"use client";
import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { trpc } from "@/lib/trpc/client";
import { useUserOrGuest } from "@/lib/auth/useUserOrGuest";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GrainGradient } from "@paper-design/shaders-react";
import { ChevronLeft, ChevronRight } from "lucide-react";


type Message = { id: string; sender: string; content: string };


export default function ChatPage() {
    const { userId, guestId, loading: authLoading } = useUserOrGuest();
    const router = useRouter();
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Prompt for login if neither user nor guest (shouldn't happen, but for safety)
    useEffect(() => {
        if (!authLoading && !userId && !guestId) {
            router.replace("/login");
        }
    }, [authLoading, userId, guestId, router]);
    // Restore sessionId from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedSessionId = localStorage.getItem("counslerai_sessionId");
            if (storedSessionId) setSessionId(storedSessionId);
        }
    }, []);

    // Persist sessionId to localStorage when it changes
    useEffect(() => {
        if (typeof window !== "undefined" && sessionId) {
            localStorage.setItem("counslerai_sessionId", sessionId);
        }
    }, [sessionId]);
    const [message, setMessage] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch messages for selected session
    const { data: session, refetch } = trpc.chat.getSession.useQuery(
        { sessionId: sessionId ?? "" },
        { enabled: !!sessionId }
    );

    // Local state for optimistic UI
    const [localMessages, setLocalMessages] = useState<Message[]>([]);

    // Keep localMessages in sync with server session
    useEffect(() => {
        if (session?.messages) {
            setLocalMessages(session.messages);
        }
    }, [session?.messages]);
    // Add message mutation
    const addMessage = trpc.chat.addMessage.useMutation();
    // Create session mutation
    const createSession = trpc.chat.createSession.useMutation();
    // AI mutation
    const getAdvice = trpc.ai.getCareerAdvice.useMutation();

    // Auto-create session on first message
    let sending = false;
    const handleSend = async () => {
        if (!message || isLoading || sending || authLoading) return;
        sending = true;
        setIsLoading(true);
        let currentSessionId = sessionId;
        let userMsg: Message | null = null;
        try {
            if (!currentSessionId) {
                const session = await createSession.mutateAsync({
                    userId: userId,
                    guestId: guestId,
                });
                currentSessionId = session.id;
                setSessionId(session.id);
            }
            // Optimistically add user message
            userMsg = {
                id: `local-${Date.now()}`,
                sender: "user",
                content: message,
            };
            setLocalMessages((msgs) => [...msgs, userMsg!]);
            setMessage("");
            try {
                await addMessage.mutateAsync({ sessionId: currentSessionId!, sender: "user", content: userMsg.content });
            } catch (err: any) {
                if (err?.message?.includes("Chat session does not exist")) {
                    // Clear invalid sessionId and create a new session, then retry
                    setSessionId(null);
                    localStorage.removeItem("counslerai_sessionId");
                    const session = await createSession.mutateAsync({
                        userId: userId,
                        guestId: guestId,
                    });
                    currentSessionId = session.id;
                    setSessionId(session.id);
                    await addMessage.mutateAsync({ sessionId: currentSessionId, sender: "user", content: userMsg.content });
                } else {
                    throw err;
                }
            }

            // Send full context to LLM (for memory)
            const contextMessages = [...(session?.messages ?? []), userMsg];
            const ai = await getAdvice.mutateAsync({ prompt: message, context: contextMessages });
            // Optimistically add AI message
            const aiMsg: Message = {
                id: `local-ai-${Date.now()}`,
                sender: "ai",
                content: ai.response,
            };
            setLocalMessages((msgs) => [...msgs, aiMsg]);
            await addMessage.mutateAsync({ sessionId: currentSessionId!, sender: "ai", content: ai.response });
            // Refetch from server to get canonical messages
            refetch();
        } finally {
            setIsLoading(false);
            sending = false;
        }
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value);
    const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSend();
    };

    // Auto-scroll to bottom on new message
    const chatEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [localMessages, isLoading]);

    return (
        <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
            <GrainGradient
                width={1280}
                height={720}
                colors={["#001ae0"]}
                colorBack="#0a0500"
                softness={0.5}
                intensity={0.5}
                noise={0.5}
                shape="ripple"
                speed={1}
                scale={0.5}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    zIndex: 0,
                }}
            />
            {/* Collapsible Sidebar */}
            <div
                style={{
                    position: "absolute",
                    left: sidebarOpen ? 0 : -220,
                    top: 0,
                    height: "100vh",
                    width: 220,
                    background: "rgba(255,255,255,0.85)",
                    borderRight: "1px solid #e5e7eb",
                    zIndex: 2,
                    transition: "left 0.3s",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    paddingTop: 32,
                }}
            >
                <Button
                    variant="ghost"
                    onClick={() => setSidebarOpen(false)}
                    style={{ position: "absolute", right: -24, top: 20, zIndex: 3 }}
                >
                    <ChevronLeft />
                </Button>
                <div style={{ marginLeft: 16, marginBottom: 16, fontWeight: 600 }}>
                    Session ID:
                    <div style={{ fontSize: 12, color: '#555', wordBreak: 'break-all' }}>{sessionId || "(none)"}</div>
                </div>
                <div style={{ marginLeft: 16, fontSize: 14, color: '#888' }}>
                    (future: history, settings, etc.)
                </div>
            </div>
            {/* Sidebar open arrow */}
            {!sidebarOpen && (
                <Button
                    variant="ghost"

                    onClick={() => setSidebarOpen(true)}
                    style={{ position: "absolute", left: 0, top: 20, zIndex: 3 }}
                >
                    <ChevronRight />
                </Button>
            )}
            {/* Chat messages outside the box */}
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100vw",
                    height: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    zIndex: 1,
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: 600,
                        height: 400,
                        marginTop: 32,
                        marginBottom: 0,
                        background: "rgba(255,255,255,0.85)",
                        borderRadius: 16,
                        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                        padding: 24,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0,
                    }}
                >
                    {localMessages.map((msg: Message) => (
                        <div
                            key={msg.id}
                            style={{
                                textAlign: msg.sender === "user" ? "right" : "left",
                                marginBottom: 12,
                                paddingRight: msg.sender === "user" ? 0 : 64,
                                paddingLeft: msg.sender === "user" ? 64 : 0,
                            }}
                        >
                            <span
                                style={{
                                    display: "inline-block",
                                    padding: "8px 16px",
                                    borderRadius: 12,
                                    background: msg.sender === "user" ? "#2563eb" : "#e5e7eb",
                                    color: msg.sender === "user" ? "#fff" : "#111",
                                    fontSize: 16,
                                    boxShadow: msg.sender === "user"
                                        ? "0 2px 8px rgba(37,99,235,0.12)"
                                        : "0 2px 8px rgba(0,0,0,0.06)",
                                }}
                            >
                                {msg.content}
                            </span>
                        </div>
                    ))}
                    {isLoading && (
                        <div style={{ textAlign: "left", marginBottom: 12, paddingLeft: 0 }}>
                            <span
                                style={{
                                    display: "inline-block",
                                    padding: "8px 16px",
                                    borderRadius: 12,
                                    background: "#e5e7eb",
                                    color: "#111",
                                    fontSize: 16,
                                    opacity: 0.7,
                                }}
                            >
                                <Loader2 className="animate-spin" style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
                                Thinking...
                            </span>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                {/* Chat input box centered at bottom */}
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        handleSend();
                    }}
                    style={{
                        width: "100%",
                        maxWidth: 600,
                        background: "rgba(255,255,255,0.85)",
                        borderRadius: 16,
                        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                        padding: 24,
                        margin: "0 auto 32px auto",
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        position: "sticky",
                        bottom: 0,
                        zIndex: 2,
                    }}
                >
                    <Input
                        placeholder="Type your message..."
                        value={message}
                        onChange={handleMessageChange}
                        onKeyDown={handleInputKeyDown}
                        style={{ flex: 1 }}
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={!message || isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" style={{ width: 20, height: 20 }} /> : "Send"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
