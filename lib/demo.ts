import type { Application, ApplicationStatus, ExtractedReport } from "./types";
import { analyzeFinance } from "./finance";

// ── Демо-данные ──────────────────────────────────────────────────
// СИНТЕТИЧЕСКИЕ, обезличенные заявки (вымышленные ФИО) — чтобы дашборд
// был «живым» сразу после клонирования, без персональных данных.
// Реальные отчёты из «данные для ДЗ» распознаются живым Gemini и
// хранятся локально в data/ (в git не попадают).

function report(data: Partial<ExtractedReport> & { borrower_name: string }): ExtractedReport {
  return {
    bureau: "Кредистори / ОКБ",
    total_debt: (data.contracts || []).reduce((s, c) => s + c.current_debt, 0),
    overdue_debt: 0,
    contracts: [],
    ...data,
  };
}

const R_DEMO: { report: ExtractedReport; status: ApplicationStatus; daysAgo: number; manager: string }[] = [
  {
    manager: "Анна",
    status: "won",
    daysAgo: 21,
    report: report({
      borrower_name: "Демидов Игорь Петрович",
      birth_date: "1979-03-14",
      inn: "770000000001",
      report_date: "2026-06-20",
      credit_rating: 612,
      contracts: [
        { creditor: "Банк «Восток»", loan_sum: 450000, current_debt: 421000, overdue_debt: 18000, psk_percent: 41.2, avg_monthly_payment: 17800, origination_date: "2025-02-10", end_date: "9999-12-31", total_paid: 92000, total_paid_principal: 29000, total_paid_interest: 63000, payments_made: 9, status_text: "Просрочка 1–30 дней" },
        { creditor: "МФО «БыстроДеньги»", loan_sum: 90000, current_debt: 88000, overdue_debt: 0, psk_percent: 292, avg_monthly_payment: 9000, origination_date: "2025-02-12", end_date: "9999-12-31", total_paid: 6000, total_paid_principal: 2000, total_paid_interest: 4000, payments_made: 1, status_text: "Действующий" },
        { creditor: "Банк «Столица»", loan_sum: 300000, current_debt: 275000, overdue_debt: 0, psk_percent: 33.5, avg_monthly_payment: 11200, origination_date: "2024-08-01", end_date: "2029-08-01", total_paid: 140000, total_paid_principal: 25000, total_paid_interest: 115000, payments_made: 12, status_text: "Действующий" },
      ],
    }),
  },
  {
    manager: "Сергей",
    status: "offer_sent",
    daysAgo: 4,
    report: report({
      borrower_name: "Королёва Наталья Сергеевна",
      birth_date: "1985-11-02",
      inn: "500000000002",
      report_date: "2026-07-05",
      credit_rating: 705,
      contracts: [
        { creditor: "Банк «Прогресс»", loan_sum: 700000, current_debt: 690000, overdue_debt: 0, psk_percent: 28.9, avg_monthly_payment: 21000, origination_date: "2025-06-01", end_date: "2030-06-01", total_paid: 84000, total_paid_principal: 10000, total_paid_interest: 74000, payments_made: 4, status_text: "Действующий" },
        { creditor: "МФО «Займер»", loan_sum: 120000, current_debt: 120000, overdue_debt: 0, psk_percent: 315, avg_monthly_payment: 0, origination_date: "2025-06-03", end_date: "9999-12-31", total_paid: 0, total_paid_principal: 0, total_paid_interest: 0, payments_made: 0, status_text: "Действующий" },
      ],
    }),
  },
  {
    manager: "Анна",
    status: "in_review",
    daysAgo: 2,
    report: report({
      borrower_name: "Абдулов Тимур Русланович",
      birth_date: "1990-07-19",
      inn: "160000000003",
      report_date: "2026-07-09",
      credit_rating: 528,
      contracts: [
        { creditor: "Банк «Восток»", loan_sum: 250000, current_debt: 240000, overdue_debt: 12000, psk_percent: 44.1, avg_monthly_payment: 10500, origination_date: "2025-05-20", end_date: "9999-12-31", total_paid: 31000, total_paid_principal: 10000, total_paid_interest: 21000, payments_made: 3, status_text: "Просрочка 1–30 дней" },
        { creditor: "МФО «Турбозайм»", loan_sum: 60000, current_debt: 60000, overdue_debt: 8000, psk_percent: 328, avg_monthly_payment: 6000, origination_date: "2025-05-22", end_date: "9999-12-31", total_paid: 3000, total_paid_principal: 500, total_paid_interest: 2500, payments_made: 1, status_text: "Просрочка" },
      ],
    }),
  },
  {
    manager: "Сергей",
    status: "bankruptcy",
    daysAgo: 9,
    report: report({
      borrower_name: "Панкратова Ольга Ивановна",
      birth_date: "1968-01-25",
      inn: "770000000004",
      report_date: "2026-07-01",
      credit_rating: 470,
      contracts: [
        { creditor: "Банк «Столица»", loan_sum: 900000, current_debt: 870000, overdue_debt: 95000, psk_percent: 36.7, avg_monthly_payment: 28000, origination_date: "2023-11-10", end_date: "2028-11-10", total_paid: 410000, total_paid_principal: 30000, total_paid_interest: 380000, payments_made: 15, status_text: "Просрочка 30–60 дней" },
        { creditor: "Банк «Прогресс»", loan_sum: 350000, current_debt: 340000, overdue_debt: 40000, psk_percent: 39.9, avg_monthly_payment: 13000, origination_date: "2024-03-01", end_date: "9999-12-31", total_paid: 78000, total_paid_principal: 10000, total_paid_interest: 68000, payments_made: 6, status_text: "Просрочка" },
      ],
    }),
  },
  {
    manager: "Анна",
    status: "new",
    daysAgo: 0,
    report: report({
      borrower_name: "Ершов Виктор Андреевич",
      birth_date: "1993-09-08",
      inn: "230000000005",
      report_date: "2026-07-12",
      credit_rating: 690,
      contracts: [
        { creditor: "Банк «Прогресс»", loan_sum: 200000, current_debt: 150000, overdue_debt: 0, psk_percent: 24.5, avg_monthly_payment: 8000, origination_date: "2024-01-15", end_date: "2027-01-15", total_paid: 96000, total_paid_principal: 50000, total_paid_interest: 46000, payments_made: 18, status_text: "Действующий" },
      ],
    }),
  },
  {
    manager: "Сергей",
    status: "lost",
    daysAgo: 14,
    report: report({
      borrower_name: "Гаврилов Пётр Максимович",
      birth_date: "1982-05-30",
      inn: "660000000006",
      report_date: "2026-06-25",
      credit_rating: 640,
      contracts: [
        { creditor: "Банк «Восток»", loan_sum: 180000, current_debt: 120000, overdue_debt: 0, psk_percent: 22.0, avg_monthly_payment: 7500, origination_date: "2023-09-01", end_date: "2026-09-01", total_paid: 130000, total_paid_principal: 60000, total_paid_interest: 70000, payments_made: 22, status_text: "Действующий" },
      ],
    }),
  },
];

function iso(daysAgo: number): string {
  const d = new Date("2026-07-12T10:00:00Z");
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export function buildDemoApplications(): Application[] {
  return R_DEMO.map((d, i) => {
    const createdAt = iso(d.daysAgo);
    const analysis = analyzeFinance(d.report);
    return {
      id: `demo${i + 1}`,
      createdAt,
      updatedAt: createdAt,
      status: d.status,
      source: "demo",
      fileName: `demo_${i + 1}.pdf`,
      manager: d.manager,
      report: d.report,
      analysis,
      history: [
        { at: createdAt, type: "created", note: "Демо-заявка (обезличенные данные)" },
        ...(d.status !== "new"
          ? [{ at: createdAt, type: "status_changed" as const, from: "new" as ApplicationStatus, to: d.status }]
          : []),
      ],
    };
  });
}
