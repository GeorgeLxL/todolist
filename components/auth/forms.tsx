"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  loginAction,
  registerAction,
  resetPasswordAction,
} from "@/server/actions/auth";
import { emptyForm } from "@/lib/form-state";

export function LoginCard() {
  const [state, action, pending] = useActionState(loginAction, emptyForm);
  const [reset, action2, pending2] = useActionState(
    resetPasswordAction,
    emptyForm,
  );
  const [showReset, setShowReset] = useState(false);

  return (
    <div className="card p-6">
      {!showReset ? (
        <>
          <h2 className="mb-4 text-lg font-semibold">Sign in</h2>
          <form action={action} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Username
              </label>
              <input name="username" className="input" autoFocus required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Password
              </label>
              <input
                name="password"
                type="password"
                className="input"
                required
              />
            </div>
            {state.error && (
              <p className="text-sm text-danger">{state.error}</p>
            )}
            <button className="btn-primary w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            <button
              className="text-muted hover:text-text"
              onClick={() => setShowReset(true)}
            >
              Forgot password?
            </button>
            <Link href="/auth/register" className="text-primary">
              Create account
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2 className="mb-1 text-lg font-semibold">Reset password</h2>
          <p className="mb-4 text-xs text-muted">
            Your password will be reset to a temporary value.
          </p>
          <form action={action2} className="space-y-3">
            <input
              name="username"
              className="input"
              placeholder="Username"
              required
            />
            {reset.error && (
              <p className="text-sm text-danger">{reset.error}</p>
            )}
            {reset.ok && (
              <p className="text-sm text-success">{reset.message}</p>
            )}
            <button className="btn-primary w-full" disabled={pending2}>
              {pending2 ? "Resetting…" : "Reset password"}
            </button>
          </form>
          <button
            className="mt-4 text-sm text-muted hover:text-text"
            onClick={() => setShowReset(false)}
          >
            ← Back to sign in
          </button>
        </>
      )}
    </div>
  );
}

export function RegisterCard() {
  const [state, action, pending] = useActionState(registerAction, emptyForm);

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold">Create account</h2>
      <form action={action} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Username
          </label>
          <input name="username" className="input" autoFocus required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Password
          </label>
          <input name="password" type="password" className="input" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Confirm password
          </label>
          <input name="confirm" type="password" className="input" required />
        </div>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      <div className="mt-4 text-sm">
        <Link href="/auth/login" className="text-primary">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
