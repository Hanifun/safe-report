import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getCleanUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url || url === "undefined" || url === "null" || url === "") {
    return "https://placeholder-project.supabase.co";
  }
  // Pastikan memiliki protokol http/https
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

function getCleanKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key || key === "undefined" || key === "null" || key === "") {
    return "placeholder-anon-key";
  }
  return key;
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
