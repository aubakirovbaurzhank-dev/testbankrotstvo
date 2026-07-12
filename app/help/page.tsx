import { FAQ, HOW_TO_STEPS } from "@/lib/knowledge";
import { BookOpen, HelpCircle, Cpu, Landmark, Scale, TrendingDown } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Справка</h1>
        <p className="mt-1 text-sm text-ink-500">Как работать в системе и что важно знать о процессе.</p>
      </div>

      {/* Как работать */}
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-ink-700">Как работать в системе</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_TO_STEPS.map((s, i) => (
            <div key={s.title} className="rounded-xl border border-ink-100 p-4">
              <div className="text-xs font-bold text-brand-500">ШАГ {i + 1}</div>
              <div className="mt-1 text-sm font-semibold text-ink-800">{s.title}</div>
              <div className="mt-1 text-xs text-ink-500">{s.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Три сценария */}
      <div className="grid gap-4 md:grid-cols-3">
        <ProductCard icon={Landmark} title="Банкротство физлица" color="brand"
          text="Долги списываются законно. Судебное — обычно при долге от ~300 000 ₽; внесудебное через МФЦ — от 25 000 до 1 000 000 ₽. Услуга «под ключ» ≈ 200 000 ₽." />
        <ProductCard icon={Scale} title="Реструктуризация" color="teal"
          text="Проценты и пени замораживаются, клиент гасит тело долга единым графиком и сохраняет кредитную историю. Услуга ≈ 150 000 ₽." />
        <ProductCard icon={TrendingDown} title="Платить банкам" color="amber"
          text="Базовый сценарий «ничего не менять». Обычно самый дорогой — клиент годами платит проценты. Показываем для честного сравнения." />
      </div>

      {/* FAQ */}
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-ink-700">Частые вопросы</h2>
        </div>
        <div className="divide-y divide-ink-100">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink-800">
                {f.q}
                <span className="text-ink-300 transition group-open:rotate-45">＋</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Об ИИ */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-ink-700">Как устроен ИИ-движок</h2>
        </div>
        <div className="space-y-2 text-sm leading-relaxed text-ink-600">
          <p>
            Распознавание PDF-отчётов выполняет <b>Google Gemini</b> (модель <code>gemini-3.5-flash</code>) —
            он читает отчёт «как человек», включая таблицы и сложную вёрстку, и возвращает строго
            структурированные данные по каждому договору.
          </p>
          <p>
            Все денежные расчёты (сценарии, сроки, экономия) считаются <b>детерминированно в коде</b>, а не
            «на глаз» — ИИ отвечает за распознавание, математику проверяет система. Это исключает выдуманные числа.
          </p>
          <p>
            Чат-ассистент использует ту же модель с «погружением» в процесс банкротства и контекст текущей заявки.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  icon: Icon,
  title,
  text,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  color: "brand" | "teal" | "amber";
}) {
  const tone = {
    brand: "bg-brand-50 text-brand-600",
    teal: "bg-teal-50 text-teal-600",
    amber: "bg-amber-50 text-amber-600",
  }[color];
  return (
    <div className="card p-5">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-bold text-ink-900">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{text}</p>
    </div>
  );
}
