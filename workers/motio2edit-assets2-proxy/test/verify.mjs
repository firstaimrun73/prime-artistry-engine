#!/usr/bin/env node
// Verification for motio2edit-assets2-proxy. Node 18+. No dependencies, no secrets in files.
//
// Required env:
//   BASE   e.g. https://motio2edit-assets2-proxy.<subdomain>.workers.dev   (later: https://assets2.motio2edit.com)
//   KEY    a FRESH test image key that exists ONLY in the Account 2 bucket, e.g. _healthcheck/t1-<timestamp>.png
// Optional env:
//   VIDEO_KEY        small .mp4 in Account 2 (for seek tests)
//   KEY2             another fresh object; used to test "HEAD first, then GET" cache integrity
//   ACCOUNT1_BASE    default https://assets.motio2edit.com  (the same KEY must 404 there -> proves origin is not Account 1)
//   EXPECTED_BUCKET  default motio2edit-assets-2
//   CORS_TEST_ORIGIN default https://motio2edit.com
//   CF_ACCOUNT2_ID + CF_ACCOUNT2_ANALYTICS_TOKEN
//                    (Account 2 token with "Account Analytics: Read") -> checks Account 2's R2 GetObject counters
//
// Usage: BASE=... KEY=... node test/verify.mjs

import https from "node:https";
import crypto from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

const env = process.env;
const BASE = (env.BASE || "").replace(/\/+$/, "");
const KEY = env.KEY || "";
const VIDEO_KEY = env.VIDEO_KEY || "";
const KEY2 = env.KEY2 || "";
const ACCOUNT1_BASE = (env.ACCOUNT1_BASE ?? "https://assets.motio2edit.com").replace(/\/+$/, "");
const EXPECTED_BUCKET = env.EXPECTED_BUCKET || "motio2edit-assets-2";
const CORS_ORIGIN = env.CORS_TEST_ORIGIN || "https://motio2edit.com";
const T0 = new Date();

if (!BASE || !KEY) {
  console.error("Usage: BASE=https://<host> KEY=<fresh-object-key> [VIDEO_KEY=...] [KEY2=...] node test/verify.mjs");
  process.exit(2);
}

const TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm" };
let failures = 0;
let warnings = 0;

const enc = (k) => k.split("/").map(encodeURIComponent).join("/");
const urlFor = (k) => `${BASE}/${enc(k)}`;
const ext = (k) => (/\.([A-Za-z0-9]+)$/.exec(k) || [])[1]?.toLowerCase() || "";
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

function check(name, cond, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
}
function warn(name, detail) {
  warnings++;
  console.log(`WARN  ${name}  -- ${detail}`);
}
function info(name, detail) {
  console.log(`INFO  ${name}  -- ${detail}`);
}

async function request(url, { method = "GET", headers = {} } = {}) {
  const res = await fetch(url, { method, headers, redirect: "manual" });
  const body = method === "HEAD" ? Buffer.alloc(0) : Buffer.from(await res.arrayBuffer());
  return { res, body, h: (n) => res.headers.get(n), status: res.status, cache: res.headers.get("cf-cache-status") };
}

function rawStatus(path) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE);
    const req = https.request({ hostname: u.hostname, port: u.port || 443, path, method: "GET" }, (r) => {
      r.resume();
      resolve(r.statusCode);
    });
    req.on("error", reject);
    req.end();
  });
}

async function expectHit(url, headers = {}, tries = 6) {
  let last;
  for (let i = 0; i < tries; i++) {
    last = await request(url, { headers });
    if (last.cache === "HIT") return last;
    await sleep(700);
  }
  return last;
}

async function rangeCheck(label, key, rangeHeader, start, end, total, full) {
  const r = await request(urlFor(key), { headers: { Range: rangeHeader } });
  check(`${label}: status 206`, r.status === 206, `got ${r.status}`);
  check(`${label}: Content-Range`, r.h("content-range") === `bytes ${start}-${end}/${total}`, r.h("content-range") || "missing");
  check(`${label}: body length`, r.body.length === end - start + 1, `${r.body.length} bytes`);
  if (full) check(`${label}: bytes match the full object`, r.body.equals(full.subarray(start, end + 1)));
  const by = r.h("x-range-handled") === "worker" ? "Worker (uncached)" : "Cloudflare cache layer";
  info(`${label}: handled by`, `${by}, cf-cache-status=${r.cache}`);
  return r;
}

console.log(`\nTarget: ${BASE}\nKey:    ${KEY}\nStart:  ${T0.toISOString()}\n`);

console.log("== 1. First GET (expect origin / MISS)");
const first = await request(urlFor(KEY));
check("GET status 200", first.status === 200, `got ${first.status}`);
check("body non-empty", first.body.length > 0, `${first.body.length} bytes`);
check("X-Origin header says Account 2", first.h("x-origin") === "r2-account2", first.h("x-origin") || "missing");
check(`X-Origin-Bucket is ${EXPECTED_BUCKET}`, first.h("x-origin-bucket") === EXPECTED_BUCKET, first.h("x-origin-bucket") || "missing");
check("Accept-Ranges bytes", (first.h("accept-ranges") || "").includes("bytes"), first.h("accept-ranges") || "missing");
check("Cache-Control long-lived", /max-age=\d{5,}/.test(first.h("cache-control") || ""), first.h("cache-control") || "missing");
if (first.cache) {
  check("first request is a cache MISS/EXPIRED (origin read happened)", ["MISS", "EXPIRED", "DYNAMIC", "REVALIDATED"].includes(first.cache), `cf-cache-status=${first.cache}`);
}
if (!first.cache) warn("no cf-cache-status header", "Workers Caching may not be active on this hostname. Check wrangler [cache] enabled = true and Wrangler >= 4.69.0.");

console.log("\n== 2. Second GET (expect HIT)");
const second = await expectHit(urlFor(KEY));
check("second GET is cache HIT", second.cache === "HIT", `cf-cache-status=${second.cache}`);
check("HIT body matches first", second.body.equals(first.body));

console.log("\n== 3. Account 1 isolation");
const a1 = await request(`${ACCOUNT1_BASE}/${enc(KEY)}`);
check("same KEY on assets.motio2edit.com is 404", a1.status === 404, `got ${a1.status}`);

console.log("\n== 4. HEAD + Range");
const head = await request(urlFor(KEY), { method: "HEAD" });
check("HEAD 200", head.status === 200, `got ${head.status}`);
const cl = Number(head.h("content-length") || first.h("content-length") || 0);
check("Content-Length present", cl > 0, String(cl));
if (cl > 100) {
  const rep1 = await rangeCheck("range first 100", KEY, "bytes=0-99", 0, 99, cl, first.body);
  const rep2 = await request(urlFor(KEY), { headers: { Range: "bytes=0-99" } });
  if (rep2.h("x-range-handled") === "worker") {
    warn("repeat range served by Worker", "cache may not store ranges; each seek costs a Class B read");
  } else {
    check("repeat range request is a cache HIT", rep2.cache === "HIT", `cf-cache-status=${rep2.cache} (first was ${rep1.cache})`);
  }
}

console.log("\n== 5. Video seek (optional)");
if (VIDEO_KEY) {
  const probe = await request(urlFor(VIDEO_KEY), { headers: { Range: "bytes=0-1023" } });
  check("video range status 206", probe.status === 206, `got ${probe.status}`);
  const m = /\/(\d+)$/.exec(probe.h("content-range") || "");
  const vtotal = m ? Number(m[1]) : 0;
  check("video: Content-Range includes total size", vtotal > 2048, probe.h("content-range") || "missing");
  check("video: Content-Type video/*", (probe.h("content-type") || "").startsWith("video/"), probe.h("content-type") || "missing");
  check("video: Accept-Ranges bytes", (probe.h("accept-ranges") || "").includes("bytes"), probe.h("accept-ranges") || "missing");
  if (vtotal > 2048) {
    const mid = Math.floor(vtotal / 2);
    await rangeCheck("video: seek to middle", VIDEO_KEY, `bytes=${mid}-${mid + 1023}`, mid, mid + 1023, vtotal);
    await rangeCheck("video: seek to tail (moov atom location)", VIDEO_KEY, "bytes=-1024", vtotal - 1024, vtotal - 1, vtotal);
    const rep = await request(urlFor(VIDEO_KEY), { headers: { Range: `bytes=${mid}-${mid + 1023}` } });
    if (rep.h("x-range-handled") === "worker") warn("video seeks reach the Worker", "uncached reads on every seek");
    else check("video: repeated seek is a cache HIT", rep.cache === "HIT", `cf-cache-status=${rep.cache}`);
  }
} else {
  info("video tests skipped", "set VIDEO_KEY to a small .mp4 stored in Account 2");
}

console.log("\n== 6. HEAD-first integrity");
if (KEY2) {
  const h2 = await request(urlFor(KEY2), { method: "HEAD" });
  const g2 = await request(urlFor(KEY2));
  check("KEY2 HEAD 200", h2.status === 200, `got ${h2.status}`);
  check("KEY2 GET after HEAD returns full body", g2.status === 200 && g2.body.length === Number(h2.h("content-length")), `${g2.body.length} bytes`);
} else {
  info("skipped", "set KEY2 to another fresh object to test HEAD-first cache integrity");
}

console.log("\n== 7. Missing objects and abuse cases");
const missingKey = `__missing__/${crypto.randomUUID()}.png`;
const miss1 = await request(urlFor(missingKey));
check("missing object -> 404", miss1.status === 404, `got ${miss1.status}`);
check("404 has short Cache-Control", /max-age=\d{1,4}\b/.test(miss1.h("cache-control") || ""), miss1.h("cache-control") || "missing");
const miss2 = await expectHit(urlFor(missingKey), {}, 4);
if (miss2.cache === "HIT") info("404 negative caching", "second request was a HIT (no repeated R2 read)");
else warn("404 not served from cache", `cf-cache-status=${miss2.cache}; repeated misses would each cost a read`);
check("root path / -> 404 (no listing)", (await request(`${BASE}/`)).status === 404);
check("POST -> 405", (await request(urlFor(KEY), { method: "POST" })).status === 405);
check("query param other than v -> 400", (await request(`${urlFor(KEY)}?foo=1`)).status === 400);
const trav = await rawStatus(`/%2e%2e/${enc(KEY)}`);
check("encoded path traversal rejected", trav === 400 || trav === 404, `got ${trav}`);

console.log("\n== 8. CORS");
const cors = await request(urlFor(KEY), { headers: { Origin: CORS_ORIGIN } });
check("Access-Control-Allow-Origin present", !!(cors.h("access-control-allow-origin")), cors.h("access-control-allow-origin") || "missing");

console.log("\n== 9. Structural guarantees (documented)");
info("structural guarantee", "wrangler config has no [[r2_buckets]] binding, so the Worker has no path to Account 1 buckets");
info("structural guarantee", "Vercel R2_SECOND_* env vars are NOT Worker secrets; secrets must be set with wrangler secret put");

console.log("\n== 10. Optional Account 2 Class B analytics");
if (env.CF_ACCOUNT2_ID && env.CF_ACCOUNT2_ANALYTICS_TOKEN) {
  try {
    const query = `query ($accountTag: string!, $startDate: Time!, $endDate: Time!, $bucketName: string!) {
      viewer {
        accounts(filter: {accountTag: $accountTag}) {
          r2OperationsAdaptiveGroups(
            filter: { datetime_geq: $startDate, datetime_leq: $endDate, bucketName: $bucketName, actionType: "GetObject" }
            limit: 1
            orderBy: [datetime_DESC]
          ) { count sum { requests } }
        }
      }
    }`;
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CF_ACCOUNT2_ANALYTICS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { accountTag: env.CF_ACCOUNT2_ID, startDate: T0.toISOString(), endDate: new Date(Date.now() + 5 * 60000).toISOString(), bucketName: EXPECTED_BUCKET } }),
    });
    const json = await res.json();
    info("analytics response status", String(res.status));
    if (json.errors) warn("analytics GraphQL errors", JSON.stringify(json.errors).slice(0, 300));
    else info("analytics payload", JSON.stringify(json.data).slice(0, 400));
  } catch (e) {
    warn("analytics request failed", e && e.message ? e.message : String(e));
  }
} else {
  info("skipped", "set CF_ACCOUNT2_ID and CF_ACCOUNT2_ANALYTICS_TOKEN, or check Account 2 dashboard > R2 > motio2edit-assets-2 > Metrics");
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}  (${warnings} warning(s))`);
process.exit(failures === 0 ? 0 : 1);
