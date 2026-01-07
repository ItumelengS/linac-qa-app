import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

// Create a Supabase client for server-side database operations
// Note: We use the service role key to bypass RLS when needed
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getUserProfile() {
  const { userId } = await auth();

  if (!userId) return null;

  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organizations(*)")
    .eq("clerk_id", userId)
    .single();

  return profile;
}

export async function getOrCreateProfile() {
  const { userId } = await auth();

  if (!userId) return null;

  const supabase = createClient();

  // Try to get existing profile
  let { data: profile } = await supabase
    .from("profiles")
    .select("*, organizations(*)")
    .eq("clerk_id", userId)
    .single();

  // If no profile exists, we'll create one later when organization is set up
  return profile;
}
