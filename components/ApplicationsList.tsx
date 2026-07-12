"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_META, STATUS_ORDER, type Application, type ApplicationStatus } from "@/lib/types";
import { rub, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const SCENARIO_LABEL: Record<string, string> = {
  bankruptcy: "Банкротство",
  restructuring: "Реструктуризация",
  continue: "Платить банкам",
};

export function ApplicationsList({ apps }: { apps: Application[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: apps.length };
    for (const s of STATUS_ORDER) c[s] = 0;
    for (const a of apps) c[a.status]++;
    return c;
  }, [apps]);

  const filtered = apps.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (q && !a.report.borrower_name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} label={`Все · ${counts.all}`} />
        {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
          <Chip
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={`${STATUS_META[s].label} · ${counts[s]}`}
            dot={STATUS_META[s].dot}
          />
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по ФИО…"
            className="w-56 rounded-xl border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {/* Таблица */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="px-5 py-3 font-medium">Клиент</th>
                <th className="px-5 py-3 text-right font-medium">Долг</th>
                <th className="px-5 py-3 font-medium">Рекомендация ИИ</th>
                <th className="px-5 py-3 text-right font-medium">Экономия</th>
                <th className="px-5 py-3 font-medium">Статус</th>
                <th className="px-5 py-3 font-medium">Дата</th>
                <th className="px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((a) => {
                const best = a.analysis.scenarios.find((s) => s.key === a.analysis.best_scenario);
                return (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/applications/${a.id}`)}
                    className="group cursor-pointer hover:bg-brand-50/40"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-ink-800">{a.report.borrower_name}</div>
                      <div className="text-xs text-ink-400">
                        {a.report.contracts.length} кред. · {a.manager ? `менеджер ${a.manager}` : "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-ink-900">
                      {rub(a.analysis.total_current_debt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="chip border-brand-100 bg-brand-50 text-brand-700">
                        {SCENARIO_LABEL[a.analysis.best_scenario]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-emerald-600">
                      {best && best.savings_vs_continue > 0 ? rub(best.savings_vs_continue) : "—"}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3.5 text-ink-500">{formatDate(a.createdAt)}</td>
                    <td className="px-2">
                      <ArrowRight className="h-4 w-4 text-ink-200 group-hover:text-brand-500" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="py-12 text-center text-sm text-ink-400">Ничего не найдено</div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label, dot }: { active: boolean; onClick: () => void; label: string; dot?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "chip border transition",
        active ? "border-brand-300 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-white" : dot)} />}
      {label}
    </button>
  );
}
