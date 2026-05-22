"use client";

import { useEffect } from "react";
import type { TaskWithMeta } from "@/types/task";

/**
 * Schedules browser notifications 10 minutes before a task's time.
 * Timers are client-side only, so they fire only while the app is open.
 * Task date+time is treated as the user's local time.
 */
export function NotificationManager({
  tasks,
  userId,
  today,
}: {
  tasks: TaskWithMeta[];
  userId: string;
  today: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }

    const mine = tasks.filter(
      (t) =>
        t.notify &&
        !t.is_fully_complete &&
        t.date === today &&
        !!t.time &&
        (t.type === "personal" || t.user_id === userId),
    );

    const timers: number[] = [];
    for (const t of mine) {
      const start = new Date(`${t.date}T${t.time}`).getTime();
      const delay = start - 10 * 60 * 1000 - Date.now();
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        const id = window.setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification("Task reminder", {
              body: `"${t.title}" starts in 10 minutes`,
            });
          }
        }, delay);
        timers.push(id);
      }
    }
    return () => timers.forEach((id) => clearTimeout(id));
  }, [tasks, userId, today]);

  return null;
}
