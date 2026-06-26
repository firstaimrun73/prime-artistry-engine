import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { submitFeedback, FEEDBACK_CATEGORIES } from "@/lib/feedback.functions";
import { toast } from "sonner";

const EMOJIS = ["😡", "😕", "😐", "🙂", "😍"];

export function DevNotice() {
  return (
    <div
      style={{
        background: "#1a1500",
        borderBottom: "1px solid #FFD700",
        padding: "8px 16px",
        textAlign: "center",
        fontSize: "13px",
        color: "#FFD700",
        position: "sticky",
        top: 0,
        zIndex: 9999,
      }}
    >
      🚧 We are still improving! Some features are in development. Found a bug? Email us at{" "}
      <a href="mailto:support@motio2edit.com" style={{ color: "#FFD700", textDecoration: "underline" }}>
        support@motio2edit.com
      </a>
    </div>
  );
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<string>("General Feedback");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const { user } = useAuth();
  const send = useServerFn(submitFeedback);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      setOpen(false);
      setDone(false);
      setRating(0);
      setMessage("");
      setName("");
      setEmail("");
      setCategory("General Feedback");
    }, 3000);
    return () => clearTimeout(t);
  }, [done]);

  const handleSubmit = async () => {
    if (!rating) return toast.error("Please pick a rating.");
    if (!message.trim()) return toast.error("Please write a message.");
    setSubmitting(true);
    try {
      await send({
        data: {
          userId: user?.id ?? null,
          userName: name.trim() || null,
          userEmail: email.trim() || null,
          category: category as (typeof FEEDBACK_CATEGORIES)[number],
          rating,
          message: message.trim(),
          pageUrl: typeof window !== "undefined" ? window.location.href : null,
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          background: "#6c63ff",
          color: "#fff",
          border: "none",
          borderRadius: "25px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          zIndex: 9998,
          boxShadow: "0 4px 15px rgba(108,99,255,0.4)",
        }}
      >
        💬 Feedback
      </button>

      {open && (
        <div
          onClick={() => !submitting && setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-foreground"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            {done ? (
              <div className="py-6 text-center">
                <p className="text-lg font-semibold">🎉 Thank you for your feedback!</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  We read every single response and use it to improve Motio2Edit.
                  <br />— The Motio2Edit Team
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold">Share your feedback</h2>

                <p className="mt-4 text-sm font-medium">How would you rate us?</p>
                <div className="mt-2 flex gap-2">
                  {EMOJIS.map((e, i) => (
                    <button
                      key={i}
                      onClick={() => setRating(i + 1)}
                      className={`flex-1 rounded-lg border p-2 text-2xl transition-colors ${
                        rating === i + 1 ? "border-primary bg-accent" : "border-border"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                <label className="mt-4 block text-sm font-medium">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
                >
                  {FEEDBACK_CATEGORIES.filter((c) => c !== "Payment Experience").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <label className="mt-4 block text-sm font-medium">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                  placeholder="Tell us what you think..."
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/1000</p>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email (optional)"
                  className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm"
                />

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {submitting ? "Sending…" : "Send Feedback 🚀"}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
                  >
                    Maybe Later
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
