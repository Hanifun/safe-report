import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(
    url &&
    !url.includes("placeholder-project") &&
    url.startsWith("http") &&
    key &&
    !key.includes("placeholder-anon-key")
  );
}

export function getCleanUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url || url === "undefined" || url === "null" || url === "") {
    return "https://placeholder-project.supabase.co";
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

export function getCleanKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key || key === "undefined" || key === "null" || key === "") {
    return "placeholder-anon-key";
  }
  return key;
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

