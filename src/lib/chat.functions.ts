/**
 * Chatbot server functions — Master Studio (business) + admin only.
 * Provider stays server-side only. Secrets never reach the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin-config";
import { PRODUCT_KNOWLEDGE } from "@/lib/chatbot-knowledge";

export const CHATBOT_MAX_INPUT_CHARS = 4000;
export const CHATBOT_MAX_OUTPUT_TOKENS = 1200;
export const CHATBOT_MAX_MESSAGES_PER_REQUEST = 1;
export const CHATBOT_RATE_LIMIT_PER_MINUTE = 10;
export const CHATBOT_DAILY_LIMIT = 100;

const schema = z.object({
  message: z.string().min(1).max(CHATBOT_MAX_INPUT_CHARS),
});

function geminiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  );
}

function canAccessChatbot(plan: string | null | undefined, email: string | null | undefined): boolean {
  if (isAdminEmail(email)) return true;
  return (plan ?? "").toLowerCase() === "business";
}
