export const THEMES = [
  "light",
  "dark",
  "green",
  "pink",
  "yellow",
  "purple",
  "blue",
  "red",
  "brown",
] as const;

export type Theme = (typeof THEMES)[number];

export interface User {
  id: string;
  username: string;
  birthday: string | null;
  theme: Theme;
  timezone: string;
  force_password_change: boolean;
  created_at: string;
  updated_at: string;
}
