import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Encore — a taste-matched Saturday",
  description:
    "Encore turns taste into companionship: a Qloo-grounded background agent that plans one perfect evening for isolated older adults.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
