import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Spark — Professor portal",
  description: "Assign coursework and follow each student's progress, study time, and mastered objectives.",
};

export default function ProfessorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
