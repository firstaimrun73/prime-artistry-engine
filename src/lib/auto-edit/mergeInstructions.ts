/**
 * Merge priority for Auto Edit instructions.
 *
 * 1. Safety/system constraints (handled in operation internal prompts)
 * 2. Explicit user instruction (Image Studio prompt)
 * 3. Image Studio commands/options (optional)
 * 4. Detected image requirements (analysis-selected internal prompt)
 * 5. Stored prompt defaults
 */

export type MergeInstructionInput = {
  /** Internal operation instruction from catalog / analysis */
  analysisPrompt: string;
  /** Optional free-text from Image Studio prompt bar */
  userPrompt?: string | null;
  /** Optional editor command / feature hint */
  editorCommand?: string | null;
};

export function mergeAutoEditInstructions(input: MergeInstructionInput): string {
  const analysis = input.analysisPrompt.trim();
  const user = input.userPrompt?.trim();
  const cmd = input.editorCommand?.trim();

  if (user && user.length > 0) {
    // Explicit user instruction leads; analysis supports without overriding intent
    const base = user.slice(0, 1200);
    const support = analysis ? ` Supporting automatic improvements only where they do not conflict: ${analysis.slice(0, 800)}` : "";
    const extra = cmd ? ` Editor context: ${cmd.slice(0, 300)}.` : "";
    return `${base}.${extra}${support}`;
  }

  if (cmd && cmd.length > 0) {
    return `${analysis} Editor command: ${cmd.slice(0, 400)}.`;
  }

  return analysis;
}
