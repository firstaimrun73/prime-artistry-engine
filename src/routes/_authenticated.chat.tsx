import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { chatCompletion, CHATBOT_MAX_INPUT_CHARS } from "@/lib/chat.functions";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { canAccessChat } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Lock, ArrowLeft, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatbotPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function ChatbotPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const send = useServerFn(chatCompletion);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm Chatbot. Ask about Motio2edit features, plans, credits, or how to use the studios.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const allowed = canAccessChat({
    plan: profile?.plan,
    email: profile?.email,
    isAdmin: isAdminEmail(profile?.email),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (profile && !allowed) {
      navigate({ to: "/pricing" });
    }
  }, [profile, allowed, navigate]);

  if (!profile || !allowed) {
    return (
      <div className="min-h-screen bg-background">
        <SimpleNav />
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
          <Lock className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">Chatbot is a paid-plan feature</h1>
          <p className="text-sm text-muted-foreground">
            Upgrade to a paid plan to use Chatbot.
          </p>
          <Button asChild>
            <Link to="/pricing">View plans</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (text.length > CHATBOT_MAX_INPUT_CHARS) {
      toast.error(`Message is too long (max ${CHATBOT_MAX_INPUT_CHARS} characters).`);
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await send({ data: { message: text } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chatbot failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SimpleNav />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
        <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <MessageSquare className="h-5 w-5 text-primary" />
          Chatbot
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Product help for your plan</p>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/80 text-secondary-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-secondary/80 px-3.5 py-2 text-sm text-muted-foreground">
                Thinking…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex gap-2 pb-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, CHATBOT_MAX_INPUT_CHARS))}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask Chatbot…"
            className="rounded-xl"
            maxLength={CHATBOT_MAX_INPUT_CHARS}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0 rounded-xl"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SimpleNav() {
  return (
    <div className="border-b border-border bg-background/80 backdrop-blur-sm md:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
      </div>
    </div>
  );
}
