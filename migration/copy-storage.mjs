#!/usr/bin/env node
/**
 * Storage bucket copy script — moves all objects from the OLD (Lovable-managed)
 * Supabase project to your NEW self-owned project.
 *
 * Buckets copied (all private): ticket-attachments, avatars, uploads, outputs
 *
 * Usage:
 *   1. npm i @supabase/supabase-js
 *   2. Set the 4 env vars below (SERVICE ROLE keys — never commit them).
 *   3. node migration/copy-storage.mjs
 *
 * The OLD project's service-role key is NOT available on Lovable Cloud. If you
 * cannot obtain it, re-upload assets to the new project from your app instead.
 */
import { createClient } from "@supabase/supabase-js";

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error("Missing env vars: OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_ROLE_KEY, NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const BUCKETS = [
  { name: "ticket-attachments", public: false },
  { name: "avatars", public: false },
  { name: "uploads", public: false },
  { name: "outputs", public: false },
];

const oldDb = createClient(OLD_URL, OLD_KEY);
const newDb = createClient(NEW_URL, NEW_KEY);

async function listAll(db, bucket, prefix = "") {
  const files = [];
  const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      files.push(...(await listAll(db, bucket, path))); // folder — recurse
    } else {
      files.push(path);
    }
  }
  return files;
}

for (const b of BUCKETS) {
  console.log(`\n=== Bucket: ${b.name} ===`);
  await newDb.storage.createBucket(b.name, { public: b.public }).catch(() => {});
  let paths = [];
  try {
    paths = await listAll(oldDb, b.name);
  } catch (e) {
    console.error(`  Skipping ${b.name}: ${e.message}`);
    continue;
  }
  console.log(`  ${paths.length} object(s) to copy`);
  for (const p of paths) {
    const { data: blob, error: dErr } = await oldDb.storage.from(b.name).download(p);
    if (dErr) { console.error(`  download failed ${p}: ${dErr.message}`); continue; }
    const buf = Buffer.from(await blob.arrayBuffer());
    const { error: uErr } = await newDb.storage.from(b.name).upload(p, buf, {
      contentType: blob.type || "application/octet-stream",
      upsert: true,
    });
    if (uErr) console.error(`  upload failed ${p}: ${uErr.message}`);
    else console.log(`  copied ${p}`);
  }
}
console.log("\nDone. Remember to recreate storage RLS policies on the new project.");
