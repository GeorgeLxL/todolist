"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/server/actions/auth";
import { emptyForm } from "@/lib/form-state";

export function ChangePasswordGate({ force }: { force: boolean }) {
  const [state, action, pending] = useActionState(
    changePasswordAction,
    emptyForm,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  if (!force) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold">Change your password</h2>
        <p className="mt-1 text-xs text-muted">
          Your password was reset. Set a new password to continue.
        </p>
        <form action={action} className="mt-4 space-y-3">
          <input
            name="next"
            type="password"
            placeholder="New password"
            className="input"
            required
          />
          <input
            name="confirm"
            type="password"
            placeholder="Confirm new password"
            className="input"
            required
          />
          {state.error && (
            <p className="text-sm text-danger">{state.error}</p>
          )}
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Saving…" : "Set password"}
          </button>
        </form>
      </div>
    </div>
  );
}
