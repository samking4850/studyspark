"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import { storageChangeEvent } from "./classroom";
import { CLASS_CODE, daysUntil, isAssignedTo, readProfessorData, studentKeyFor } from "./professor/data";

// Overview banner for enrolled students: what the professor has assigned and sent.
export default function ClassUpdates({ accountId, mastered, onOpen }: { accountId: string; mastered: string[]; onOpen: () => void }) {
  const [summary, setSummary] = useState<{ due: number; overdue: number; unread: number } | null>(null);

  const refresh = useCallback(() => {
    const data = readProfessorData();
    const key = studentKeyFor(accountId);
    const open = data.assignments.filter((assignment) => assignment.classCode === CLASS_CODE && isAssignedTo(assignment, key)
      && !(assignment.objectiveId ? mastered.includes(assignment.objectiveId) : (data.received[assignment.id] ?? []).includes(key)));
    setSummary({
      due: open.filter((assignment) => { const days = daysUntil(assignment.dueDate); return days >= 0 && days <= 7; }).length,
      overdue: open.filter((assignment) => daysUntil(assignment.dueDate) < 0).length,
      unread: data.messages.filter((message) => message.studentKey === key && !message.readAt).length,
    });
  }, [accountId, mastered]);

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(storageChangeEvent, refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener(storageChangeEvent, refresh); };
  }, [refresh]);

  if (!summary) return null;
  const parts = [
    summary.overdue ? `${summary.overdue} overdue` : "",
    summary.due ? `${summary.due} due this week` : "",
    summary.unread ? `${summary.unread} new ${summary.unread === 1 ? "message" : "messages"} from your professor` : "",
  ].filter(Boolean);
  return <div className="join-class-banner"><div><strong><GraduationCap size={15} style={{ verticalAlign: "-2px" }} /> {CLASS_CODE} · Introduction to Finance</strong><p>{parts.length ? parts.join(" · ") : "You're caught up on everything your professor assigned."}</p></div><button className="primary-button" onClick={onOpen}>Open class <ArrowRight size={15} /></button></div>;
}
