"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Лёгкий рендер markdown: **жирный**, `код`, списки, абзацы. */
function mdToHtml(src: string): string {
  const lines = escapeHtml(src).split("\n");
  let html = "";
  let list: "ul" | "ol" | null = null;
  const inline = (t: string) =>
    t
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  const close = () => {
    if (list) { html += `</${list}>`; list = null; }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const ul = line.match(/^\s*[-*]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul) {
      if (list !== "ul") { close(); html += "<ul>"; list = "ul"; }
      html += `<li>${inline(ul[1])}</li>`;
    } else if (ol) {
      if (list !== "ol") { close(); html += "<ol>"; list = "ol"; }
      html += `<li>${inline(ol[1])}</li>`;
    } else if (line.trim() === "") {
      close();
    } else {
      close();
      html += `<p>${inline(line)}</p>`;
    }
  }
  close();
  return html;
}

export function ChatPanel({
  applicationId,
  live,
  suggestions = [],
  intro,
  className,
  minHeight = 420,
}: {
  applicationId?: string;
  live: boolean;
  suggestions?: string[];
  intro?: string;
  className?: string;
  minHeight?: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    if (!live) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, applicationId }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Ошибка запроса");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      const update = () =>
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          acc += dec.decode(); // финальный флаш: не терять последний символ (кириллица = 2 байта)
          update();
          break;
        }
        acc += dec.decode(value, { stream: true });
        update();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("card flex flex-col overflow-hidden", className)}>
      <div className="flex items-center gap-2.5 border-b border-ink-100 px-5 py-3.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-ink-800">ИИ-ассистент</div>
          <div className="text-xs text-ink-400">знает процесс и эту заявку</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" style={{ minHeight }}>
        {messages.length === 0 && (
          <div className="space-y-3">
            {intro && (
              <div className="flex gap-2.5">
                <Avatar role="assistant" />
                <div className="prose-chat max-w-[85%] rounded-2xl rounded-tl-sm bg-ink-50 px-4 py-3 text-sm text-ink-700"
                  dangerouslySetInnerHTML={{ __html: mdToHtml(intro) }} />
              </div>
            )}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-10">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={!live}
                    className="chip border-brand-200 bg-brand-50 text-brand-700 transition hover:bg-brand-100 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
            <Avatar role={m.role} />
            <div
              className={cn(
                "prose-chat max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                m.role === "user"
                  ? "rounded-tr-sm bg-brand-600 text-white"
                  : "rounded-tl-sm bg-ink-50 text-ink-700",
              )}
            >
              {m.content ? (
                <span dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }} />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-100 p-3">
        {!live && (
          <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Демо-режим: чат отключён. Добавьте <code>GEMINI_API_KEY</code> в <code>.env.local</code>.
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!live || busy}
            placeholder={live ? "Спросите ассистента…" : "Недоступно в демо-режиме"}
            className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50"
          />
          <button type="submit" disabled={!live || busy || !input.trim()} className="btn-primary px-3.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  return (
    <div
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
        role === "user" ? "bg-brand-100 text-brand-600" : "bg-ink-800 text-white",
      )}
    >
      {role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
    </div>
  );
}
