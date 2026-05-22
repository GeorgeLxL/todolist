"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  hashPassword,
  verifyPassword,
  RESET_PASSWORD,
} from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { FormState } from "@/lib/form-state";
import { THEMES, type Theme } from "@/types/user";

export async function registerAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const username = String(fd.get("username") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (username.length < 3)
    return { error: "Username must be at least 3 characters." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existing) return { error: "That username is already taken." };

  const password_hash = await hashPassword(password);
  const { data: created, error } = await db
    .from("users")
    .insert({ username, password_hash })
    .select("id")
    .single();

  if (error || !created) return { error: "Could not create the account." };

  await db
    .from("lists")
    .insert({ name: "My Tasks", type: "personal", user_id: created.id });

  await createSession(created.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const username = String(fd.get("username") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!username || !password)
    return { error: "Enter your username and password." };

  const { data: user } = await supabaseAdmin()
    .from("users")
    .select("id, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (!user) return { error: "Invalid username or password." };

  const valid = await verifyPassword(password, user.password_hash as string);
  if (!valid) return { error: "Invalid username or password." };

  await createSession(user.id as string);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/auth/login");
}

export async function resetPasswordAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const username = String(fd.get("username") ?? "").trim();
  if (!username) return { error: "Enter your username." };

  const db = supabaseAdmin();
  const { data: user } = await db
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!user) return { error: "No account found with that username." };

  const password_hash = await hashPassword(RESET_PASSWORD);
  await db
    .from("users")
    .update({ password_hash, force_password_change: true })
    .eq("id", user.id);

  return {
    ok: true,
    message: `Password reset to "${RESET_PASSWORD}". You will be asked to change it after signing in.`,
  };
}

export async function changePasswordAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (next.length < 8)
    return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("users")
    .select("password_hash")
    .eq("id", user.id)
    .single();

  if (!user.force_password_change) {
    const ok = await verifyPassword(current, row?.password_hash as string);
    if (!ok) return { error: "Current password is incorrect." };
  }

  const password_hash = await hashPassword(next);
  await db
    .from("users")
    .update({ password_hash, force_password_change: false })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  return { ok: true, message: "Password updated." };
}

export async function updateProfileAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You are not signed in." };

  const username = String(fd.get("username") ?? "").trim();
  const birthday = String(fd.get("birthday") ?? "") || null;
  const timezone = String(fd.get("timezone") ?? "") || user.timezone;

  if (username.length < 3)
    return { error: "Username must be at least 3 characters." };

  const db = supabaseAdmin();
  if (username !== user.username) {
    const { data: dup } = await db
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (dup) return { error: "That username is already taken." };
  }

  await db
    .from("users")
    .update({ username, birthday, timezone })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function setThemeAction(theme: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  if (!THEMES.includes(theme as Theme)) return;
  await supabaseAdmin().from("users").update({ theme }).eq("id", user.id);
  revalidatePath("/", "layout");
}
