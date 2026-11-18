#!/usr/bin/env python3
"""Server-side experience lock, multi-ref merge, Auto defaults."""
from pathlib import Path
p = Path("src/lib/generate.functions.ts")
text = p.read_text()
if "Authoritative experience lock" in text and "Merge primary + imageUrls" in text:
    print("already patched", len(text))
    raise SystemExit(0)

old_imp = 'import { computeImageExperienceCredits } from "@/lib/studio/image/image-experience-credits";'
if "assertImageExperienceAccess" not in text:
    if old_imp not in text:
        raise SystemExit("import missing")
    text = text.replace(
        old_imp,
        old_imp
        + "\nimport { assertImageExperienceAccess } from \"@/lib/studio/image/image-experience-access\";"
        + "\nimport type { StudioTier } from \"@/lib/studio/studio-tier\";",
        1,
    )

anchor = "    const plan = (profile.plan || \"free\") as PlanId;\n    const credits = profile.credits ?? 0;\n\n    let cost = 0;"
insert = """    const plan = (profile.plan || \"free\") as PlanId;
    const credits = profile.credits ?? 0;

    // Authoritative experience lock — client cannot bypass via studioTier in payload
    if (data.type === \"image\" && data.studioTier) {
      assertImageExperienceAccess(plan, data.studioTier as StudioTier, isAdmin);
    }

    // Auto workspace defaults (Composer passes explicit aspect/quality)
    if (data.type === \"image\") {
      const meta = (data.imageStudioMeta || {}) as Record<string, unknown>;
      const mode = meta.workspaceMode === \"composer\" ? \"composer\" : \"auto\";
      if (mode === \"auto\") {
        const hasImage = !!(
          data.imageUrl ||
          (data.imageUrls && data.imageUrls.length) ||
          ((data as any).referenceImageUrls && (data as any).referenceImageUrls.length)
        );
        if (!data.aspectRatio) (data as any).aspectRatio = \"1:1\";
        if (!data.imageQuality) {
          (data as any).imageQuality = data.studioTier === \"premium\" || data.studioTier === \"pro\" ? \"hd\" : \"sd\";
        }
        (data as any).imageStudioMeta = {
          ...meta,
          workspaceMode: \"auto\",
          path: hasImage ? \"image-to-image\" : \"text-to-image\",
          resolvedAspect: (data as any).aspectRatio,
          resolvedQuality: data.imageQuality,
        };
      }
    }

    let cost = 0;"""
if "Authoritative experience lock" not in text:
    if anchor not in text:
        raise SystemExit("plan/credits anchor missing")
    text = text.replace(anchor, insert, 1)

old_multi = "        const multiUrls = (data.imageUrls || []).filter(Boolean) as string[];"
new_multi = """        // Merge primary + imageUrls + referenceImageUrls (dedupe, preserve order)
        const multiUrls = (() => {
          const seen = new Set<string>();
          const out: string[] = [];
          const push = (u: string | null | undefined) => {
            if (!u || typeof u !== \"string\" || !u.startsWith(\"http\")) return;
            if (seen.has(u)) return;
            seen.add(u);
            out.push(u);
          };
          push(data.imageUrl ?? undefined);
          for (const u of data.imageUrls || []) push(u);
          for (const u of (data as any).referenceImageUrls || []) push(u);
          return out;
        })();"""
if "Merge primary + imageUrls" not in text:
    if old_multi not in text:
        raise SystemExit("multiUrls missing")
    text = text.replace(old_multi, new_multi, 1)

old_prem = """        } else if (data.studioTier === \"pro\") {
          const result = await executePremiumImage({
            falKey,
            prompt: data.prompt,
            imageUrls: data.imageUrl ? [data.imageUrl] : multiUrls,
          } as any);"""
new_prem = """        } else if (data.studioTier === \"pro\") {
          const premUrls =
            multiUrls.length > 0
              ? multiUrls
              : data.imageUrl
                ? [data.imageUrl]
                : [];
          const result = await executePremiumImage({
            falKey,
            prompt: data.prompt,
            imageUrls: premUrls,
            imageUrl: data.imageUrl ?? undefined,
            referenceImageUrls: ((data as any).referenceImageUrls || []).filter(Boolean),
          } as any);"""
if "premUrls" not in text:
    if old_prem not in text:
        raise SystemExit("premium block missing")
    text = text.replace(old_prem, new_prem, 1)

p.write_text(text)
print("OK", len(text))
