import { PDFParse } from "pdf-parse";
import { getData } from "pdf-parse/worker";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PAGES = 100;
const MAX_EXTRACTED_CHARACTERS = 100_000;
PDFParse.setWorker(getData());
const STOP_WORDS = new Set([
  "about", "after", "again", "also", "among", "been", "before", "being", "between",
  "both", "could", "does", "each", "from", "have", "into", "more", "most", "other",
  "over", "same", "some", "such", "than", "that", "their", "them", "there", "these",
  "they", "this", "those", "through", "under", "very", "were", "what", "when", "where",
  "which", "while", "with", "would", "your", "chapter", "figure", "table", "example",
]);

type SuggestedTopic = { name: string; page: number; excerpt: string };

function suggestTopics(pages: Array<{ num: number; text: string }>): SuggestedTopic[] {
  const candidates = new Map<string, SuggestedTopic>();

  for (const page of pages) {
    const lines = page.text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim());
    for (const line of lines) {
      const words = line.split(/\s+/);
      const looksLikeHeading =
        line.length >= 4 &&
        line.length <= 90 &&
        words.length >= 1 &&
        words.length <= 10 &&
        !/[.!?]$/.test(line) &&
        !/^(page|chapter)\s+\d+$/i.test(line) &&
        (/^[A-Z0-9][A-Z0-9\s:&(),/'-]+$/.test(line) ||
          words.filter((word) => /^[A-Z][a-z]/.test(word)).length >= Math.max(1, Math.ceil(words.length * 0.6)));

      if (!looksLikeHeading) continue;
      const name = line.replace(/^[\d.)\s-]+/, "").trim();
      const key = name.toLocaleLowerCase();
      if (name.length >= 3 && !candidates.has(key)) {
        candidates.set(key, { name, page: page.num, excerpt: line.slice(0, 180) });
      }
    }
  }

  if (candidates.size < 3) {
    for (const page of pages) {
      const words = page.text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
      const frequencies = new Map<string, number>();
      for (let index = 0; index < words.length - 1; index += 1) {
        const first = words[index];
        const second = words[index + 1];
        if (STOP_WORDS.has(first) || STOP_WORDS.has(second)) continue;
        const phrase = `${first} ${second}`;
        frequencies.set(phrase, (frequencies.get(phrase) ?? 0) + 1);
      }
      for (const [phrase, count] of frequencies) {
        const key = phrase.toLocaleLowerCase();
        if (count < 2 || candidates.has(key)) continue;
        const name = phrase.replace(/\b[a-z]/g, (character) => character.toUpperCase());
        const excerptIndex = page.text.toLowerCase().indexOf(phrase);
        candidates.set(key, {
          name,
          page: page.num,
          excerpt: page.text.slice(Math.max(0, excerptIndex - 45), excerptIndex + phrase.length + 90).replace(/\s+/g, " ").trim(),
        });
      }
    }
  }

  return [...candidates.values()].slice(0, 20);
}

function limitPages(pages: Array<{ num: number; text: string }>, maxCharacters: number) {
  const limited: Array<{ num: number; text: string }> = [];
  let used = 0;
  for (const page of pages) {
    const text = page.text.replace(/[ \t]+/g, " ").trim();
    if (!text) continue;
    if (used + text.length > maxCharacters) break;
    limited.push({ num: page.num, text });
    used += text.length;
  }
  return limited;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "This PDF is too large. Please choose a file under 5 MB." }, { status: 413 });
  }

  let file: FormDataEntryValue | null;
  try {
    const form = await request.formData();
    file = form.get("file");
  } catch {
    return NextResponse.json({ error: "The upload could not be read. Please try again with a PDF file." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a PDF file to upload." }, { status: 400 });
  }
  if (!file.name.toLocaleLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "This file does not appear to be a PDF. Please choose a .pdf file." }, { status: 415 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "This PDF is empty. Choose a file with course notes." }, { status: 422 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "This PDF is too large. Please choose a file under 5 MB." }, { status: 413 });
  }

  let data: Uint8Array;
  try {
    data = new Uint8Array(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "The PDF upload was interrupted. Please try the upload again." }, { status: 400 });
  }
  const header = new TextDecoder("ascii").decode(data.subarray(0, 1024));
  if (!header.includes("%PDF-")) {
    return NextResponse.json({ error: "We could not verify this PDF. Check the file and try again." }, { status: 415 });
  }

  const parser = new PDFParse({ data, isEvalSupported: false, stopAtErrors: true });
  try {
    const info = await parser.getInfo();
    if (info.total > MAX_PAGES) {
      return NextResponse.json({ error: `This PDF has ${info.total} pages. For this demo, upload a document with ${MAX_PAGES} pages or fewer.` }, { status: 413 });
    }

    const result = await parser.getText({ lineEnforce: true, pageJoiner: "" });
    const pages = result.pages.map((page) => ({ num: page.num, text: page.text }));
    const extractedText = result.text.trim();
    if (extractedText.replace(/\s/g, "").length < 20) {
      return NextResponse.json({
        error: "We couldn’t find selectable text in this PDF. It may be scanned or image-only. OCR isn’t available in this demo; try a text-based PDF or add topics manually.",
      }, { status: 422 });
    }

    return NextResponse.json({
      filename: file.name.slice(0, 200),
      pageCount: info.total,
      extractedText: extractedText.slice(0, MAX_EXTRACTED_CHARACTERS),
      textTruncated: extractedText.length > MAX_EXTRACTED_CHARACTERS,
      suggestedTopics: suggestTopics(pages),
      // Per-page text (same overall character cap) so the course notebook can cite file and page.
      pages: limitPages(pages, MAX_EXTRACTED_CHARACTERS),
    });
  } catch (error) {
    console.error("PDF extraction failed:", error instanceof Error ? { name: error.name, message: error.message } : "Unknown parser error");
    return NextResponse.json({
      error: "We couldn’t read this PDF. It may be damaged or password-protected. Try another file or add topics manually.",
    }, { status: 422 });
  } finally {
    await parser.destroy();
  }
}
