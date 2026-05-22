import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const COOKIE = "td_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE_SEC * 1000);

  await supabaseAdmin()
    .from("sessions")
    .insert({ token, user_id: userId, expires_at: expiresAt.toISOString() });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await supabaseAdmin().from("sessions").delete().eq("token", token);
    jar.delete(COOKIE);
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const { data } = await supabaseAdmin()
    .from("sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!data) return null;

  if (new Date(data.expires_at as string) < new Date()) {
    await supabaseAdmin().from("sessions").delete().eq("token", token);
    return null;
  }
  return data.user_id as string;
}
