import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getCleanUrl(): string {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (!url || url === "undefined" || url === "null") {
    return "https://placeholder-project.supabase.co";
  }
  // Hapus tanda kutip jika user tidak sengaja menyalin tanda kutip
  url = url.replace(/^["'`]|["'`]$/g, "").trim();
  // Hapus trailing slash di akhir URL (mencegah bug double slash yang memicu PGRST125)
  url = url.replace(/\/+$/, "");
  // Hapus /rest/v1 jika tidak sengaja tertulis di env variable
  url = url.replace(/\/rest\/v1\/?$/, "");
  url = url.replace(/\/+$/, "");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

export function getCleanKey(): string {
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!key || key === "undefined" || key === "null") {
    return "placeholder-anon-key";
  }
  key = key.replace(/^["'`]|["'`]$/g, "").trim();
  return key;
}

export function isSupabaseConfigured(): boolean {
  const url = getCleanUrl();
  const key = getCleanKey();
  return Boolean(
    url &&
    !url.includes("placeholder-project") &&
    url.startsWith("http") &&
    key &&
    !key.includes("placeholder-anon-key")
  );
}

export function getSupabaseHost(): string {
  try {
    const url = getCleanUrl();
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return "unknown";
  }
}

// Client singleton yang aman dari crash saat build/prerender
export const supabase: SupabaseClient = createClient(
  getCleanUrl(),
  getCleanKey(),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
