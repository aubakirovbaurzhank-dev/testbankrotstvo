import type { Application, ApplicationStatus } from "./types";
import { STATUS_ORDER } from "./types";

export interface Analytics {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  won: number;
  lost: number;
  inWork: number;
  conversion: number;          // won / total
  totalDebtAnalyzed: number;
  potentialSavings: number;    // сумма экономии по лучшему сценарию
  burnedInterest: number;      // сколько клиенты уже отдали в проценты
  avgDebt: number;
  highRisk: number;            // заявки с compliance-риском high
  trend: { date: string; count: number }[];
  recommend: Record<string, number>; // распределение рекомендованных сценариев
}

export function computeAnalytics(apps: Application[]): Analytics {
  const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<
    ApplicationStatus,
    number
  >;

  let totalDebt = 0;
  let savings = 0;
  let burned = 0;
  let highRisk = 0;
  const recommend: Record<string, number> = { continue: 0, bankruptcy: 0, restructuring: 0 };
  const byDay: Record<string, number> = {};

  for (const a of apps) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    totalDebt += a.analysis.total_current_debt || 0;
    burned += a.analysis.paid.paid_interest || 0;
    const best = a.analysis.scenarios.find((s) => s.key === a.analysis.best_scenario);
    if (best && best.savings_vs_continue > 0) savings += best.savings_vs_continue;
    recommend[a.analysis.best_scenario] = (recommend[a.analysis.best_scenario] || 0) + 1;
    if (a.analysis.compliance.some((f) => f.severity === "high")) highRisk++;
    const day = (a.createdAt || "").slice(0, 10);
    if (day) byDay[day] = (byDay[day] || 0) + 1;
  }

  const won = byStatus.won || 0;
  const lost = byStatus.lost || 0;
  const inWork = (byStatus.in_review || 0) + (byStatus.offer_sent || 0) +
    (byStatus.bankruptcy || 0) + (byStatus.restructuring || 0);

  const trend = Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  return {
    total: apps.length,
    byStatus,
    won,
    lost,
    inWork,
    conversion: apps.length ? won / apps.length : 0,
    totalDebtAnalyzed: totalDebt,
    potentialSavings: savings,
    burnedInterest: burned,
    avgDebt: apps.length ? totalDebt / apps.length : 0,
    highRisk,
    trend,
    recommend,
  };
}
