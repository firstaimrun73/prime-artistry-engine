// motio2edit-assets2-proxy
//
// Public, read-only proxy for the Account 2 R2 bucket (motio2edit-assets-2).
// Runs in Cloudflare Account 1 (the account that owns the motio2edit.com zone)
// but reads objects from Account 2 over R2's S3-compatible endpoint, signed with
// Account 2 credentials stored as Worker secrets. There is deliberately NO R2
// binding in wrangler.toml, so this Worker cannot read any Account 1 bucket.
//
// Caching: Workers Caching ([cache] enabled = true) sits IN FRONT of this code.
// On a cache hit this function never runs and no R2 read happens. On a miss we
// return a FULL 200 with Cache-Control; Cloudflare stores it and slices Range
// requests (206) from the cached copy. If a Range header ever does reach this
// code (caching bypassed / not applied), we forward it upstream and return a
// correct 206 so video seeking still works (uncached, so every seek is a read).

import { AwsClient } from "aws4fetch";

const EXT_TYPES = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", avif: "image/avif", svg: "image/svg+xml", ico: "image/x-icon",
  mp4: "video/mp4", m4v: "video/x-m4v", webm: "video/webm", mov: "video/quicktime",
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg",
  json: "application/json", txt: "text/plain; charset=utf-8", vtt: "text/vtt",
  woff2: "font/woff2", woff: "font/woff", pdf: "application/pdf",
};

const GENERIC_TYPES = new Set(["application/octet-stream", "binary/octet-stream", ""]);
const MAX_KEY_LENGTH = 1024;

let cachedClient = null;
let cachedClientId = "";

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (err) {
      console.error("proxy_error", err && err.message ? err.message : String(err));
      return reply(env, 502, "Bad gateway", { "Cache-Control": "no-store" });
    }
  },
};

async function handle(request, env) {
  const method = request.method;

  if (method === "OPTIONS") {
    return reply(env, 204, null, {
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, If-None-Match, If-Modified-Since, If-Range",
      "Access-Control-Max-Age": "86400",
      "Cache-Control": "public, max-age=86400",
    });
  }
  if (method !== "GET" && method !== "HEAD") {
    return reply(env, 405, "Method not allowed", { Allow: "GET, HEAD, OPTIONS", "Cache-Control": "no-store" });
  }

  const conf = readConfig(env);
  if (!conf) {
    console.error("proxy_not_configured: missing secret or variable");
    return reply(env, 503, "Service not configured", { "Cache-Control": "no-store" });
  }

  const url = new URL(request.url);

  const allowedParams = csv(env.ALLOWED_QUERY_PARAMS);
  for (const name of url.searchParams.keys()) {
    if (!allowedParams.includes(name)) {
      return reply(env, 400, "Query parameter not allowed", { "Cache-Control": "public, max-age=60" });
    }
  }

  const key = parseKey(url.pathname);
  if (key === null) {
    return reply(env, 400, "Bad request", { "Cache-Control": "public, max-age=60" });
  }
  if (key === "") {
    return notFound(env);
  }
  const prefixes = csv(env.ALLOWED_PREFIXES);
  if (prefixes.length && !prefixes.some((p) => key.startsWith(p))) {
    return notFound(env);
  }

  const upstreamUrl = `https://${conf.host}/${conf.bucket}/${encodeKey(key)}`;
  const upstreamHeaders = {};
  const range = validRange(request.headers.get("Range"));
  if (range) upstreamHeaders.Range = range;

  const upstream = await getClient(conf).fetch(upstreamUrl, {
    method: method === "HEAD" ? "HEAD" : "GET",
    headers: upstreamHeaders,
  });

  if (upstream.status === 404) {
    return notFound(env);
  }
  if (upstream.status === 416) {
    return reply(env, 416, null, {
      "Content-Range": upstream.headers.get("content-range") || "bytes */*",
      "Cache-Control": "no-store",
    });
  }
  if (upstream.status !== 200 && upstream.status !== 206) {
    console.error("upstream_status", upstream.status);
    return reply(env, 502, "Bad gateway", { "Cache-Control": "no-store" });
  }

  const headers = new Headers();
  const encoded = upstream.headers.get("content-encoding");
  for (const h of ["content-type", "etag", "last-modified", "content-language", "content-range"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  if (!encoded) {
    const len = upstream.headers.get("content-length");
    if (len) headers.set("content-length", len);
  }

  const type = (headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (GENERIC_TYPES.has(type)) {
    const guessed = EXT_TYPES[extension(key)];
    if (guessed) headers.set("content-type", guessed);
  }
  if (extension(key) === "svg") {
    headers.set("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }

  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", env.CACHE_CONTROL_OK || "public, max-age=31536000, immutable");
  headers.set("cache-tag", "assets2");
  headers.set("x-served-by", "motio2edit-assets2-proxy");
  headers.set("x-origin", "r2-account2");
  headers.set("x-origin-bucket", conf.bucket);
  if (upstream.status === 206) headers.set("x-range-handled", "worker");
  addCors(env, headers);

  return new Response(method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

function readConfig(env) {
  const accountId = env.R2_SECOND_ACCOUNT_ID;
  const accessKeyId = env.R2_SECOND_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECOND_SECRET_ACCESS_KEY;
  const bucket = env.R2_SECOND_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  const jurisdiction = (env.R2_SECOND_JURISDICTION || "").trim();
  const host = `${accountId.trim()}.${jurisdiction ? jurisdiction + "." : ""}r2.cloudflarestorage.com`;
  return { host, bucket: bucket.trim(), accessKeyId: accessKeyId.trim(), secretAccessKey: secretAccessKey.trim() };
}

function getClient(conf) {
  const id = conf.accessKeyId + "@" + conf.host;
  if (!cachedClient || cachedClientId !== id) {
    cachedClient = new AwsClient({
      accessKeyId: conf.accessKeyId,
      secretAccessKey: conf.secretAccessKey,
      service: "s3",
      region: "auto",
    });
    cachedClientId = id;
  }
  return cachedClient;
}

function parseKey(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
  if (decoded === "") return "";
  if (decoded.length > MAX_KEY_LENGTH) return null;
  if (decoded.endsWith("/")) return null;
  if (/[\0\\]/.test(decoded)) return null;
  const segments = decoded.split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) return null;
  return decoded;
}

function encodeKey(key) {
  return key
    .split("/")
    .map((s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()))
    .join("/");
}

function extension(key) {
  const m = /\.([A-Za-z0-9]+)$/.exec(key);
  return m ? m[1].toLowerCase() : "";
}

function validRange(value) {
  if (!value) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  return value.trim();
}

function csv(value) {
  return (value || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function addCors(env, headers) {
  headers.set("access-control-allow-origin", env.CORS_ORIGIN || "*");
  headers.set("access-control-expose-headers", "Content-Length, Content-Range, Accept-Ranges, ETag, Content-Type");
  headers.set("timing-allow-origin", "*");
  headers.set("x-content-type-options", "nosniff");
}

function notFound(env) {
  const ttl = parseInt(env.NOT_FOUND_TTL || "60", 10);
  return reply(env, 404, "Not found", { "Cache-Control": `public, max-age=${Number.isFinite(ttl) ? ttl : 60}` });
}

function reply(env, status, body, extra = {}) {
  const headers = new Headers(extra);
  if (body !== null && !headers.has("content-type")) headers.set("content-type", "text/plain; charset=utf-8");
  addCors(env, headers);
  return new Response(body, { status, headers });
}
