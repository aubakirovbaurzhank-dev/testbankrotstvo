import type {
  Contract,
  ExtractedReport,
  FinanceAnalysis,
  Scenario,
  ComplianceFlag,
  PaidBreakdown,
} from "./types";

// Бизнес-параметры (можно переопределить в .env.local)
const BANKRUPTCY_COST = Number(process.env.BANKRUPTCY_COST || 200_000);
const RESTRUCTURING_COST = Number(process.env.RESTRUCTURING_COST || 150_000);

// Горизонты по умолчанию, когда в отчёте нет графика платежей.
const DEFAULT_TERM_MONTHS = 36;      // типичный срок для оценки бессрочных линий
const RESTRUCTURING_TERM = 36;       // срок графика при реструктуризации
const BANKRUPTCY_DURATION = 6;       // типичная длительность процедуры, мес
const MAX_TERM_CAP = 600;            // предохранитель от «вечных» кредитов

function monthsBetween(fromISO: string | undefined, toISO: string | undefined): number | null {
  if (!fromISO || !toISO || toISO.startsWith("9999")) return null;
  const a = new Date(fromISO);
  const b = new Date(toISO);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}

/** Аннуитетный платёж для суммы B под ставку r/мес на n месяцев. */
function annuityPayment(B: number, rMonthly: number, n: number): number {
  if (n <= 0) return B;
  if (rMonthly <= 0) return B / n;
  const k = Math.pow(1 + rMonthly, n);
  return (B * rMonthly * k) / (k - 1);
}

/**
 * Прогноз «если продолжать платить банку» по одному договору.
 * Возвращает срок до погашения, ежемесячный платёж и итоговую сумму выплат.
 */
function projectContract(c: Contract, now: Date): {
  monthly: number;
  months: number;
  total: number;
  interest: number;
} {
  const balance = Math.max(0, c.current_debt || 0);
  if (balance <= 0) return { monthly: 0, months: 0, total: 0, interest: 0 };

  const rMonthly = Math.max(0, (c.psk_percent || 0) / 100 / 12);
  const termToEnd = monthsBetween(now.toISOString().slice(0, 10), c.end_date);

  let monthly = c.avg_monthly_payment || 0;
  let n: number;

  const coversInterest = monthly > balance * rMonthly + 1;

  if (monthly > 0 && coversInterest) {
    // Классическая амортизация: сколько месяцев до нуля при текущем платеже.
    if (rMonthly > 0) {
      n = Math.ceil(-Math.log(1 - (balance * rMonthly) / monthly) / Math.log(1 + rMonthly));
    } else {
      n = Math.ceil(balance / monthly);
    }
    n = Math.min(n, MAX_TERM_CAP);
    if (termToEnd && termToEnd > 0) n = Math.min(n, termToEnd);
  } else {
    // Нет графика / револьверная линия / платёж не покрывает проценты:
    // оцениваем через аннуитет на разумный горизонт.
    n = termToEnd && termToEnd > 0 && termToEnd <= 120 ? termToEnd : DEFAULT_TERM_MONTHS;
    monthly = annuityPayment(balance, rMonthly, n);
  }

  const total = monthly * n;
  const interest = Math.max(0, total - balance);
  return { monthly, months: n, total, interest };
}

function paidBreakdown(report: ExtractedReport): PaidBreakdown {
  let principal = 0;
  let interest = 0;
  let total = 0;
  for (const c of report.contracts) {
    principal += c.total_paid_principal || 0;
    interest += c.total_paid_interest || 0;
    total += c.total_paid ?? (c.total_paid_principal || 0) + (c.total_paid_interest || 0);
  }
  const share = total > 0 ? interest / total : 0;
  return { total_paid: total, paid_principal: principal, paid_interest: interest, interest_share: share };
}

// ── Compliance: рисковые индикаторы ──────────────────────────────

function buildCompliance(report: ExtractedReport): { flags: ComplianceFlag[]; score: number } {
  const flags: ComplianceFlag[] = [];
  const active = report.contracts;

  // 1) Кредиты с 0–2 платежами (почти нет истории погашения).
  const lowPay = active.filter((c) => (c.payments_made ?? 0) <= 2 && (c.current_debt || 0) > 0);
  if (lowPay.length) {
    flags.push({
      code: "few_payments",
      severity: "high",
      title: `${lowPay.length} ${lowPay.length === 1 ? "кредит" : "кредита(ов)"} с 0–2 платежами`,
      detail:
        "По этим договорам внесено не более двух платежей. Это классический признак преднамеренного набора долгов перед банкротством — обязательно проверьте и учтите в стратегии.",
      creditors: lowPay.map((c) => c.creditor),
    });
  }

  // 2) Несколько кредитов, оформленных в течение ≤4 дней.
  const dated = active
    .map((c) => ({ c, t: Date.parse(c.origination_date) }))
    .filter((x) => !isNaN(x.t))
    .sort((a, b) => a.t - b.t);
  const clustered: string[] = [];
  for (let i = 1; i < dated.length; i++) {
    const days = (dated[i].t - dated[i - 1].t) / 86_400_000;
    if (days <= 4) {
      clustered.push(dated[i - 1].c.creditor, dated[i].c.creditor);
    }
  }
  if (clustered.length) {
    flags.push({
      code: "rapid_origination",
      severity: "high",
      title: "Кредиты оформлены в течение 4 дней",
      detail:
        "Несколько займов открыты почти одновременно (интервал ≤ 4 дней). Часто указывает на «веерное» кредитование — важный сигнал для compliance и для суда.",
      creditors: Array.from(new Set(clustered)),
    });
  }

  // 3) Крупный долг при минимальной истории платежей.
  const bigLowHistory = active.filter(
    (c) => (c.loan_sum || 0) >= 100_000 && (c.payments_made ?? 0) <= 3 && (c.current_debt || 0) > 0,
  );
  if (bigLowHistory.length) {
    flags.push({
      code: "big_debt_low_history",
      severity: "medium",
      title: "Крупные займы с короткой историей",
      detail:
        "Займы от 100 000 ₽ с тремя и менее платежами. Большой остаток долга при почти нулевой истории — повод присмотреться к обоснованности выдачи.",
      creditors: bigLowHistory.map((c) => c.creditor),
    });
  }

  // 4) Есть просрочка.
  const overdue = active.filter((c) => (c.overdue_debt || 0) > 0);
  if (overdue.length) {
    flags.push({
      code: "overdue",
      severity: "medium",
      title: `Просрочка по ${overdue.length} ${overdue.length === 1 ? "договору" : "договорам"}`,
      detail: "По этим договорам есть текущая просроченная задолженность — растут пени и риск передачи в суд/ЧСИ.",
      creditors: overdue.map((c) => c.creditor),
    });
  }

  const weight: Record<string, number> = { high: 34, medium: 18, low: 8 };
  const score = Math.min(100, flags.reduce((s, f) => s + (weight[f.severity] || 0), 0));
  return { flags, score };
}

// ── Главная функция анализа ──────────────────────────────────────

export function analyzeFinance(report: ExtractedReport): FinanceAnalysis {
  const now = new Date();
  const active = report.contracts.filter((c) => (c.current_debt || 0) > 0);

  const totalDebt = active.reduce((s, c) => s + (c.current_debt || 0), 0);
  const totalLoanSum = report.contracts.reduce((s, c) => s + (c.loan_sum || 0), 0);
  const paid = paidBreakdown(report);

  // Сценарий A — продолжать платить банкам.
  let monthlyTotal = 0;
  let durationMax = 0;
  let continueTotal = 0;
  let continueInterest = 0;
  for (const c of active) {
    const p = projectContract(c, now);
    monthlyTotal += p.monthly;
    durationMax = Math.max(durationMax, p.months);
    continueTotal += p.total;
    continueInterest += p.interest;
  }

  const continueScenario: Scenario = {
    key: "continue",
    title: "Продолжать платить банкам",
    subtitle: "Ничего не меняем",
    monthly_payment: monthlyTotal,
    duration_months: durationMax,
    total_pay: continueTotal,
    interest_pay: continueInterest,
    savings_vs_continue: 0,
    note:
      continueInterest > 0
        ? `Клиент отдаст банкам ещё ${Math.round(continueTotal).toLocaleString("ru-RU")} ₽, из них ${Math.round(continueInterest).toLocaleString("ru-RU")} ₽ — только проценты.`
        : "Текущий график без изменений.",
  };

  // Сценарий B — банкротство физлица (БФЛ).
  const bankruptcyScenario: Scenario = {
    key: "bankruptcy",
    title: "Банкротство физлица",
    subtitle: "Списание долгов «под ключ»",
    monthly_payment: Math.round(BANKRUPTCY_COST / BANKRUPTCY_DURATION),
    duration_months: BANKRUPTCY_DURATION,
    total_pay: BANKRUPTCY_COST,
    service_cost: BANKRUPTCY_COST,
    savings_vs_continue: continueTotal - BANKRUPTCY_COST,
    note: `Долг ${Math.round(totalDebt).toLocaleString("ru-RU")} ₽ списывается. Клиент платит только за процедуру — фиксированные ${BANKRUPTCY_COST.toLocaleString("ru-RU")} ₽ (возможна рассрочка).`,
  };

  // Сценарий C — реструктуризация (РДГ): проценты замораживаются, платим тело + услугу.
  const restructTotal = totalDebt + RESTRUCTURING_COST;
  const restructScenario: Scenario = {
    key: "restructuring",
    title: "Реструктуризация долга",
    subtitle: "Единый график без процентов",
    monthly_payment: Math.round(restructTotal / RESTRUCTURING_TERM),
    duration_months: RESTRUCTURING_TERM,
    total_pay: restructTotal,
    service_cost: RESTRUCTURING_COST,
    savings_vs_continue: continueTotal - restructTotal,
    note: `Проценты и пени замораживаются. Клиент гасит тело долга ${Math.round(totalDebt).toLocaleString("ru-RU")} ₽ по единому графику + услуга ${RESTRUCTURING_COST.toLocaleString("ru-RU")} ₽.`,
  };

  const scenarios = [continueScenario, bankruptcyScenario, restructScenario];

  // Лучший сценарий — максимальная экономия для клиента.
  let best: Scenario = bankruptcyScenario;
  for (const s of scenarios) if (s.savings_vs_continue > best.savings_vs_continue) best = s;
  best.recommended = true;

  const { flags, score } = buildCompliance(report);

  const headline = buildHeadline(report, paid, continueScenario, best);

  return {
    total_current_debt: totalDebt,
    total_loan_sum: totalLoanSum,
    active_contracts: active.length,
    paid,
    scenarios,
    best_scenario: best.key,
    compliance: flags,
    compliance_score: score,
    headline,
  };
}

function buildHeadline(
  report: ExtractedReport,
  paid: PaidBreakdown,
  cont: Scenario,
  best: Scenario,
): string {
  const name = report.borrower_name?.split(" ")[0] || "Клиент";
  if (best.key !== "continue" && best.savings_vs_continue > 0) {
    return `${name} может сэкономить до ${Math.round(best.savings_vs_continue).toLocaleString("ru-RU")} ₽ — вариант «${best.title}» выгоднее, чем продолжать платить банкам.`;
  }
  if (paid.interest_share > 0.5) {
    return `Больше половины всех платежей клиента (${Math.round(paid.interest_share * 100)}%) ушло в проценты, а не в погашение долга.`;
  }
  return `Итоговая переплата по текущему графику — ${Math.round(cont.interest_pay || 0).toLocaleString("ru-RU")} ₽ процентов.`;
}
