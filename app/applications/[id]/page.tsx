import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  CreditCard,
  ShieldAlert,
  CircleUser,
  History,
  Sparkles,
} from "lucide-react";
import { getApplication } from "@/lib/store";
import { isLiveMode } from "@/lib/gemini";
import { Stat } from "@/components/Stat";
import { StatusControl } from "@/components/StatusControl";
import { ChatPanel } from "@/components/ChatPanel";
import {
  PaidBreakdownCard,
  ScenarioCards,
  DecisionTable,
  ComplianceBlock,
  ContractsTable,
} from "@/components/analysis";
import { rub, formatDate, formatDateTime } from "@/lib/format";
import { STATUS_META } from "@/lib/types";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  created: "Заявка создана",
  status_changed: "Смена статуса",
  note: "Заметка",
  reanalyzed: "Повторный анализ",
  chat: "Диалог с ИИ",
};

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = getApplication(id);
  if (!app) notFound();
  const { report, analysis } = app;
  const live = isLiveMode();

  return (
    <div className="space-y-6">
      <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Все заявки
      </Link>

      {/* Шапка */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <CircleUser className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink-900">{report.borrower_name}</h1>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-400">
                {report.birth_date && <span>д.р. {formatDate(report.birth_date)}</span>}
                {report.inn && <span>ИНН {report.inn}</span>}
                {report.report_date && <span>отчёт от {formatDate(report.report_date)}</span>}
                {report.credit_rating != null && <span>рейтинг {report.credit_rating}</span>}
                <span>{report.bureau}</span>
              </div>
            </div>
          </div>
          <StatusControl id={app.id} current={app.status} />
        </div>

        {/* Крючок для менеджера */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-gradient-to-r from-brand-50 to-teal-50 px-4 py-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p className="text-sm font-medium text-ink-700">{analysis.headline}</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Общий долг" value={rub(analysis.total_current_debt)} icon={Wallet} tone="brand" />
        <Stat label="Уже выплачено" value={rub(analysis.paid.total_paid)} icon={CreditCard} tone="default"
          hint={`${Math.round(analysis.paid.interest_share * 100)}% ушло в проценты`} />
        <Stat label="Действующих кредитов" value={analysis.active_contracts} icon={CreditCard} tone="default" />
        <Stat label="Compliance-риск" value={`${analysis.compliance_score}/100`} icon={ShieldAlert}
          tone={analysis.compliance_score >= 50 ? "rose" : analysis.compliance_score >= 25 ? "amber" : "emerald"}
          hint={`${analysis.compliance.length} сигнал(ов)`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Основное */}
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-ink-700">Сравнение сценариев</h2>
            <ScenarioCards a={analysis} />
          </section>
          <DecisionTable a={analysis} />
          <div className="grid gap-6 md:grid-cols-2">
            <PaidBreakdownCard a={analysis} />
            <ComplianceBlock flags={analysis.compliance} score={analysis.compliance_score} />
          </div>
          <ContractsTable report={report} />
        </div>

        {/* Сайдбар: ассистент + аудит */}
        <div className="space-y-6">
          <div className="lg:sticky lg:top-6">
            <ChatPanel
              applicationId={app.id}
              live={live}
              minHeight={360}
              intro={`Я помогу по заявке **${report.borrower_name.split(" ")[0]}**. Спросите про сценарии, риски или как объяснить выгоду клиенту.`}
              suggestions={[
                "Что предложить этому клиенту?",
                "Какой вариант выгоднее и почему?",
                "На что обратить внимание в compliance?",
              ]}
            />
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-ink-400" />
              <h3 className="text-sm font-semibold text-ink-700">Аудит заявки</h3>
            </div>
            <ol className="space-y-3">
              {app.history.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-1 flex flex-col items-center">
                    <span className="h-2 w-2 rounded-full bg-brand-400" />
                    {i < app.history.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-ink-100" />}
                  </div>
                  <div className="pb-1">
                    <div className="text-sm font-medium text-ink-700">
                      {EVENT_LABEL[e.type] || e.type}
                      {e.type === "status_changed" && e.to && (
                        <span className="text-ink-400"> → {STATUS_META[e.to].label}</span>
                      )}
                    </div>
                    {e.note && <div className="text-xs text-ink-500">{e.note}</div>}
                    <div className="text-xs text-ink-300">{formatDateTime(e.at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
