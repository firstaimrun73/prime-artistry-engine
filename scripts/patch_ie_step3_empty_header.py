#!/usr/bin/env python3
from pathlib import Path
path = Path("src/components/editor/image/ImageEditor.tsx")
text = path.read_text()
if "What will you create today" in text and "Balance" in text:
    print("step3 skip"); raise SystemExit(0)
old_empty = """                  <div className=\"flex max-w-sm flex-col items-center px-3 py-2 text-center\">
                    <ImageIcon className=\"mb-1.5 h-7 w-7 text-[#FF5A1F]/30\" strokeWidth={1.5} />
                    <p className=\"text-xs font-medium text-muted-foreground sm:text-sm\">
                      Describe or upload to begin
                    </p>
                  </div>"""
new_empty = """                  <div className=\"flex max-w-sm flex-col items-center px-3 py-2 text-center\">
                    <p className=\"text-sm font-semibold text-foreground sm:text-base\">
                      What will you create today? ✨
                    </p>
                    <p
                      key={studioTagline}
                      className=\"mt-1.5 max-w-xs text-[11px] leading-relaxed text-muted-foreground animate-in fade-in duration-500 sm:text-xs\"
                    >
                      {studioTagline}
                    </p>
                  </div>"""
if old_empty not in text:
    raise SystemExit("empty not found")
text = text.replace(old_empty, new_empty, 1)
old_header = """            {!isAdmin && (
              <span className=\"shrink-0 rounded-full border border-border/50 bg-card/50 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground backdrop-blur-sm\">
                {profile.credits} credits
              </span>
            )}
          </header>"""
new_header = """            <Link
              to=\"/profile\"
              className=\"flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-1 py-0.5 transition hover:bg-card/50\"
              title=\"Profile\"
            >
              <Avatar className=\"h-8 w-8 border border-border/60\">
                <AvatarImage src={avatarSrc} alt=\"\" />
                <AvatarFallback className=\"text-[10px]\">
                  {(profile?.display_name || profile?.email || \"U\").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isAdmin && (
                <span className=\"flex flex-col items-center leading-none\">
                  <span className=\"text-[8px] font-medium uppercase tracking-wide text-muted-foreground\">
                    Balance
                  </span>
                  <span className=\"text-[10px] font-semibold tabular-nums text-foreground\">
                    {(profile?.credits ?? 0).toLocaleString()}
                  </span>
                </span>
              )}
            </Link>
          </header>"""
if old_header not in text:
    raise SystemExit("header not found")
text = text.replace(old_header, new_header, 1)
assert text.count("{") == text.count("}")
path.write_text(text)
print("step3 OK", len(text))
