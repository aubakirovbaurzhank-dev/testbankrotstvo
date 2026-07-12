/**
 * Аудит финансовых расчётов: независимая проверка lib/finance.ts.
 * Запуск: node --experimental-strip-types scripts/verify-finance.ts
 *
 * Проверяем расчёт сценариев на канонических кейсах: результат сверяем с
 * НЕЗАВИСИМОЙ помесячной амортизацией и с проверкой инвариантов
 * (никаких NaN/Infinity, корректные знаки экономии, честный платёж).
 */
import { analyzeFinance } from "../lib/finance.ts";
import type { Contract, ExtractedReport } from "../lib/types.ts";

let fails = 0;
function check(name: string, cond: boolean, detail = "") {
  const ok = cond;
  if (!ok) fails++;
  console.log(`${ok ? "✅" : "❌"} ${name}${ok ? "" : "  <-- " + detail}`);
}
const approx = (a: number, b: number, tol = 2) => Math.abs(a - b) <= tol;
const finite = (x: number) => Number.isFinite(x);

// Независимая помесячная амортизация (эталон).
function refAmortize(balance: number, rMonthly: number, pay: number, cap: number) {
  let bal = balance, total = 0, interest = 0, months = 0;
  while (bal > 0.005 && months < cap) {
    const i = bal * rMonthly;
    let p = pay;
    if (p >= bal + i) p = bal + i;
    bal = bal + i - p;
    total += p; interest += i; months++;
  }
  return { months, total, interest, remaining: Math.max(0, bal) };
}

function makeContract(o: Partial<Contract>): Contract {
  return {
    creditor: o.creditor ?? "Тест-Банк",
    loan_sum: o.loan_sum ?? o.current_debt ?? 0,
    current_debt: o.current_debt ?? 0,
    overdue_debt: o.overdue_debt ?? 0,
    psk_percent: o.psk_percent ?? 0,
    avg_monthly_payment: o.avg_monthly_payment ?? 0,
    origination_date: o.origination_date ?? "2024-01-01",
    end_date: o.end_date ?? "9999-12-31",
    total_paid_principal: o.total_paid_principal ?? 0,
    total_paid_interest: o.total_paid_interest ?? 0,
    payments_made: o.payments_made ?? 12,
  };
}
function report(contracts: Contract[]): ExtractedReport {
  return { borrower_name: "Тест", total_debt: contracts.reduce((s, c) => s + c.current_debt, 0), contracts };
}
const cont = (a: ReturnType<typeof analyzeFinance>) => a.scenarios.find((s) => s.key === "continue")!;
const bankr = (a: ReturnType<typeof analyzeFinance>) => a.scenarios.find((s) => s.key === "bankruptcy")!;

console.log("\n── Кейс A: обычный амортизируемый кредит ──");
{
  const c = makeContract({ current_debt: 100000, psk_percent: 12, avg_monthly_payment: 10000 });
  const a = analyzeFinance(report([c]));
  const ref = refAmortize(100000, 0.12 / 12, 10000, 600);
  const s = cont(a);
  check("платёж = реальный (10000)", s.monthly_payment === 10000, `got ${s.monthly_payment}`);
  check("итог совпал с эталоном", approx(s.total_pay, ref.total), `got ${s.total_pay} vs ${ref.total}`);
  check("проценты совпали с эталоном", approx(s.interest_pay!, ref.interest), `got ${s.interest_pay} vs ${ref.interest}`);
  check("срок совпал с эталоном", s.duration_months === ref.months, `got ${s.duration_months} vs ${ref.months}`);
  check("проценты > 0", s.interest_pay! > 0);
  check("экономия банкротства = итог - 200000", approx(bankr(a).savings_vs_continue, s.total_pay - 200000));
}

console.log("\n── Кейс B: револьверная линия (платёж 0) → аннуитет 36 мес ──");
{
  const c = makeContract({ current_debt: 100000, psk_percent: 24, avg_monthly_payment: 0 });
  const a = analyzeFinance(report([c]));
  const r = 0.24 / 12;
  const k = Math.pow(1 + r, 36);
  const expMonthly = (100000 * r * k) / (k - 1);
  const s = cont(a);
  check("срок = 36 мес", s.duration_months === 36, `got ${s.duration_months}`);
  check("платёж = аннуитет", approx(s.monthly_payment, expMonthly, 1), `got ${s.monthly_payment} vs ${expMonthly.toFixed(2)}`);
  check("итог = платёж*36", approx(s.total_pay, expMonthly * 36, 2));
  check("проценты = итог - долг", approx(s.interest_pay!, expMonthly * 36 - 100000, 2));
}

console.log("\n── Кейс C: долговая яма (платёж < процентов) ──");
{
  const c = makeContract({ current_debt: 100000, psk_percent: 120, avg_monthly_payment: 5000 }); // i=10000/мес > 5000
  const a = analyzeFinance(report([c]));
  const s = cont(a);
  check("платёж = реальный (5000)", s.monthly_payment === 5000, `got ${s.monthly_payment}`);
  check("срок = 60 мес (горизонт)", s.duration_months === 60, `got ${s.duration_months}`);
  check("итог = 5000*60 = 300000", s.total_pay === 300000, `got ${s.total_pay}`);
  check("почти всё — проценты", s.interest_pay === 300000, `got ${s.interest_pay}`);
}

console.log("\n── Кейс D: срок ограничен датой договора (тест на баг interest=0) ──");
{
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 24, now.getDate());
  const endISO = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  const c = makeContract({ current_debt: 100000, psk_percent: 12, avg_monthly_payment: 2000, end_date: endISO });
  const a = analyzeFinance(report([c]));
  const ref = refAmortize(100000, 0.01, 2000, 24);
  const s = cont(a);
  check("срок ограничен ~24 мес", s.duration_months! <= 24 && s.duration_months! >= 23, `got ${s.duration_months}`);
  check("проценты НЕ равны 0 (баг исправлен)", s.interest_pay! > 0, `got ${s.interest_pay}`);
  check("проценты совпали с эталоном", approx(s.interest_pay!, ref.interest, 5), `got ${s.interest_pay} vs ${ref.interest}`);
  check("итог совпал с эталоном", approx(s.total_pay, ref.total, 5), `got ${s.total_pay} vs ${ref.total}`);
}

console.log("\n── Кейс E: нулевой долг и краевые значения (нет NaN/Infinity) ──");
{
  const a = analyzeFinance(report([
    makeContract({ current_debt: 0, psk_percent: 0, avg_monthly_payment: 0 }),
    makeContract({ current_debt: 50000, psk_percent: 0, avg_monthly_payment: 5000 }), // ставка 0
  ]));
  const allNums = a.scenarios.flatMap((s) => [s.monthly_payment, s.duration_months, s.total_pay, s.savings_vs_continue]);
  check("все числа конечны (нет NaN/Infinity)", allNums.every(finite), JSON.stringify(allNums));
  check("активный договор учтён", a.active_contracts === 1, `got ${a.active_contracts}`);
  check("ставка 0: итог = долг (10 мес * 5000)", approx(cont(a).total_pay, 50000, 1), `got ${cont(a).total_pay}`);
}

console.log("\n── Кейс F: compliance (0–2 платежа, кредиты за 4 дня) ──");
{
  const a = analyzeFinance(report([
    makeContract({ creditor: "МФО-1", current_debt: 120000, loan_sum: 120000, psk_percent: 300, avg_monthly_payment: 8000, payments_made: 1, origination_date: "2025-06-01" }),
    makeContract({ creditor: "МФО-2", current_debt: 120000, loan_sum: 120000, psk_percent: 300, avg_monthly_payment: 8000, payments_made: 0, origination_date: "2025-06-03" }),
  ]));
  const codes = a.compliance.map((f) => f.code);
  check("флаг few_payments", codes.includes("few_payments"), codes.join(","));
  check("флаг rapid_origination (интервал 2 дня)", codes.includes("rapid_origination"), codes.join(","));
  check("флаг big_debt_low_history", codes.includes("big_debt_low_history"), codes.join(","));
  check("риск-скор > 0 и <= 100", a.compliance_score > 0 && a.compliance_score <= 100, `${a.compliance_score}`);
}

console.log(`\n${fails === 0 ? "🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ" : "⚠ ПРОВАЛЕНО: " + fails}\n`);
process.exit(fails === 0 ? 0 : 1);
