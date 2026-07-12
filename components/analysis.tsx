import {
  TrendingDown,
  Landmark,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { FinanceAnalysis, Scenario, ExtractedReport, ComplianceFlag } from "@/lib/types";
import { rub, pct, months, formatDate, num } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── Выплачено: основной долг vs проценты ─────────────────────────
export function PaidBreakdownCard({ a }: { a: FinanceAnalysis }) {
  const p = a.paid;
  const total = Math.max(1, p.total_paid);
  const wInt = Math.round((p.paid_interest / total) * 100);
  const wPrin = 100 - wInt;
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-ink-700">Что клиент уже выплатил</h3>
      <div className="mt-1 text-2xl font-bold tracking-tight text-ink-900">{rub(p.total_paid)}</div>
      <div className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full bg-emerald-500" style={{ width: `${wPrin}%` }} title="Основной долг" />
        <div className="h-full bg-amber-500" style={{ width: `${wInt}%` }} title="Проценты" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-emerald-50 px-3 py-2">
          <div className="text-xs text-emerald-700">В тело долга</div>
          <div className="font-semibold text-emerald-800">{rub(p.paid_principal)}</div>
          <div className="text-xs text-emerald-600">{wPrin}% выплат</div>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2">
          <div className="text-xs text-amber-700">В проценты банку</div>
          <div className="font-semibold text-amber-800">{rub(p.paid_interest)}</div>
          <div className="text-xs text-amber-600">{wInt}% выплат</div>
        </div>
      </div>
      {p.interest_share > 0.4 && (
        <p className="mt-3 text-xs text-ink-500">
          💡 {wInt}% денег ушло в проценты, а не в погашение долга — сильный аргумент для клиента.
        </p>
      )}
    </div>
  );
}

// ── Карточки трёх сценариев ──────────────────────────────────────
const SCENARIO_ICON = {
  continue: TrendingDown,
  bankruptcy: Landmark,
  restructuring: Scale,
} as const;

export function ScenarioCards({ a }: { a: FinanceAnalysis }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {a.scenarios.map((s) => (
        <ScenarioCard key={s.key} s={s} recommended={s.key === a.best_scenario} />
      ))}
    </div>
  );
}

function ScenarioCard({ s, recommended }: { s: Scenario; recommended: boolean }) {
  const Icon = SCENARIO_ICON[s.key];
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-5 shadow-soft transition-shadow hover:shadow-lift",
        recommended ? "border-brand-300 bg-brand-50/40 ring-1 ring-brand-200" : "border-ink-200 bg-white",
      )}
    >
      {recommended && (
        <span className="absolute -top-2.5 left-5 chip border-brand-300 bg-brand-600 text-white">
          <Star className="h-3 w-3" /> Рекомендуем
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <div className={cn("grid h-9 w-9 place-items-center rounded-xl", recommended ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500")}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-ink-900">{s.title}</div>
          <div className="text-xs text-ink-400">{s.subtitle}</div>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Платёж в месяц" value={s.monthly_payment > 0 ? rub(s.monthly_payment) : "—"} />
        <Row label="Срок" value={months(s.duration_months)} />
        <Row label="Итого заплатит" value={rub(s.total_pay)} strong />
      </dl>

      <div className="mt-3 border-t border-ink-100 pt-3">
        {s.savings_vs_continue > 0 ? (
          <div className="text-sm font-semibold text-emerald-600">Экономия {rub(s.savings_vs_continue)}</div>
        ) : s.key === "continue" ? (
          <div className="text-sm font-medium text-ink-400">Базовый вариант</div>
        ) : (
          <div className="text-sm font-medium text-ink-400">Без экономии</div>
        )}
        <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{s.note}</p>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className={cn("tabular-nums", strong ? "text-base font-bold text-ink-900" : "font-medium text-ink-700")}>
        {value}
      </dd>
    </div>
  );
}

// ── Таблица решений ──────────────────────────────────────────────
export function DecisionTable({ a }: { a: FinanceAnalysis }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-100 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-ink-700">Таблица решений</h3>
        <p className="text-xs text-ink-400">Прямое сравнение — что показать клиенту</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="px-5 py-2.5 font-medium">Вариант</th>
              <th className="px-5 py-2.5 text-right font-medium">Платёж/мес</th>
              <th className="px-5 py-2.5 text-right font-medium">Срок</th>
              <th className="px-5 py-2.5 text-right font-medium">Итого заплатит</th>
              <th className="px-5 py-2.5 text-right font-medium">Экономия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {a.scenarios.map((s) => {
              const best = s.key === a.best_scenario;
              return (
                <tr key={s.key} className={cn(best && "bg-brand-50/50")}>
                  <td className="px-5 py-3 font-medium text-ink-800">
                    <span className="flex items-center gap-2">
                      {best && <Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />}
                      {s.title}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-700">
                    {s.monthly_payment > 0 ? rub(s.monthly_payment) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-700">{months(s.duration_months)}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink-900">{rub(s.total_pay)}</td>
                  <td className={cn("px-5 py-3 text-right font-semibold tabular-nums",
                    s.savings_vs_continue > 0 ? "text-emerald-600" : "text-ink-300")}>
                    {s.savings_vs_continue > 0 ? rub(s.savings_vs_continue) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Compliance ───────────────────────────────────────────────────
const SEV = {
  high: { chip: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500", label: "Высокий" },
  medium: { chip: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500", label: "Средний" },
  low: { chip: "border-ink-200 bg-ink-50 text-ink-600", dot: "bg-ink-400", label: "Низкий" },
} as const;

export function ComplianceBlock({ flags, score }: { flags: ComplianceFlag[]; score: number }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-600" />
          <h3 className="text-sm font-semibold text-ink-700">Compliance — рисковые сигналы</h3>
        </div>
        <span className={cn("chip", score >= 50 ? SEV.high.chip : score >= 25 ? SEV.medium.chip : SEV.low.chip)}>
          Риск-скор {score}/100
        </span>
      </div>

      {!flags.length ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Явных рисковых признаков не обнаружено.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {flags.map((f) => (
            <li key={f.code} className="rounded-xl border border-ink-100 p-3.5">
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0",
                  f.severity === "high" ? "text-rose-500" : "text-amber-500")} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink-800">{f.title}</span>
                    <span className={cn("chip text-[11px]", SEV[f.severity].chip)}>{SEV[f.severity].label}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">{f.detail}</p>
                  {f.creditors && f.creditors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Array.from(new Set(f.creditors)).map((c) => (
                        <span key={c} className="chip border-ink-200 bg-white text-[11px] text-ink-500">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Договоры ─────────────────────────────────────────────────────
export function ContractsTable({ report }: { report: ExtractedReport }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-100 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-ink-700">Действующие кредитные договоры</h3>
        <p className="text-xs text-ink-400">Распознано ИИ из отчёта · {report.contracts.length} шт.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="px-5 py-2.5 font-medium">Кредитор</th>
              <th className="px-5 py-2.5 text-right font-medium">Долг</th>
              <th className="px-5 py-2.5 text-right font-medium">ПСК</th>
              <th className="px-5 py-2.5 text-right font-medium">Платёж/мес</th>
              <th className="px-5 py-2.5 text-right font-medium">Платежей</th>
              <th className="px-5 py-2.5 text-right font-medium">Выдан</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {report.contracts.map((c, i) => (
              <tr key={i} className="hover:bg-ink-50/50">
                <td className="px-5 py-3">
                  <div className="font-medium text-ink-800">{c.creditor}</div>
                  {c.overdue_debt ? (
                    <div className="text-xs text-rose-500">просрочка {rub(c.overdue_debt)}</div>
                  ) : c.status_text ? (
                    <div className="text-xs text-ink-400">{c.status_text}</div>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink-900">{rub(c.current_debt)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-ink-600">{pct(c.psk_percent)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-ink-600">
                  {c.avg_monthly_payment > 0 ? rub(c.avg_monthly_payment) : "—"}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className={cn(c.payments_made <= 2 && "font-semibold text-rose-500")}>{num(c.payments_made)}</span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-ink-500">{formatDate(c.origination_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
