import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudySpark — A clear next step for every student",
  description:
    "A personal study companion for students, built for private colleges and independent high schools. Explore personalized lessons, course practice, and study nights.",
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
