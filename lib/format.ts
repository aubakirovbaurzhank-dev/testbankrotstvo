// ── Форматирование чисел, денег и дат в русской локали ───────────

export function rub(n: number, opts: { sign?: boolean } = {}): string {
  const v = Math.round(n || 0);
  const s = new Intl.NumberFormat("ru-RU").format(Math.abs(v));
  const sign = opts.sign && v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${s} ₽`;
}

/** Компактный формат для крупных сумм: 1,2 млн ₽ */
export function rubShort(n: number): string {
  const neg = (n || 0) < 0 ? "−" : "";
  const v = Math.abs(Math.round(n || 0));
  if (v >= 1_000_000) return `${neg}${(v / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн ₽`;
  if (v >= 1_000) return `${neg}${Math.round(v / 1000).toLocaleString("ru-RU")} тыс ₽`;
  return `${neg}${v} ₽`;
}

export function pct(n: number, digits = 1): string {
  return `${(n || 0).toLocaleString("ru-RU", { maximumFractionDigits: digits })}%`;
}

export function num(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n || 0));
}

const MONTHS = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  if (iso.startsWith("9999")) return "бессрочно";
  // Дату-только (YYYY-MM-DD) парсим как локальную, чтобы не «уехать» на день назад.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Срок в месяцах → человекочитаемо: «3 года 2 мес». */
export function months(m: number): string {
  m = Math.round(m || 0);
  if (m <= 0) return "—";
  const y = Math.floor(m / 12);
  const mm = m % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${plural(y, "год", "года", "лет")}`);
  if (mm > 0) parts.push(`${mm} мес`);
  return parts.join(" ") || `${m} мес`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
