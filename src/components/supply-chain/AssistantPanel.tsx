import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X, Zap } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import type { AssistantMessage } from "@/lib/assistant";
import type { RouteResult } from "@/lib/supply-chain";
import { chatReply } from "@/lib/assistant";
import { geminiChat } from "@/server/gemini.functions";

interface AssistantPanelProps {
  messages: AssistantMessage[];
  onUserMessage: (msgs: AssistantMessage[]) => void;
  route: RouteResult | null;
}

const TAG_LABEL: Record<NonNullable<AssistantMessage["tag"]>, string> = {
  intro: "Welcome",
  plan: "Plan",
  disruption: "Alert",
  optimize: "Optimize",
  whatif: "What-if",
  chat: "Flo",
};

const TAG_TONE: Record<NonNullable<AssistantMessage["tag"]>, string> = {
  intro: "bg-primary/15 text-primary",
  plan: "bg-primary/15 text-primary",
  disruption: "bg-warning/15 text-warning",
  optimize: "bg-primary/15 text-primary",
  whatif: "bg-secondary text-foreground/70",
  chat: "bg-primary/10 text-primary",
};

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Lightweight markdown — supports **bold**, *italic*, bullet points (•/- at start), and \n newlines.
function renderInline(text: string) {
  return text.split("\n").map((line, li) => {
    // Handle bullet points
    const isBullet = /^[•\-\*]\s/.test(line.trim());
    const cleanLine = isBullet ? line.trim().replace(/^[•\-\*]\s/, "") : line;

    const parts = cleanLine.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
    const rendered = (
      <span key={li}>
        {isBullet && <span className="text-primary mr-1.5">•</span>}
        {parts.map((p, i) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={i} className="font-semibold text-foreground">
              {p.slice(2, -2)}
            </strong>
          ) : (p.startsWith("*") && p.endsWith("*")) || (p.startsWith("_") && p.endsWith("_")) ? (
            <em key={i} className="italic text-foreground/70">
              {p.slice(1, -1)}
            </em>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
        {li < text.split("\n").length - 1 && <br />}
      </span>
    );
    return rendered;
  });
}

const SUGGESTIONS = [
  "Compare all modes",
  "Why this transport?",
  "What's the CO₂ impact?",
  "Should I optimize?",
  "Suggest a better route",
  "What if there's a storm?",
];

export function AssistantPanel({ messages, onUserMessage, route }: AssistantPanelProps) {
  const [open, setOpen] = useState(true);
  const [unread, setUnread] = useState(0);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSeenRef = useRef(messages.length);
  // Track chat history for Gemini context
  const chatHistoryRef = useRef<{ role: "user" | "model"; text: string }[]>([]);

  const geminiFn = useServerFn(geminiChat);

  useEffect(() => {
    if (open) {
      lastSeenRef.current = messages.length;
      setUnread(0);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        inputRef.current?.focus();
      });
    } else {
      setUnread(messages.length - lastSeenRef.current);
    }
  }, [messages, open]);

  // Close panel with Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  const handleSend = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || typing) return;
    setInput("");

    // Create user message
    const userMsg: AssistantMessage = {
      id: id(),
      role: "user",
      ts: Date.now(),
      text: q,
    };

    // Immediately show user message
    onUserMessage([userMsg]);

    // Show typing indicator
    setTyping(true);

    try {
      // Call Gemini AI via server function
      const result = await geminiFn({
        data: {
          message: q,
          history: chatHistoryRef.current,
          route,
        },
      });

      // Update chat history for context
      chatHistoryRef.current = [
        ...chatHistoryRef.current,
        { role: "user" as const, text: q },
        { role: "model" as const, text: result.reply },
      ];

      // Keep history manageable (last 20 exchanges)
      if (chatHistoryRef.current.length > 40) {
        chatHistoryRef.current = chatHistoryRef.current.slice(-40);
      }

      const aiMsg: AssistantMessage = {
        id: id(),
        role: "ai",
        tag: "chat",
        ts: Date.now(),
        text: result.reply,
      };

      onUserMessage([aiMsg]);
    } catch (error) {
      console.error("Gemini chat error:", error);

      // Fallback to rule-based reply
      const [, fallbackReply] = chatReply(q, route);
      fallbackReply.text = `${fallbackReply.text}\n\n_⚡ Powered by local intelligence (Gemini unavailable)_`;
      onUserMessage([fallbackReply]);
    } finally {
      setTyping(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating toggle button (mobile) */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-[var(--brand-deep)] shadow-[var(--shadow-glow)] transition-transform hover:scale-105 active:scale-95 md:hidden"
        style={{ background: "var(--gradient-mint)" }}
        aria-label="Toggle assistant"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-[var(--brand-deep)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-40 flex h-screen w-full max-w-[360px] flex-col border-l border-border bg-[var(--brand-deep)]/95 backdrop-blur-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ boxShadow: "var(--shadow-elevated)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "var(--gradient-mint)" }}
              >
                <Bot className="h-4 w-4 text-[var(--brand-deep)]" strokeWidth={2.5} />
              </div>
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse-ring" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Flo</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5 text-primary" />
                  Powered by Gemini AI
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 animate-fade-up ${isUser ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar — only for AI */}
                {!isUser && (
                  <div
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--gradient-mint)" }}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[var(--brand-deep)]" />
                  </div>
                )}

                <div className={`min-w-0 max-w-[85%] ${isUser ? "items-end" : ""} flex flex-col`}>
                  {/* Tag badge — only for AI messages */}
                  {!isUser && m.tag && (
                    <span
                      className={`mb-1 inline-block self-start rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${TAG_TONE[m.tag]}`}
                    >
                      {TAG_LABEL[m.tag]}
                    </span>
                  )}

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? "rounded-tr-sm border border-primary/30 bg-primary/15 text-foreground"
                        : "rounded-tl-sm border border-border/60 bg-secondary/50 text-foreground/90"
                    }`}
                  >
                    {renderInline(m.text)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typing && (
            <div className="flex gap-2.5 animate-fade-up">
              <div
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "var(--gradient-mint)" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--brand-deep)]" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-secondary/50 px-4 py-3">
                <span className="flex items-center gap-2">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-primary/60"
                        style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
                      />
                    ))}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Gemini is thinking…</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick suggestions */}
        {route && (
          <div className="border-t border-border/60 px-3 py-2">
            <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Quick questions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={typing}
                  className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border/60 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 focus-within:border-primary/50 focus-within:bg-secondary/60 transition-colors">
            <input
              ref={inputRef}
              id="flo-chat-input"
              name="flo-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={route ? "Ask Flo anything…" : "Plan a route first, then ask me…"}
              disabled={typing}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none disabled:opacity-50"
              aria-label="Chat with Flo"
              autoComplete="off"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || typing}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[var(--brand-deep)] transition-opacity disabled:opacity-30 hover:opacity-90"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Flo is powered by <span className="text-primary font-medium">Gemini AI</span> · Press Enter to send
          </p>
        </div>
      </aside>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
