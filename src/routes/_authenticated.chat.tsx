import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { chatCompletion } from "@/lib/chat.functions";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Sparkles, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  component: Chat,
});

type Msg = { role: "user" | "assistant"; content: string };

function Chat() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const send = useServerFn(chatCompletion);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your Motio2edit assistant. Ask me anything." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const allowed =
    isAdminEmail(profile?.email) || isPaidPlan(profile?.plan);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Free users: no Chat UI — redirect to pricing (do not show disabled chat).
  useEffect(() => {
    if (profile && !allowed) {
      navigate({ to: "/pricing" });
    }
  }, [profile, allowed, navigate]);

  if (!profile || !allowed) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <Lock className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold">Chat is a paid feature</h1>
        <p className="text-sm text-muted-foreground">
          Upgrade your plan to use the Motio2edit assistant.
        </p>
        <Button asChild>
          <Link to="/pricing">View plans</Link>
        </Button>
      </div>
    );
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await send({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chat failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-6">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Sparkles className="h-5 w-5 text-primary" /> Assistant
      </h1>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
              Typing…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message…"
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
