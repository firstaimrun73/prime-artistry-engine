import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(4000),
      }),
    )
    .min(1)
    .max(40),
});

export const chatCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, email")
      .eq("id", userId)
      .single();

    const admin = isAdminEmail(profile?.email);
    if (!admin && !isPaidPlan(profile?.plan)) {
      throw new Error("Chat is available on paid plans. Upgrade to continue.");
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("AI service unavailable.");

    const systemPrompt =
      "You are Motio2edit's helpful assistant. Help users with prompts, plans, and using the editor. Be concise and friendly.";

    // Anthropic expects the system prompt as a top-level field and only
    // user/assistant turns in `messages`.
    const turns = data.messages.filter((m) => m.role !== "system");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: systemPrompt,
        messages: turns.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit reached, try again shortly.");
      throw new Error("Chat failed, please try again.");
    }

    const json = (await res.json()) as {
      content?: { type?: string; text?: string }[];
    };
    const reply =
      json.content?.find((c) => c.type === "text")?.text ?? "Sorry, I couldn't respond.";
    return { reply };
  });
