import { UploadForm } from "@/components/UploadForm";
import { isLiveMode } from "@/lib/gemini";
import { HOW_TO_STEPS } from "@/lib/knowledge";
import { FileSearch, Calculator, ShieldCheck, MessagesSquare } from "lucide-react";

const ICONS = [FileSearch, Calculator, ShieldCheck, MessagesSquare];

export default function NewPage() {
  const live = isLiveMode();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Новая заявка</h1>
        <p className="mt-1 text-sm text-ink-500">
          Загрузите кредитный отчёт клиента — ИИ распознает долги и посчитает выгоду за полминуты.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UploadForm live={live} />
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink-700">Что произойдёт дальше</h2>
          <ol className="mt-4 space-y-4">
            {HOW_TO_STEPS.map((s, i) => {
              const Icon = ICONS[i];
              return (
                <li key={s.title} className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink-800">{s.title}</div>
                    <div className="text-xs text-ink-500">{s.text}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
