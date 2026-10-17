import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudySpark — A clear next step for every student",
  description:
    "College-funded learning support: instructor-aligned practice, purposeful study plans, and collaborative review.",
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
