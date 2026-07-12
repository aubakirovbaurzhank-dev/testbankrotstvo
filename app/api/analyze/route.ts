import { NextResponse } from "next/server";
import { extractReport } from "@/lib/analyze";
import { analyzeFinance } from "@/lib/finance";
import { isLiveMode } from "@/lib/gemini";
import { saveApplication, newId } from "@/lib/store";
import type { Application } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isLiveMode()) {
    return NextResponse.json(
      { error: "Демо-режим: живое распознавание отключено. Добавьте GEMINI_API_KEY в .env.local." },
      { status: 400 },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать файл." }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "Файл не приложен." }, { status: 400 });
  if (file.type && !file.type.includes("pdf")) {
    return NextResponse.json({ error: "Нужен PDF-файл кредитного отчёта." }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Файл больше 25 МБ." }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const report = await extractReport(buf);
    if (!report.contracts?.length) {
      return NextResponse.json(
        { error: "В отчёте не найдены действующие кредитные договоры." },
        { status: 422 },
      );
    }
    const analysis = analyzeFinance(report);
    const now = new Date().toISOString();
    const app: Application = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      status: "new",
      source: "live",
      fileName: file.name || "report.pdf",
      report,
      analysis,
      history: [{ at: now, type: "created", note: `Загружен отчёт «${file.name}»` }],
    };
    saveApplication(app);
    return NextResponse.json({ id: app.id, application: app });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка при распознавании отчёта.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
