
"use client";
import ReactMarkdown from "react-markdown";
function MarkdownRenderer({ content }: { content: string }) {
  return <ReactMarkdown>{content}</ReactMarkdown>;
}
import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { trpc } from "@/lib/trpc/client";
import { useUserOrGuest } from "@/lib/auth/useUserOrGuest";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, MessageSquare, Share2, MoreVertical, ThumbsUp, ThumbsDown, Menu, Sun, Moon, Edit2, Clipboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GrainGradient } from "@paper-design/shaders-react";
import clsx from "clsx";


// Responsive hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function ChatGPTPage() {
  const { userId, guestId, loading: authLoading } = useUserOrGuest();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Inline edit state for user messages
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const isMobile = useIsMobile();
  // Theme state for light/dark mode
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  // Only apply theme to chat area, not body

  // Fetch all sessions for sidebar
  const { data: sessions, refetch: refetchSessions } = trpc.chat.getSessions.useQuery(
    { userId, guestId },
    { enabled: !!userId || !!guestId }
  );

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
        refetchSessions();
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
          refetchSessions();
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

  // New chat button
  const handleNewChat = async () => {
    const session = await createSession.mutateAsync({ userId, guestId });
    setSessionId(session.id);
    setLocalMessages([]);
    refetchSessions();
  };

  // Select chat session from sidebar
  const handleSelectSession = (id: string) => {
    setSessionId(id);
    setLocalMessages([]);
  };

  // Auto-scroll to bottom on new message
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, isLoading]);

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

  // Example prompts for quick start
  const examplePrompts = [
    {
      title: "How do I choose a career?",
      description: "Guidance for career selection",
      value: "How do I choose a career that fits me?"
    },
    {
      title: "Resume improvement tips",
      description: "Make your resume stand out",
      value: "How can I improve my resume for tech jobs?"
    },
    {
      title: "Interview preparation",
      description: "Ace your next interview",
      value: "What are the best ways to prepare for interviews?"
    },
    {
      title: "Skills for 2025",
      description: "Stay ahead in your field",
      value: "What skills will be in demand in 2025?"
    }
  ];

  // Show input centered if no messages yet
  const showCenteredInput = localMessages.length === 0;

  return (
    <div className={clsx("flex h-screen w-full font-inter transition-colors duration-300", theme === 'dark' ? "bg-[#0a0a0a] text-white" : "bg-[#f7f7f7] text-[#222]")}>
      {/* Sidebar */}
      <aside className={clsx(
        "flex flex-col h-full bg-[#171717] border-r border-[#222] transition-all duration-300 z-30",
        sidebarOpen ? (isMobile ? "fixed left-0 top-0 w-64" : "w-64") : (isMobile ? "fixed left-0 top-0 w-16" : "w-16")
      )}>
        {/* Collapsed sidebar: icons only */}
        {sidebarOpen ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-[#222]">
              <Button className="flex gap-2 items-center" onClick={handleNewChat} aria-label="New chat">
                <Plus size={18} />
                <span>New Chat</span>
              </Button>
              {/* Collapse button for desktop */}
              {!isMobile && (
                <Button variant="ghost" className="p-2 rounded-full" aria-label="Collapse sidebar" onClick={() => setSidebarOpen(v => !v)}>
                  <Menu size={20} />
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-[#171717]">
              <div className="text-xs text-[#a0a0a0] mb-2 px-2">Recent Conversations</div>
              {sessions?.length === 0 && (
                <div className="text-[#a0a0a0] text-center mt-8">No chats yet</div>
              )}
              {sessions?.map((s: ChatSession) => (
                <div
                  key={s.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open chat ${s.topic || s.messages?.[0]?.content?.slice(0, 24) || "New Chat"}`}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-3 rounded-lg cursor-pointer transition-all whitespace-nowrap overflow-hidden text-ellipsis relative",
                    s.id === sessionId ? "bg-[#222]" : "hover:bg-[#222]"
                  )}
                  onClick={() => {
                    handleSelectSession(s.id);
                    if (isMobile) setSidebarOpen(false);
                  }}
                >
                  <MessageSquare size={16} className="text-[#a0a0a0]" />
                  <span className="flex-1 overflow-hidden text-ellipsis text-sm">
                    {s.topic || s.messages?.[0]?.content?.slice(0, 24) || "New Chat"}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#222]">
              <div className="flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer hover:bg-[#222]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] flex items-center justify-center font-semibold shadow">U</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">User Name</div>
                  <div className="text-xs text-[#a0a0a0]">user@example.com</div>
                </div>
                <MoreVertical className="text-[#a0a0a0]" size={18} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-6 py-4 border-b border-[#222]">
              <Button variant="ghost" className="p-2 rounded-full" aria-label="Expand sidebar" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </Button>
              <Button variant="ghost" className="p-2 rounded-full" onClick={handleNewChat} aria-label="New chat">
                <Plus size={20} />
              </Button>
            </div>
            <div className="flex flex-col items-center gap-6 py-4 border-t border-[#222]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] flex items-center justify-center font-semibold shadow">U</div>
            </div>
          </>
        )}
      </aside>
      {/* Main chat area */}
      <div className="flex flex-col flex-1 h-full">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-[#222] bg-[#0a0a0ab3] backdrop-blur-md">
          <div className="flex items-center gap-2 text-lg font-medium">
            <MessageSquare size={22} className="text-[#4f46e5]" />
            <span>CounslerAI</span>
            <span className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse ml-2" />
            <span className="text-xs text-[#a0a0a0]">Online</span>
          </div>
          <div className="flex gap-3 items-center">
            <Button variant="ghost" className="w-8 h-8 rounded-full border border-[#222] text-[#a0a0a0] flex items-center justify-center" title="Share chat" aria-label="Share chat">
              <Share2 size={18} />
            </Button>
            <Button variant="ghost" className="w-8 h-8 rounded-full border border-[#222] text-[#a0a0a0] flex items-center justify-center" title="Options" aria-label="Options">
              <MoreVertical size={18} />
            </Button>
            {/* Theme toggle only for chat area */}
            <Button variant="ghost" className="p-2 rounded-full ml-2" aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
          </div>
        </header>
        {/* Scrollable messages container */}
        <main className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-[#0a0a0a]" tabIndex={0} aria-label="Chat messages">
          {/* Message bubbles */}
          {showCenteredInput && (
            <div className="flex flex-col items-center justify-center h-full max-w-[700px] mx-auto text-center animate-fadeIn">
              <div className="text-5xl mb-4 bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] bg-clip-text text-transparent">
                <MessageSquare size={48} />
              </div>
              <h1 className="text-4xl font-semibold mb-4 bg-gradient-to-r from-white to-[#a0a0a0] bg-clip-text text-transparent">Welcome to CounslerAI</h1>
              <p className="text-2xl text-[#a0a0a0] mb-10 font-light">Your personal career and life guidance assistant</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {examplePrompts.map((ex, i) => (
                  <button
                    key={i}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-left hover:bg-[#3a3a3a] transition-all relative overflow-hidden"
                    onClick={() => setMessage(ex.value)}
                    aria-label={ex.title}
                  >
                    <div className="font-medium mb-2 relative z-10">{ex.title}</div>
                    <div className="text-sm text-[#a0a0a0] relative z-10">{ex.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!showCenteredInput && localMessages.map((msg: Message, idx) => (
            <div
              key={msg.id}
              className={clsx(
                "group flex gap-4 max-w-[800px] mx-auto w-full animate-fadeIn",
                msg.sender === "user" ? "flex-row-reverse" : ""
              )}
            >
              {/* Avatar */}
              <div className={clsx(
                "w-9 h-9 rounded-full flex items-center justify-center font-semibold",
                msg.sender === "user"
                  ? "bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] shadow"
                  : "bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow"
              )}>{msg.sender === "user" ? <span>U</span> : <span><MessageSquare size={18} /></span>}</div>
              <div className={clsx("flex-1 py-4 relative", msg.sender === "user" ? "text-right" : "")}>
                {/* Inline edit for user messages */}
                {msg.sender === "user" && editingMsgId === msg.id ? (
                  <div className="flex flex-col items-end gap-2">
                    <textarea
                      className="bg-[#2a2a2a] border border-[#4f46e5] rounded-xl p-2 text-base text-white w-full resize-none"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      autoFocus
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => {
                        setLocalMessages(msgs => msgs.map(m => m.id === msg.id ? { ...m, content: editValue } : m));
                        setEditingMsgId(null);
                      }}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingMsgId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className={clsx(
                    "inline-block max-w-full text-left rounded-xl p-4 text-base leading-relaxed",
                    msg.sender === "user"
                      ? "bg-gradient-to-br from-[#4f46e5]/80 to-[#8b5cf6]/80 text-white shadow-md"
                      : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#eaeaea] prose prose-invert whitespace-pre-line"
                  )}>
                    {msg.sender === "ai"
                      ? <MarkdownRenderer content={msg.content} />
                      : msg.content}
                  </div>
                )}
                {/* Copy icon only on hover */}
                <button
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-none border-none text-[#666] cursor-pointer flex items-center hover:text-white hover:bg-[#3a3a3a] px-2 py-1 rounded-md"
                  aria-label="Copy"
                  onClick={() => navigator.clipboard.writeText(msg.content)}
                >
                  <Clipboard size={16} />
                </button>
              </div>
            </div>
          ))}
          {/* Undo snackbar placeholder */}
          {/* TODO: Implement undo snackbar for deleted messages */}
        </main>
        {/* Sticky bottom input bar */}
        <footer className="sticky bottom-0 z-20 px-6 py-5 bg-[#1a1a1ab3] backdrop-blur-md border-t border-[#222]">
          <form
            className="max-w-[800px] mx-auto relative"
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            aria-label="Send message"
          >
            <Input
              className="w-full py-4 pr-12 pl-5 bg-[#1a1a1a] border border-[#222] rounded-xl text-base text-white outline-none resize-none transition-all font-inter"
              placeholder="Message CounslerAI..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") handleSend();
              }}
              disabled={isLoading}
              aria-label="Message input"
            />
            <Button
              type="submit"
              disabled={!message || isLoading}
              className="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] border-none text-white flex items-center justify-center transition-all shadow-lg hover:scale-105 hover:shadow-xl disabled:bg-[#2a2a2a] disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Loader2 className={isLoading ? "animate-spin" : "hidden"} style={{ width: 20, height: 20 }} />
              {!isLoading && <MessageSquare size={18} />}
            </Button>
          </form>
          <div className="text-center text-xs text-[#666] mt-3">
            CounslerAI can make mistakes. Consider checking important information.
          </div>
        </footer>
      </div>
    </div>
  );
}
