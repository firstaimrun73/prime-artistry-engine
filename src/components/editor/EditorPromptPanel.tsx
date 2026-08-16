import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { EditorToolCategories } from "@/components/EditorToolCategories";
import { Wand2 } from "lucide-react";
import { EXAMPLE_PROMPTS } from "@/lib/prompt-suggestions";
import { VIDEO_QUICK_STYLES } from "@/lib/editor/editor.constants";

interface Suggestion {
  label: string;
  prompt: string;
}

interface EditorPromptPanelProps {
  mediaType: "image" | "video";
  loading: boolean;
  inputDataUrl: string | null;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  taRef: React.RefObject<HTMLTextAreaElement>;
  suggestions: Suggestion[];
  onSelectTool: (tool: { prompt: string }) => void;
}

export function EditorPromptPanel({
  mediaType,
  loading,
  inputDataUrl,
  prompt,
  setPrompt,
  taRef,
  suggestions,
  onSelectTool,
}: EditorPromptPanelProps) {
  return (
    <>
      {/* 2. TOOLS — primary tool entry (Circle to Remove lives only in EditorToolCategories) */}
      {!loading && mediaType === "image" && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            2. Choose a tool
          </p>
          <EditorToolCategories
            hasImage={!!inputDataUrl}
            disabled={loading}
            onSelectTool={onSelectTool}
          />
        </section>
      )}
      {!loading && mediaType === "video" && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            2. Quick styles
          </p>
          <div className="flex flex-wrap gap-2">
            {VIDEO_QUICK_STYLES.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setPrompt(q.prompt)}
                className="btn-animate min-h-[40px] rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
              >
                <span className="mr-1">{q.emoji}</span>{q.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. PROMPT */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          3. Describe
        </p>
        <div className="relative">
          <Textarea
            ref={taRef}
            placeholder={
              inputDataUrl
                ? "Describe the edit… e.g. remove background, make cinematic, enhance quality (any language)"
                : `Describe the ${mediaType} you want… (any language supported)`
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
            rows={4}
            disabled={loading}
            className="min-h-[100px] resize-none pr-12 text-base sm:text-sm"
          />
          <div className="absolute right-2 top-2">
            <VoiceInputButton
              disabled={loading}
              onTranscript={(t) => setPrompt((p) => (p ? `${p} ${t}` : t).slice(0, 2000))}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 text-primary">
              <Wand2 className="h-3 w-3" /> Auto-enhanced before generating
            </span>
            <span>{prompt.length}/2000</span>
          </div>
        </div>

        {/* Smart, keyword-triggered suggestions */}
        {!loading && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-fade-in">
            {suggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => setPrompt(s.prompt)}
                className="min-h-[36px] rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:scale-105"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Example prompts when the box is empty */}
        {!loading && !prompt.trim() && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setPrompt(s.prompt)}
                  className="min-h-[36px] rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary hover:text-foreground hover:scale-105"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}