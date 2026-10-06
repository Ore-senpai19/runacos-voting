import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "candidate-photos";

let cachedClient: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upload candidate photos — see .env.example."
    );
  }
  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export function validateCandidatePhoto(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Photo must be JPEG, PNG, or WebP";
  if (file.size > MAX_BYTES) return "Photo must be under 5MB";
  return null;
}

/** Uploads to Supabase Storage and returns the public URL to store as photoUrl. */
export async function uploadCandidatePhoto(file: File): Promise<string> {
  const client = getClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage.from(BUCKET).upload(filename, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = client.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

/** Best-effort cleanup of an old photo. Never throws — a failed delete shouldn't block a DB update. */
export async function deleteCandidatePhoto(photoUrl: string) {
  try {
    const marker = `/${BUCKET}/`;
    const idx = photoUrl.indexOf(marker);
    if (idx === -1) return; // not one of our bucket URLs (e.g. a leftover local-disk path) — nothing to clean up
    const filename = photoUrl.slice(idx + marker.length).split("?")[0];
    if (!filename) return;
    const client = getClient();
    await client.storage.from(BUCKET).remove([filename]);
  } catch {
    // ignore — cleanup failures shouldn't surface to the admin
  }
}
