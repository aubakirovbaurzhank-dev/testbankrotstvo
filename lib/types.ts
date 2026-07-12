// ── Доменные типы системы анализа кредитных отчётов ──────────────

/** Один кредитный договор, извлечённый ИИ из PDF-отчёта. */
export interface Contract {
  creditor: string;            // Кредитор (банк/МФО)
  loan_type?: string;          // Вид займа
  loan_sum: number;            // Сумма займа / кредитный лимит, ₽
  current_debt: number;        // Текущая общая задолженность, ₽
  overdue_debt?: number;       // Просроченная задолженность, ₽
  psk_percent: number;         // ПСК — полная стоимость кредита, % годовых
  avg_monthly_payment: number; // Величина среднемесячного платежа, ₽
  origination_date: string;    // Дата возникновения обязательства (ISO YYYY-MM-DD)
  end_date: string;            // Дата прекращения (ISO; 9999-12-31 = бессрочно)
  total_paid?: number;         // Всего внесено платежей, ₽
  total_paid_principal: number;// Внесено в счёт основного долга, ₽
  total_paid_interest: number; // Внесено в счёт процентов, ₽
  payments_made: number;       // Количество фактических платежей
  status_text?: string;        // Статус платежа из отчёта
}

/** Отчёт целиком после распознавания ИИ. */
export interface ExtractedReport {
  borrower_name: string;
  birth_date?: string;
  inn?: string;
  report_date?: string;
  bureau?: string;             // Бюро (Кредистори / ОКБ / НБКИ)
  total_debt: number;
  overdue_debt?: number;
  credit_rating?: number;
  contracts: Contract[];
}

/** Один сценарий погашения для таблицы решений. */
export interface Scenario {
  key: "continue" | "bankruptcy" | "restructuring";
  title: string;
  subtitle: string;
  monthly_payment: number;     // Платёж в месяц, ₽
  duration_months: number;     // Срок, мес
  total_pay: number;           // Итого клиент заплатит, ₽
  service_cost?: number;       // Стоимость услуги, ₽ (для БФЛ/РДГ)
  interest_pay?: number;       // Из них проценты/переплата, ₽
  savings_vs_continue: number; // Экономия относительно «платить банкам», ₽
  note: string;                // Пояснение простым языком
  recommended?: boolean;
}

export type ComplianceSeverity = "high" | "medium" | "low";

export interface ComplianceFlag {
  code: string;
  severity: ComplianceSeverity;
  title: string;
  detail: string;
  creditors?: string[];
}

/** Уже выплачено — сколько ушло в основной долг, сколько «сгорело» в процентах. */
export interface PaidBreakdown {
  total_paid: number;
  paid_principal: number;
  paid_interest: number;
  interest_share: number; // доля процентов в выплатах, 0..1
}

/** Полный результат финансового анализа отчёта. */
export interface FinanceAnalysis {
  total_current_debt: number;
  total_loan_sum: number;
  active_contracts: number;
  paid: PaidBreakdown;
  scenarios: Scenario[];       // [continue, bankruptcy, restructuring]
  best_scenario: Scenario["key"];
  mfc_eligible: boolean;       // подходит ли под бесплатное банкротство через МФЦ
  compliance: ComplianceFlag[];
  compliance_score: number;    // 0..100, чем выше — тем рискованнее профиль
  headline: string;            // Короткий вывод-«крючок» для менеджера
}

export type ApplicationStatus =
  | "new"           // Новая — отчёт загружен
  | "in_review"     // В работе — менеджер изучает
  | "offer_sent"    // Предложение отправлено клиенту
  | "bankruptcy"    // Оформляем банкротство
  | "restructuring" // Оформляем реструктуризацию
  | "won"           // Закрыта — услуга оказана
  | "lost";         // Отказ клиента

export interface AuditEvent {
  at: string;                  // ISO datetime
  type: "created" | "status_changed" | "note" | "reanalyzed" | "chat";
  from?: ApplicationStatus;
  to?: ApplicationStatus;
  note?: string;
}

export interface Application {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ApplicationStatus;
  source: "live" | "demo";     // распознано живым Gemini или демо-данные
  fileName: string;
  manager?: string;
  report: ExtractedReport;
  analysis: FinanceAnalysis;
  history: AuditEvent[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; color: string; dot: string }
> = {
  new: { label: "Новая", color: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  in_review: { label: "В работе", color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  offer_sent: { label: "Предложение отправлено", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  bankruptcy: { label: "Банкротство", color: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  restructuring: { label: "Реструктуризация", color: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  won: { label: "Закрыта — успех", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  lost: { label: "Отказ", color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "new", "in_review", "offer_sent", "bankruptcy", "restructuring", "won", "lost",
];
