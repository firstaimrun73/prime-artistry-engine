#!/usr/bin/env python3
"""Apply production audit fixes: ref limits, AbortController fetches, music 90s poll, SSRF guards."""
from pathlib import Path
import re
import textwrap

ROOT = Path(".")

util = ROOT / "src/lib/safe-external-url.ts"
if not util.exists():
    util.write_text(textwrap.dedent('''\
    /**
     * Shared HTTPS + private-network URL guard (SSRF mitigation for media inputs).
     */
    export function isSafeExternalUrl(url: string): boolean {
      try {
        const u = new URL(url);
        if (u.protocol !== "https:") return false;
        const host = u.hostname.toLowerCase();
        if (
          host === "localhost" ||
          host === "0.0.0.0" ||
          host.endsWith(".local") ||
          host.endsWith(".internal") ||
          host.endsWith(".localhost") ||
          host === "metadata.google.internal"
        ) {
          return false;
        }
        const ipv4 = host.match(/^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/);
        if (ipv4) {
          const parts = ipv4.slice(1).map((x) => Number(x));
          if (parts.some((n) => n > 255)) return false;
          const [a, b] = parts;
          if (a === 10) return false;
          if (a === 127) return false;
          if (a === 0) return false;
          if (a === 169 && b === 254) return false;
          if (a === 172 && b >= 16 && b <= 31) return false;
          if (a === 192 && b === 168) return false;
          if (a === 100 && b >= 64 && b <= 127) return false;
        }
        if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    }

    export function assertSafeMediaUrl(url: string, label = "media"): void {
      if (!isSafeExternalUrl(url)) {
        throw new Error(`Invalid ${label} URL.`);
      }
    }
    '''))
    print("wrote safe-external-url.ts")

test = ROOT / "src/lib/safe-external-url.test.ts"
if not test.exists():
    test.write_text(textwrap.dedent('''\
    import { describe, expect, it } from "vitest";
    import { isSafeExternalUrl } from "./safe-external-url";

    describe("isSafeExternalUrl", () => {
      it("allows public https URLs", () => {
        expect(isSafeExternalUrl("https://cdn.example.com/a.png")).toBe(true);
      });
      it("rejects http", () => {
        expect(isSafeExternalUrl("http://cdn.example.com/a.png")).toBe(false);
      });
      it("rejects localhost and private IPv4", () => {
        expect(isSafeExternalUrl("https://localhost/x")).toBe(false);
        expect(isSafeExternalUrl("https://127.0.0.1/x")).toBe(false);
        expect(isSafeExternalUrl("https://10.0.0.5/x")).toBe(false);
        expect(isSafeExternalUrl("https://192.168.1.1/x")).toBe(false);
        expect(isSafeExternalUrl("https://172.16.0.1/x")).toBe(false);
        expect(isSafeExternalUrl("https://169.254.169.254/latest")).toBe(false);
      });
    });
    '''))
    print("wrote safe-external-url.test.ts")

gpath = ROOT / "src/lib/generate.functions.ts"
g = gpath.read_text(encoding="utf-8")

if 'from "@/lib/safe-external-url"' not in g:
    lines = g.splitlines()
    last = 0
    for i, l in enumerate(lines):
        if l.startswith("import "):
            last = i
    lines.insert(last + 1, 'import { assertSafeMediaUrl } from "@/lib/safe-external-url";')
    g = "\n".join(lines) + "\n"

if "function fetchWithDeadline" not in g:
    g = g.replace(
        "const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));\n",
        """const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch that cannot hang past remainingMs (AbortController). */
async function fetchWithDeadline(
  url: string,
  init: RequestInit | undefined,
  remainingMs: number,
): Promise<Response> {
  const budget = Math.max(1_000, Math.min(remainingMs, 60_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Provider request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
""",
        1,
    )

old_ent = """      assertImageExperienceAccess(plan, data.studioTier, isAdmin);
      const multi = (data.imageUrls || []).filter(Boolean) as string[];
      const expMax = maxImagesForStudioTier(data.studioTier);
      if (multi.length > expMax && !isAdmin) {
        throw new Error(
          `This experience allows up to ${expMax} reference images (received ${multi.length}).`,
        );
      }"""
new_ent = """      assertImageExperienceAccess(plan, data.studioTier, isAdmin);
      // Count unique refs from either client field (UI sends referenceImageUrls; older clients use imageUrls).
      const multi = Array.from(
        new Set(
          ([
            ...((data.referenceImageUrls || []) as string[]),
            ...((data.imageUrls || []) as string[]),
          ]).filter((u): u is string => typeof u === "string" && u.length > 0),
        ),
      );
      const expMax = maxImagesForStudioTier(data.studioTier);
      if (multi.length > expMax && !isAdmin) {
        throw new Error(
          `This experience allows up to ${expMax} reference images (received ${multi.length}).`,
        );
      }"""
if old_ent in g:
    g = g.replace(old_ent, new_ent, 1)
    print("patched entitlement")
elif "data.referenceImageUrls || []) as string[]" in g:
    print("entitlement already patched")
else:
    raise SystemExit("entitlement block not found")

if "const submit = await fetch(`${FAL_QUEUE}${step.model}`" in g:
    g = g.replace(
        """  const submit = await fetch(`${FAL_QUEUE}${step.model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify((step as FalStep & { input?: unknown; body?: unknown }).input ?? (step as FalStep & { body?: unknown }).body),
  });""",
        """  const submit = await fetchWithDeadline(
    `${FAL_QUEUE}${step.model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify((step as FalStep & { input?: unknown; body?: unknown }).input ?? (step as FalStep & { body?: unknown }).body),
    },
    timeoutMs,
  );""",
        1,
    )
    g = g.replace(
        """    const st = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });""",
        """    const st = await fetchWithDeadline(
      statusUrl,
      { headers: { Authorization: `Key ${falKey}` } },
      deadline - Date.now(),
    );""",
        1,
    )
    g = g.replace(
        """  const res = await fetch(responseUrl, {
    headers: { Authorization: `Key ${falKey}` },
  });""",
        """  const res = await fetchWithDeadline(
    responseUrl,
    { headers: { Authorization: `Key ${falKey}` } },
    Math.max(5_000, deadline - Date.now()),
  );""",
        1,
    )
    print("patched runFal fetches")

m_multi = re.search(
    r"const multiUrls = \(\s*\(data\.referenceImageUrls \|\| data\.imageUrls \|\| \[\]\) as string\[\]\s*\)\.filter\(Boolean\);",
    g,
)
if m_multi and "assertSafeMediaUrl(data.imageUrl" not in g:
    g = g.replace(
        m_multi.group(0),
        m_multi.group(0)
        + """
        if (data.imageUrl) assertSafeMediaUrl(data.imageUrl, "image");
        if (data.maskImageUrl) assertSafeMediaUrl(String(data.maskImageUrl), "mask");
        for (const u of multiUrls) assertSafeMediaUrl(u, "reference image");""",
        1,
    )
    print("patched media URL asserts")

if g.count("{") != g.count("}"):
    raise SystemExit(f"generate brace mismatch {g.count('{')} {g.count('}')}")
gpath.write_text(g, encoding="utf-8")
print("generate size", gpath.stat().st_size)

mpath = ROOT / "src/lib/music.functions.ts"
m = mpath.read_text(encoding="utf-8")
if 'from "@/lib/safe-external-url"' not in m:
    lines = m.splitlines()
    last = 0
    for i, l in enumerate(lines):
        if l.startswith("import "):
            last = i
    lines.insert(last + 1, 'import { isSafeExternalUrl } from "@/lib/safe-external-url";')
    m = "\n".join(lines) + "\n"

m2, n = re.subn(
    r"\nfunction isSafeExternalUrl\(url: string\): boolean \{[\s\S]*?\n\}\n",
    "\n",
    m,
    count=1,
)
if n:
    m = m2
    print("removed local isSafeExternalUrl")

if "function fetchWithDeadline" not in m:
    m = m.replace(
        "const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));\n",
        """const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithDeadline(
  url: string,
  init: RequestInit | undefined,
  remainingMs: number,
): Promise<Response> {
  const budget = Math.max(1_000, Math.min(remainingMs, 60_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Music provider request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
""",
        1,
    )

old_q = """async function runFalQueue(
  model: string,
  body: Record<string, unknown>,
  falKey: string,
  label: string,
) {
  const submit = await fetch(`${FAL_QUEUE}${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!submit.ok) {
    const txt = await submit.text().catch(() => "");
    throw new Error(friendlyError(submit.status, txt));
  }
  const submitted = (await submit.json()) as { request_id?: string; status_url?: string; response_url?: string };
  const requestId = submitted.request_id;
  if (!requestId) throw new Error(`${label} did not return a request id.`);
  const statusUrl = submitted.status_url || `${FAL_QUEUE}${model}/requests/${requestId}/status`;
  const responseUrl = submitted.response_url || `${FAL_QUEUE}${model}/requests/${requestId}`;
  const started = Date.now();
  for (;;) {
    if (Date.now() - started > 240_000) throw new Error(`${label} timed out.`);
    await sleep(1500);
    const st = await fetch(statusUrl, { headers: { Authorization: `Key ${falKey}` } });
    if (!st.ok) continue;
    const sj = (await st.json()) as { status?: string };
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "CANCELLED") throw new Error(`${label} failed (${sj.status}).`);
  }
  const res = await fetch(responseUrl, { headers: { Authorization: `Key ${falKey}` } });
  if (!res.ok) throw new Error(friendlyError(res.status, await res.text().catch(() => "")));
  return (await res.json()) as Record<string, unknown>;
}"""

new_q = """async function runFalQueue(
  model: string,
  body: Record<string, unknown>,
  falKey: string,
  label: string,
) {
  // Align with typical Vercel serverless budgets; avoid 240s polls that outlive the platform.
  const timeoutMs = 90_000;
  const deadline = Date.now() + timeoutMs;
  const submit = await fetchWithDeadline(
    `${FAL_QUEUE}${model}`,
    {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
  if (!submit.ok) {
    const txt = await submit.text().catch(() => "");
    throw new Error(friendlyError(submit.status, txt));
  }
  const submitted = (await submit.json()) as { request_id?: string; status_url?: string; response_url?: string };
  const requestId = submitted.request_id;
  if (!requestId) throw new Error(`${label} did not return a request id.`);
  const statusUrl = submitted.status_url || `${FAL_QUEUE}${model}/requests/${requestId}/status`;
  const responseUrl = submitted.response_url || `${FAL_QUEUE}${model}/requests/${requestId}`;
  let lastStatus = "";
  while (Date.now() < deadline) {
    await sleep(1500);
    const st = await fetchWithDeadline(
      statusUrl,
      { headers: { Authorization: `Key ${falKey}` } },
      deadline - Date.now(),
    );
    if (!st.ok) continue;
    const sj = (await st.json()) as { status?: string };
    if (sj.status) lastStatus = sj.status;
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED" || sj.status === "CANCELLED") throw new Error(`${label} failed (${sj.status}).`);
  }
  if (lastStatus !== "COMPLETED") {
    throw new Error(`${label} timed out. Please try again.`);
  }
  const res = await fetchWithDeadline(
    responseUrl,
    { headers: { Authorization: `Key ${falKey}` } },
    Math.max(5_000, deadline - Date.now()),
  );
  if (!res.ok) throw new Error(friendlyError(res.status, await res.text().catch(() => "")));
  return (await res.json()) as Record<string, unknown>;
}"""

if old_q in m:
    m = m.replace(old_q, new_q, 1)
    print("patched music runFalQueue")
elif "timeoutMs = 90_000" in m:
    print("music already 90s")
else:
    raise SystemExit("music runFalQueue not found")

if m.count("{") != m.count("}"):
    raise SystemExit("music brace mismatch")
mpath.write_text(m, encoding="utf-8")
print("music size", mpath.stat().st_size)

fpath = ROOT / "src/lib/studio/image/standard/fal-client.ts"
t = fpath.read_text(encoding="utf-8")
if "function fetchWithDeadline" not in t:
    t = t.replace(
        "const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));\n",
        """const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithDeadline(
  url: string,
  init: RequestInit | undefined,
  remainingMs: number,
): Promise<Response> {
  const budget = Math.max(1_000, Math.min(remainingMs, 60_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI service request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
""",
        1,
    )
    t = t.replace(
        '  const submit = await fetch(`${FAL_QUEUE}${step.model}`, {\n    method: "POST",\n    headers,\n    body: JSON.stringify(step.body),\n  });',
        '  const submit = await fetchWithDeadline(`${FAL_QUEUE}${step.model}`, {\n    method: "POST",\n    headers,\n    body: JSON.stringify(step.body),\n  }, timeoutMs);',
        1,
    )
    t = t.replace(
        "    const st = await fetch(status_url, { headers });",
        "    const st = await fetchWithDeadline(status_url, { headers }, deadline - Date.now());",
        1,
    )
    t = t.replace(
        "  const res = await fetch(response_url, { headers });",
        "  const res = await fetchWithDeadline(response_url, { headers }, Math.max(5_000, deadline - Date.now()));",
        1,
    )
    t = t.replace(
        """      const body = await fetch(response_url, { headers })
        .then((r) => r.text())
        .catch(() => "");""",
        """      const body = await fetchWithDeadline(response_url, { headers }, Math.max(3_000, deadline - Date.now()))
        .then((r) => r.text())
        .catch(() => "");""",
        1,
    )
    print("patched fal-client")
if t.count("{") != t.count("}"):
    raise SystemExit("fal-client braces")
fpath.write_text(t, encoding="utf-8")
print("all audit patches applied")
