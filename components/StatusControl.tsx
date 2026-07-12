"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Trash2, Loader2 } from "lucide-react";
import { STATUS_META, STATUS_ORDER, type ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusControl({ id, current }: { id: string; current: ApplicationStatus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const m = STATUS_META[current];

  async function setStatus(to: ApplicationStatus) {
    setOpen(false);
    if (to === current) return;
    setBusy(true);
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Удалить заявку? Действие необратимо.")) return;
    setBusy(true);
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    router.push("/applications");
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          className={cn("chip cursor-pointer select-none border px-3 py-2 text-sm", m.color)}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />}
          {m.label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-1.5 w-60 rounded-xl border border-ink-200 bg-white p-1.5 shadow-lift">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-50"
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
                    {STATUS_META[s].label}
                  </span>
                  {s === current && <Check className="h-4 w-4 text-brand-600" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button onClick={remove} disabled={busy} className="btn-ghost px-2.5 text-ink-400 hover:text-rose-600" title="Удалить">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
