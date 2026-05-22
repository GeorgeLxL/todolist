"use client";

import { useState } from "react";
import { create } from "zustand";
import { Modal } from "./modal";

type Kind = "confirm" | "prompt" | "alert";

interface BaseOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
interface PromptOpts extends BaseOpts {
  defaultValue?: string;
  placeholder?: string;
}

interface Active extends PromptOpts {
  id: number;
  kind: Kind;
  resolve: (v: string | boolean | null) => void;
}

let counter = 0;

const useDialogStore = create<{
  active: Active | null;
  open: (a: Omit<Active, "id">) => void;
  dismiss: () => void;
}>((set) => ({
  active: null,
  open: (a) => set({ active: { ...a, id: ++counter } }),
  dismiss: () => set({ active: null }),
}));

/** Modal replacement for window.confirm. */
export function confirmDialog(opts: BaseOpts): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.getState().open({
      ...opts,
      kind: "confirm",
      resolve: (v) => resolve(v === true),
    });
  });
}

/** Modal replacement for window.prompt. Resolves null on cancel. */
export function promptDialog(opts: PromptOpts): Promise<string | null> {
  return new Promise((resolve) => {
    useDialogStore.getState().open({
      ...opts,
      kind: "prompt",
      resolve: (v) => resolve(typeof v === "string" ? v : null),
    });
  });
}

/** Modal replacement for window.alert. */
export function alertDialog(opts: BaseOpts): Promise<void> {
  return new Promise((resolve) => {
    useDialogStore.getState().open({
      ...opts,
      kind: "alert",
      resolve: () => resolve(),
    });
  });
}

export function DialogHost() {
  const active = useDialogStore((s) => s.active);
  const dismiss = useDialogStore((s) => s.dismiss);
  if (!active) return null;
  return <DialogBody key={active.id} active={active} dismiss={dismiss} />;
}

function DialogBody({
  active,
  dismiss,
}: {
  active: Active;
  dismiss: () => void;
}) {
  const [value, setValue] = useState(active.defaultValue ?? "");

  function finish(result: string | boolean | null) {
    active.resolve(result);
    dismiss();
  }

  const cancel = () =>
    finish(active.kind === "alert" ? true : active.kind === "prompt" ? null : false);

  function accept() {
    if (active.kind === "prompt") {
      if (value.trim()) finish(value.trim());
    } else {
      finish(true);
    }
  }

  return (
    <Modal title={active.title} onClose={cancel}>
      <div className="space-y-4">
        {active.message && (
          <p className="text-sm text-muted">{active.message}</p>
        )}
        {active.kind === "prompt" && (
          <input
            autoFocus
            className="input"
            value={value}
            placeholder={active.placeholder}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") accept();
            }}
          />
        )}
        <div className="flex justify-end gap-2">
          {active.kind !== "alert" && (
            <button className="btn-ghost" onClick={cancel}>
              {active.cancelLabel ?? "Cancel"}
            </button>
          )}
          <button
            className={active.danger ? "btn-danger" : "btn-primary"}
            onClick={accept}
          >
            {active.confirmLabel ??
              (active.kind === "alert" ? "OK" : "Confirm")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
