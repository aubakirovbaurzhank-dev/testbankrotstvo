"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Loader2, Sparkles, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Загружаем файл", "Gemini распознаёт договоры", "Считаем сценарии и риски"];

export function UploadForm({ live }: { live: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setError(null);
    if (!f) return;
    if (!f.type.includes("pdf") && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Нужен PDF-файл кредитного отчёта.");
      return;
    }
    setFile(f);
  }

  async function analyze() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 6000);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Не удалось распознать отчёт.");
      router.push(`/applications/${j.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    } finally {
      clearInterval(timer);
    }
  }

  return (
    <div className="space-y-4">
      {!live && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <b>Демо-режим.</b> Живое распознавание отключено — добавьте <code>GEMINI_API_KEY</code> в{" "}
            <code>.env.local</code> и перезапустите. Пока можно изучить готовые демо-заявки в разделе «Заявки».
          </div>
        </div>
      )}

      {!busy ? (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0] || null); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
              drag ? "border-brand-400 bg-brand-50" : "border-ink-200 bg-white hover:border-brand-300 hover:bg-ink-50/50",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] || null)}
            />
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div className="mt-4 text-base font-semibold text-ink-800">
              Перетащите PDF-отчёт сюда
            </div>
            <div className="mt-1 text-sm text-ink-400">
              или нажмите, чтобы выбрать · Кредистори / ОКБ / НБКИ · до 25 МБ
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink-800">{file.name}</div>
                  <div className="text-xs text-ink-400">{(file.size / 1024 / 1024).toFixed(1)} МБ</div>
                </div>
              </div>
              <button onClick={() => setFile(null)} className="text-ink-300 hover:text-ink-600">
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <button onClick={analyze} disabled={!file || !live} className="btn-primary w-full py-3">
            <Sparkles className="h-4 w-4" /> Проанализировать отчёт
          </button>
        </>
      ) : (
        <div className="card p-8">
          <div className="flex flex-col items-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <div className="mt-4 text-base font-semibold text-ink-800">Анализируем отчёт…</div>
            <div className="mt-1 text-sm text-ink-400">Обычно занимает 15–30 секунд</div>
          </div>
          <ol className="mx-auto mt-6 max-w-sm space-y-2.5">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className={cn(
                  "grid h-6 w-6 place-items-center rounded-full text-xs",
                  i < step ? "bg-emerald-100 text-emerald-600" : i === step ? "bg-brand-100 text-brand-600" : "bg-ink-100 text-ink-400",
                )}>
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={cn(i <= step ? "font-medium text-ink-700" : "text-ink-400")}>{s}</span>
                {i === step && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
