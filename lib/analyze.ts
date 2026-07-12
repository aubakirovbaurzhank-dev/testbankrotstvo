import "server-only";
import { Type } from "@google/genai";
import { getClient, MODEL_EXTRACT } from "./gemini";
import type { ExtractedReport } from "./types";

const FALLBACK_MODEL = process.env.GEMINI_MODEL_EXTRACT_FALLBACK?.trim() || "gemini-2.5-flash";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Транзиентная ошибка Gemini (перегрузка/лимиты) — стоит повторить. */
function isTransient(e: unknown): boolean {
  const s = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    s.includes("503") || s.includes("unavailable") || s.includes("overloaded") ||
    s.includes("high demand") || s.includes("429") || s.includes("resource_exhausted") ||
    s.includes("500") || s.includes("internal")
  );
}

// ── Схема структурированного вывода для Gemini ───────────────────
const contractSchema = {
  type: Type.OBJECT,
  properties: {
    creditor: { type: Type.STRING, description: "Кредитор (банк или МФО)" },
    loan_type: { type: Type.STRING, description: "Вид займа/кредита" },
    loan_sum: { type: Type.NUMBER, description: "Сумма займа / лимит, ₽" },
    current_debt: { type: Type.NUMBER, description: "Текущая общая задолженность, ₽" },
    overdue_debt: { type: Type.NUMBER, description: "Просроченная задолженность, ₽" },
    psk_percent: { type: Type.NUMBER, description: "ПСК, % годовых" },
    avg_monthly_payment: { type: Type.NUMBER, description: "Среднемесячный платёж, ₽" },
    origination_date: { type: Type.STRING, description: "Дата возникновения обязательства, YYYY-MM-DD" },
    end_date: { type: Type.STRING, description: "Дата прекращения, YYYY-MM-DD (бессрочно = 9999-12-31)" },
    total_paid: { type: Type.NUMBER, description: "Всего внесено платежей, ₽" },
    total_paid_principal: { type: Type.NUMBER, description: "Внесено в основной долг, ₽" },
    total_paid_interest: { type: Type.NUMBER, description: "Внесено в проценты, ₽" },
    payments_made: { type: Type.INTEGER, description: "Количество фактических платежей" },
    status_text: { type: Type.STRING, description: "Статус платежа из отчёта" },
  },
  required: [
    "creditor", "loan_sum", "current_debt", "psk_percent", "avg_monthly_payment",
    "origination_date", "end_date", "total_paid_principal", "total_paid_interest", "payments_made",
  ],
  propertyOrdering: [
    "creditor", "loan_type", "loan_sum", "current_debt", "overdue_debt", "psk_percent",
    "avg_monthly_payment", "origination_date", "end_date", "total_paid", "total_paid_principal",
    "total_paid_interest", "payments_made", "status_text",
  ],
};

const reportSchema = {
  type: Type.OBJECT,
  properties: {
    borrower_name: { type: Type.STRING, description: "ФИО субъекта кредитной истории" },
    birth_date: { type: Type.STRING, description: "Дата рождения, YYYY-MM-DD" },
    inn: { type: Type.STRING, description: "ИНН" },
    report_date: { type: Type.STRING, description: "Дата формирования отчёта, YYYY-MM-DD" },
    bureau: { type: Type.STRING, description: "Бюро (Кредистори/ОКБ/НБКИ)" },
    total_debt: { type: Type.NUMBER, description: "Суммарная действующая задолженность, ₽" },
    overdue_debt: { type: Type.NUMBER, description: "Суммарная просрочка, ₽" },
    credit_rating: { type: Type.INTEGER, description: "Индивидуальный рейтинг" },
    contracts: { type: Type.ARRAY, items: contractSchema },
  },
  required: ["borrower_name", "total_debt", "contracts"],
};

const PROMPT = `Ты — эксперт по анализу кредитных отчётов Кредистори / ОКБ / НБКИ.
Проанализируй PDF-отчёт и извлеки данные строго по схеме.

Для КАЖДОГО действующего кредитного договора укажи:
- кредитора, вид займа, сумму займа/лимит;
- текущую общую задолженность и просроченную задолженность;
- ПСК (полная стоимость кредита, % годовых);
- величину среднемесячного платежа;
- дату возникновения обязательства и дату прекращения (обе в формате YYYY-MM-DD);
- «Сумма всех внесённых платежей»: всего, по основному долгу, по процентам;
- количество фактических платежей (payments_made) — посчитай по разделу «Фактические платежи».

Правила:
- Все суммы — числа в рублях без пробелов и знака валюты (например 53987.05).
- Дату «31 декабря 9999» записывай как "9999-12-31".
- Если поля нет в отчёте — ставь 0 (для чисел) или пустую строку.
- Не придумывай договоры, которых нет. Бери только ДЕЙСТВУЮЩИЕ кредитные договоры.`;

/** Распознаёт PDF-отчёт живым Gemini и возвращает структурированные данные. */
export async function extractReport(pdf: Buffer): Promise<ExtractedReport> {
  const ai = getClient();
  const base64 = pdf.toString("base64");

  const request = {
    contents: [
      { inlineData: { mimeType: "application/pdf", data: base64 } },
      { text: PROMPT },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: reportSchema,
    },
  };

  // Отказоустойчивость: при перегрузке модели (503) повторяем с бэкоффом,
  // затем переключаемся на запасную модель.
  const models = Array.from(new Set([MODEL_EXTRACT, FALLBACK_MODEL]));
  let text: string | undefined;
  let lastErr: unknown;
  outer: for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await ai.models.generateContent({ model, ...request });
        text = res.text;
        if (text) break outer;
        lastErr = new Error("Пустой ответ модели");
      } catch (e) {
        lastErr = e;
        if (!isTransient(e)) break; // ошибка не транзиентная — к следующей модели
        if (attempt < 2) await sleep(1500 * (attempt + 1)); // без паузы после последней попытки
      }
    }
  }

  if (!text) {
    const msg = lastErr instanceof Error ? lastErr.message : "неизвестная ошибка";
    throw new Error(`Не удалось распознать отчёт. Попробуйте ещё раз. Детали: ${msg}`);
  }

  let parsed: ExtractedReport;
  try {
    parsed = JSON.parse(text) as ExtractedReport;
  } catch {
    throw new Error("Не удалось разобрать ответ Gemini как JSON.");
  }

  // Санитизация и подстраховка вычисляемых полей.
  parsed.contracts = (parsed.contracts || []).map((c) => ({
    ...c,
    loan_sum: num(c.loan_sum),
    current_debt: num(c.current_debt),
    overdue_debt: num(c.overdue_debt),
    psk_percent: num(c.psk_percent),
    avg_monthly_payment: num(c.avg_monthly_payment),
    total_paid: num(c.total_paid) > 0 ? num(c.total_paid) : num(c.total_paid_principal) + num(c.total_paid_interest),
    total_paid_principal: num(c.total_paid_principal),
    total_paid_interest: num(c.total_paid_interest),
    payments_made: Math.round(num(c.payments_made)),
  }));
  parsed.total_debt = num(parsed.total_debt) || parsed.contracts.reduce((s, c) => s + c.current_debt, 0);
  parsed.bureau = parsed.bureau || "Кредистори / ОКБ";
  return parsed;
}

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v.replace(/\s/g, "").replace(",", ".")) : Number(v);
  return isNaN(n) ? 0 : n;
}
