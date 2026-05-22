"use client";

import { createContext, useContext } from "react";

const TodayContext = createContext<string>("");

export function TodayProvider({
  today,
  children,
}: {
  today: string;
  children: React.ReactNode;
}) {
  return (
    <TodayContext.Provider value={today}>{children}</TodayContext.Provider>
  );
}

/** The current user's "today" (YYYY-MM-DD, in their timezone). */
export function useToday(): string {
  return useContext(TodayContext);
}
