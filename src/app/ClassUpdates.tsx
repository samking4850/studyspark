"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import { loadStudentClass, type ClassInfo } from "./cloud";
import { daysUntil } from "./professor/data";

type Summary = { cls: ClassInfo; due: number; overdue: number; unread: number };

// Overview banner for each joined class: what the professor has assigned and sent.
export default function ClassUpdates({ userId, classes, onOpen }: { userId: string; classes: ClassInfo[]; onOpen: (cls: ClassInfo) => void }) {
  const [summaries, setSummaries] = useState<Summary[]>([]);

  const refresh = useCallback(async () => {
    const next = await Promise.all(classes.map(async (cls) => {
      const data = await loadStudentClass(cls.id, userId);
      const mastered = new Set(data.mastery.map((row) => row.objective_key));
      const completed = new Set(data.completions.map((row) => row.assignment_id));
      const open = data.assignments.filter((item) => !(item.objective_key ? mastered.has(item.objective_key) : completed.has(item.id)));
      return {
        cls,
        due: open.filter((item) => { const days = daysUntil(item.due_date); return days >= 0 && days <= 7; }).length,
        overdue: open.filter((item) => daysUntil(item.due_date) < 0).length,
        unread: data.messages.filter((message) => !message.read_at).length,
      };
    }));
    setSummaries(next);
  }, [classes, userId]);

  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return <>{summaries.map(({ cls, due, overdue, unread }) => {
    const parts = [
      overdue ? `${overdue} overdue` : "",
      due ? `${due} due this week` : "",
      unread ? `${unread} new ${unread === 1 ? "message" : "messages"} from your professor` : "",
    ].filter(Boolean);
    return <div className="join-class-banner" key={cls.id}><div><strong><GraduationCap size={15} style={{ verticalAlign: "-2px" }} /> {cls.code} · {cls.name}</strong><p>{parts.length ? parts.join(" · ") : "You're caught up on everything your professor assigned."}</p></div><button className="primary-button" onClick={() => onOpen(cls)}>Open class <ArrowRight size={15} /></button></div>;
  })}</>;
}
