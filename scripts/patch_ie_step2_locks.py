#!/usr/bin/env python3
from pathlib import Path
path = Path("src/components/editor/image/ImageEditor.tsx")
text = path.read_text()
if "const locked = !canAccessImageExperience" in text:
    print("step2 skip"); raise SystemExit(0)
old = """                                onClick={() => {
                                  setStudioTier(tier);
                                  const preferred = studioTierToImageQuality(tier);
                                  if (!qualityTouchedRef.current) setImageQuality(preferred);
                                  setTierMenuOpen(false);
                                }}
                              >
                                {studioExperienceLabel(tier)}
                              </button>"""
new = """                                onClick={() => {
                                  const locked = !canAccessImageExperience(profile?.plan ?? \"free\", tier, isAdmin);
                                  if (locked) {
                                    toast.error(
                                      tier === \"premium\"
                                        ? \"Ultra AI requires Studio or Master Studio. Upgrade to unlock.\"
                                        : tier === \"pro\"
                                          ? \"Premium requires Pro or higher. Upgrade to unlock.\"
                                          : \"This experience is not available on your plan.\",
                                      { action: { label: \"Upgrade\", onClick: () => { window.location.href = \"/pricing\"; } } },
                                    );
                                    setTierMenuOpen(false);
                                    return;
                                  }
                                  setStudioTier(tier);
                                  const preferred = studioTierToImageQuality(tier);
                                  if (!qualityTouchedRef.current) setImageQuality(preferred);
                                  setTierMenuOpen(false);
                                }}
                              >
                                <span className=\"flex w-full items-center justify-between gap-2\">
                                  <span className=\"flex items-center gap-1.5\">
                                    {tier === \"standard\" ? \"⚡\" : tier === \"pro\" ? \"👑\" : \"✨\"}{\" \"}
                                    {studioExperienceLabel(tier)}
                                  </span>
                                  {!canAccessImageExperience(profile?.plan ?? \"free\", tier, isAdmin) && (
                                    <span className=\"inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground\">
                                      <Lock className=\"h-3 w-3 text-[#FF5A1F]/80\" />
                                      {tier === \"pro\" ? \"Pro+\" : \"Studio+\"}
                                    </span>
                                  )}
                                </span>
                              </button>"""
if old not in text:
    raise SystemExit("click not found")
text = text.replace(old, new, 1)
old_cls = '''                                className={cn(
                                  "flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-[#FF5A1F]/10",
                                  studioTier === tier && "bg-[#FF5A1F]/10 text-[#FF5A1F]",
                                )}'''
new_cls = '''                                className={cn(
                                  "flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-[#FF5A1F]/10",
                                  studioTier === tier && "bg-[#FF5A1F]/10 text-[#FF5A1F]",
                                  !canAccessImageExperience(profile?.plan ?? "free", tier, isAdmin) && "opacity-75",
                                )}'''
text = text.replace(old_cls, new_cls, 1)
assert text.count("{") == text.count("}")
path.write_text(text)
print("step2 OK", len(text))
