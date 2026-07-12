import { NextResponse } from "next/server";
import { streamChat } from "@/lib/chat";
import { isLiveMode } from "@/lib/gemini";
import { getApplication, listApplications } from "@/lib/store";
import { computeAnalytics } from "@/lib/analytics";
import { applicationContext, analyticsContext } from "@/lib/knowledge";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isLiveMode()) {
    return NextResponse.json(
      { error: "Демо-режим: чат с ИИ отключён. Добавьте GEMINI_API_KEY в .env.local." },
      { status: 400 },
    );
  }

  let body: { messages?: ChatMessage[]; applicationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  const messages = (body?.messages || []).filter((m) => m?.content?.trim());
  if (!messages.length) return NextResponse.json({ error: "Пустой запрос." }, { status: 400 });

  // Собираем контекст: аналитика воронки + (опц.) конкретная заявка.
  const analytics = computeAnalytics(listApplications());
  const ctx = {
    analytics: analyticsContext({
      total: analytics.total,
      byStatus: analytics.byStatus,
      won: analytics.won,
      lost: analytics.lost,
      totalDebtAnalyzed: analytics.totalDebtAnalyzed,
      potentialSavings: analytics.potentialSavings,
    }),
    application: body.applicationId
      ? (() => {
          const app = getApplication(body.applicationId!);
          return app ? applicationContext(app) : undefined;
        })()
      : undefined,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      try {
        for await (const piece of streamChat(messages, ctx)) {
          try {
            controller.enqueue(encoder.encode(piece));
          } catch {
            closed = true; // клиент отключился — прекращаем потреблять Gemini
            break;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка ИИ";
        if (!closed) {
          try { controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`)); } catch { /* закрыт */ }
        }
      } finally {
        if (!closed) {
          try { controller.close(); } catch { /* уже закрыт */ }
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
