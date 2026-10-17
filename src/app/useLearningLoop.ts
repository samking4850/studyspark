"use client";
import { useCallback, useEffect, useState } from "react";
import { loopEvent, parsePublication, parseReviews, publicationKey, type PublishedLesson, type ReviewItem } from "../lib/learning-loop";

export function usePublication() {
  const [publication, setPublication] = useState<PublishedLesson | null>(null);
  useEffect(() => {
    function read() { try { setPublication(parsePublication(localStorage.getItem(publicationKey))); } catch { setPublication(null); } }
    read(); window.addEventListener("storage", read); window.addEventListener(loopEvent, read);
    return () => { window.removeEventListener("storage", read); window.removeEventListener(loopEvent, read); };
  }, []);
  return publication;
}

export function useReviews(accountId: string) {
  const key = `study-spark-review-v1:${accountId}`;
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    function read() { try { setReviews(parseReviews(localStorage.getItem(key))); } catch { setError("Review could not be loaded on this device."); } }
    read(); window.addEventListener("storage", read); window.addEventListener(loopEvent, read);
    return () => { window.removeEventListener("storage", read); window.removeEventListener(loopEvent, read); };
  }, [key]);
  const update = useCallback((change: (items: ReviewItem[]) => ReviewItem[]) => {
    try {
      const next = change(parseReviews(localStorage.getItem(key)));
      localStorage.setItem(key, JSON.stringify(next)); setReviews(next); setError(""); window.dispatchEvent(new Event(loopEvent));
    } catch { setError("Review could not be saved. Keep this tab open and try again."); }
  }, [key]);
  return { reviews, update, error };
}
