#!/usr/bin/env python3
from pathlib import Path
path = Path("src/components/editor/image/ImageEditor.tsx")
text = path.read_text()
if "VoiceInputButton" in text and "pickStudioTagline" in text:
    print("step1 skip"); raise SystemExit(0)
old = 'import { RotateCcw, Image as ImageIcon, ChevronDown, Mic, Sparkles, Upload as UploadIcon } from "lucide-react";'
new = 'import { RotateCcw, Image as ImageIcon, ChevronDown, Sparkles, Upload as UploadIcon, Lock, Wand2, Settings2 } from "lucide-react";\nimport { VoiceInputButton } from "@/components/VoiceInputButton";\nimport { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";\nimport { resolveAvatarSrc } from "@/lib/avatar-presets";\nimport { pickStudioTagline } from "@/lib/studio/studio-taglines";'
if old not in text:
    raise SystemExit("import not found")
text = text.replace(old, new, 1)
text = text.replace(
    'import { visibleImageExperiences } from "@/lib/studio/image/image-experience-access";',
    'import { visibleImageExperiences, canAccessImageExperience } from "@/lib/studio/image/image-experience-access";',
    1,
)
text = text.replace(
    'const [workspaceMode, setWorkspaceMode] = useState<"auto" | "composer">("auto");',
    'const [workspaceMode, setWorkspaceMode] = useState<"auto" | "composer">("auto");\n  const [studioTagline] = useState(() =>\n    typeof window !== "undefined" ? pickStudioTagline() : "What will you create today?",\n  );',
    1,
)
text = text.replace(
    "const isAdmin = isAdminEmail(profile?.email);",
    "const isAdmin = isAdminEmail(profile?.email);\n  const avatarSrc = resolveAvatarSrc(profile?.avatar_url, profile?.avatar_signed_url, {\n    nameOrEmail: profile?.display_name || profile?.email,\n    userId: profile?.id,\n  });",
    1,
)
assert text.count("{") == text.count("}")
path.write_text(text)
print("step1 OK", len(text))
