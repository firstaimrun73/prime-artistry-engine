import { useRef } from "react";
import { Plus, X, FileText } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { toast } from "sonner";

const SCRIPT_MAX = 8000;
const DOC_ACCEPT = ".txt,.pdf,.md,.text,text/plain,application/pdf";

async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type || "";

  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".text")) {
    return await file.text();
  }

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let raw = "";
    for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
    const chunks: string[] = [];
    const parenRe = /\((?:\\.|[^\\()])*\)/g;
    let m: RegExpExecArray | null;
    while ((m = parenRe.exec(raw)) !== null) {
      let s = m[0].slice(1, -1);
      s = s
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\t/g, " ")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\");
      if (/[\x20-\x7E\n]{3,}/.test(s)) chunks.push(s);
    }
    const joined = chunks.join(" ").replace(/\s+/g, " ").trim();
    if (joined.length < 20) {
      throw new Error("Could not read text from this PDF. Try a .txt file or paste the script.");
    }
    return joined;
  }

  throw new Error("Supported documents: TXT, PDF, MD.");
}

export function VideoScriptBar({
  value,
  onChange,
  disabled,
  attachedName,
  onClearAttachment,
  onAttached,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  attachedName?: string | null;
  onClearAttachment?: () => void;
  onAttached?: (name: string) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onAttach = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Document max 10 MB.");
      return;
    }
    try {
      const text = await extractTextFromFile(file);
      const next = text.slice(0, SCRIPT_MAX);
      onChange(next);
      onAttached?.(file.name);
      toast.success(`Loaded ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read document.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl border border-border/70 bg-background/80 focus-within:ring-2 focus-within:ring-red-500/30">
        <div className="flex items-start gap-1 px-2 pt-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            className="mt-0.5 shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Attach document"
            title="Attach TXT or PDF"
          >
            <Plus className="h-5 w-5" />
          </button>
          <textarea
            ref={taRef}
            value={value}
            disabled={disabled}
            rows={5}
            maxLength={SCRIPT_MAX}
            onChange={(e) => onChange(e.target.value.slice(0, SCRIPT_MAX))}
            placeholder="Write or paste your script… Scenes will be generated in sequence."
            className="min-h-[120px] w-full flex-1 resize-y bg-transparent py-2 pr-16 text-sm outline-none disabled:opacity-60"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {value && !disabled && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Clear script"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <VoiceInputButton
              disabled={disabled}
              onTranscript={(t) => {
                const next = value.trim() ? `${value.trim()} ${t}` : t;
                onChange(next.slice(0, SCRIPT_MAX));
              }}
            />
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={DOC_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onAttach(f);
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">
          {attachedName ? (
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {attachedName}
              {onClearAttachment && (
                <button type="button" className="underline" onClick={onClearAttachment}>
                  remove
                </button>
              )}
            </span>
          ) : (
            <span>+ attach TXT / PDF</span>
          )}
        </span>
        <span>
          {value.length}/{SCRIPT_MAX}
          {value.trim() ? ` · ${value.trim().split(/\s+/).filter(Boolean).length} words` : ""}
        </span>
      </div>
    </div>
  );
}

/** Split script into up to `maxParts` chunks for sequential generation. */
export function splitScriptIntoParts(script: string, maxParts: number): string[] {
  const cleaned = script.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
  if (maxParts <= 1) return [cleaned];

  let blocks = cleaned.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length < maxParts) {
    const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [cleaned];
    if (sentences.length >= maxParts) blocks = sentences;
    else blocks = [cleaned];
  }

  if (blocks.length <= maxParts) return blocks.slice(0, maxParts);

  const parts: string[] = Array.from({ length: maxParts }, () => "");
  blocks.forEach((b, i) => {
    const idx = Math.min(maxParts - 1, Math.floor((i * maxParts) / blocks.length));
    parts[idx] = parts[idx] ? `${parts[idx]} ${b}` : b;
  });
  return parts.filter(Boolean);
}
