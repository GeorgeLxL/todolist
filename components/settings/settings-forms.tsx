"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  updateProfileAction,
  changePasswordAction,
  setThemeAction,
} from "@/server/actions/auth";
import { emptyForm } from "@/lib/form-state";
import { TIMEZONES } from "@/lib/date-time";
import { THEMES, type Theme, type User } from "@/types/user";

const THEME_COLOR: Record<Theme, string> = {
  light: "#4f46e5",
  dark: "#6366f1",
  green: "#2f8f4e",
  pink: "#db2777",
  yellow: "#ca8a04",
  purple: "#9333ea",
  blue: "#2563eb",
  red: "#dc2626",
  brown: "#8b5e34",
};

export function SettingsForms({ user }: { user: User }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProfileCard user={user} />
      <ThemeCard current={user.theme} />
      <PasswordCard />
    </div>
  );
}

function ProfileCard({ user }: { user: User }) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    emptyForm,
  );
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">Profile</h2>
      <form action={action} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Username
          </label>
          <input
            name="username"
            className="input"
            defaultValue={user.username}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Birthday
          </label>
          <input
            name="birthday"
            type="date"
            className="input"
            defaultValue={user.birthday ?? ""}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Timezone
          </label>
          <select
            name="timezone"
            className="input"
            defaultValue={user.timezone}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-success">{state.message}</p>}
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}

function ThemeCard({ current }: { current: Theme }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function pick(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    start(async () => {
      await setThemeAction(theme);
      router.refresh();
    });
  }

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">Theme</h2>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((theme) => (
          <button
            key={theme}
            onClick={() => pick(theme)}
            disabled={pending}
            className={clsx(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize transition-colors",
              theme === current
                ? "border-primary bg-primary/10"
                : "hover:bg-surface-2",
            )}
          >
            <span
              className="h-4 w-4 rounded-full border"
              style={{ background: THEME_COLOR[theme] }}
            />
            {theme}
          </button>
        ))}
      </div>
    </section>
  );
}

function PasswordCard() {
  const [state, action, pending] = useActionState(
    changePasswordAction,
    emptyForm,
  );

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">Change password</h2>
      <form action={action} className="space-y-3">
        <input
          name="current"
          type="password"
          className="input"
          placeholder="Current password"
        />
        <input
          name="next"
          type="password"
          className="input"
          placeholder="New password"
          required
        />
        <input
          name="confirm"
          type="password"
          className="input"
          placeholder="Confirm new password"
          required
        />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-success">{state.message}</p>}
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
