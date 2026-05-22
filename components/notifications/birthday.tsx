"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { IconCake } from "@/components/icons";

export function BirthdayBanner({
  birthdays,
}: {
  birthdays: { username: string; when: "today" | "tomorrow" }[];
}) {
  if (!birthdays.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b bg-accent/10 px-4 py-2 text-sm">
      <IconCake className="h-4 w-4 text-accent" />
      {birthdays.map((b, i) => (
        <span key={i}>
          {b.when === "today"
            ? `Today is ${b.username}'s birthday.`
            : `Tomorrow is ${b.username}'s birthday.`}
        </span>
      ))}
    </div>
  );
}

export function BirthdayModal({ username }: { username: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <Modal title="🎉" onClose={() => setOpen(false)}>
      <div className="flex flex-col items-center py-4 text-center">
        <IconCake className="h-12 w-12 text-accent" />
        <h3 className="mt-3 text-xl font-bold">Happy Birthday, {username}!</h3>
        <p className="mt-1 text-sm text-muted">
          Wishing you a wonderful day.
        </p>
        <button
          className="btn-primary mt-5"
          onClick={() => setOpen(false)}
        >
          Thanks!
        </button>
      </div>
    </Modal>
  );
}
