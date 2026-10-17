import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Spark — Your study sidekick",
  description:
    "A calmer way to prepare for exams. Plan your study sessions and learn one concept at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
