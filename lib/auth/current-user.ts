import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSessionUserId } from "./session";
import type { User } from "@/types/user";

const USER_COLS =
  "id,username,birthday,theme,timezone,force_password_change,created_at,updated_at";

/** Returns the logged-in user, or null. Deduped per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const userId = await getSessionUserId();
    if (!userId) return null;

    const { data } = await supabaseAdmin()
      .from("users")
      .select(USER_COLS)
      .eq("id", userId)
      .maybeSingle();

    return (data as User | null) ?? null;
  } catch {
    // Supabase env not configured yet - treat as logged out.
    return null;
  }
});

/** Returns the logged-in user or redirects to the login page. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}
