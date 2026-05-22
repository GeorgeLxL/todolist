import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "TodoList",
  description: "Personal & team task management",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="en" data-theme={user?.theme ?? "light"}>
      <body>{children}</body>
    </html>
  );
}
