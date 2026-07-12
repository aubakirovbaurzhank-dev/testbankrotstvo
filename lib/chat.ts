import "server-only";
import { getClient, MODEL_CHAT } from "./gemini";
import { PROCESS_KB } from "./knowledge";
import type { ChatMessage } from "./types";

export interface ChatContext {
  application?: string; // готовый текстовый контекст заявки
  analytics?: string;   // готовый текстовый контекст аналитики
}

function buildSystemInstruction(ctx: ChatContext): string {
  const parts = [PROCESS_KB];
  if (ctx.analytics) parts.push("\n" + ctx.analytics);
  if (ctx.application) parts.push("\n" + ctx.application);
  parts.push(
    "\nОтвечай кратко и по делу (2–6 предложений, если не просят подробнее). Используй **выделение** и списки, где это помогает.",
  );
  return parts.join("\n");
}

function toContents(history: ChatMessage[]) {
  return history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

/** Стриминговый ответ ассистента (async generator из текстовых кусков). */
export async function* streamChat(
  history: ChatMessage[],
  ctx: ChatContext,
): AsyncGenerator<string> {
  const ai = getClient();
  const stream = await ai.models.generateContentStream({
    model: MODEL_CHAT,
    contents: toContents(history),
    config: {
      systemInstruction: buildSystemInstruction(ctx),
      temperature: 0.4,
    },
  });
  for await (const chunk of stream) {
    const t = chunk.text;
    if (t) yield t;
  }
}
