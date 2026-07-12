import Link from "next/link";
import {
  FilePlus2,
  Wallet,
  TrendingUp,
  PiggyBank,
  ShieldAlert,
  Flame,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { listApplications } from "@/lib/store";
import { computeAnalytics } from "@/lib/analytics";
import { Stat } from "@/components/Stat";
import { StatusBadge } from "@/components/StatusBadge";
import { FunnelChart, RecommendPie, TrendChart, LegendRow } from "@/components/DashboardCharts";
import { rub, rubShort, pct, formatDate, plural } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const apps = listApplications();
  const a = computeAnalytics(apps);
  const recent = apps.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Аналитика</h1>
          <p className="mt-1 text-sm text-ink-500">
            Полная картина по всем заявкам: воронка, суммы и рекомендации ИИ.
          </p>
        </div>
        <Link href="/new" className="btn-primary">
          <FilePlus2 className="h-4 w-4" />
          Новая заявка
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Всего заявок" value={a.total} icon={Wallet} tone="brand"
          hint={`${a.inWork} ${plural(a.inWork, "в работе", "в работе", "в работе")}`} />
        <Stat label="Закрыто успешно" value={a.won} icon={Trophy} tone="emerald"
          hint={`Конверсия ${pct(a.conversion * 100)}`} />
        <Stat label="Экономия клиентам" value={rubShort(a.potentialSavings)} icon={PiggyBank} tone="emerald"
          hint="по лучшему сценарию" />
        <Stat label="Долгов проанализировано" value={rubShort(a.totalDebtAnalyzed)} icon={TrendingUp} tone="default"
          hint={`в среднем ${rubShort(a.avgDebt)} на клиента`} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Отдано в проценты" value={rubShort(a.burnedInterest)} icon={Flame} tone="amber"
          hint="клиенты уже переплатили банкам" />
        <Stat label="Высокий риск" value={a.highRisk} icon={ShieldAlert} tone="rose"
          hint="заявок с compliance-сигналами" />
        <Stat label="Отказов" value={a.lost} tone="rose" hint="клиент не пошёл в сделку" />
        <Stat label="В работе" value={a.inWork} tone="brand" hint="активные заявки менеджеров" />
      </div>

      {/* Графики */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Воронка по статусам</h2>
          <FunnelChart byStatus={a.byStatus} />
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Что рекомендует ИИ</h2>
          <RecommendPie recommend={a.recommend} />
          <LegendRow recommend={a.recommend} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-ink-700">Поступление заявок</h2>
          <TrendChart trend={a.trend} />
        </div>

        {/* Последние заявки */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-700">Последние заявки</h2>
            <Link href="/applications" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              все →
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2.5 hover:border-brand-200 hover:bg-brand-50/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink-800">{app.report.borrower_name}</div>
                  <div className="text-xs text-ink-400">
                    {rub(app.analysis.total_current_debt)} · {formatDate(app.createdAt)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={app.status} />
                  <ArrowRight className="h-4 w-4 text-ink-300 group-hover:text-brand-500" />
                </div>
              </Link>
            ))}
            {!recent.length && <div className="py-6 text-center text-sm text-ink-400">Пока нет заявок</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
