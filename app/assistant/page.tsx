import { ChatPanel } from "@/components/ChatPanel";
import { isLiveMode } from "@/lib/gemini";
import { Lightbulb } from "lucide-react";

export default function AssistantPage() {
  const live = isLiveMode();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">ИИ-ассистент</h1>
        <p className="mt-1 text-sm text-ink-500">
          Задайте вопрос по процессу банкротства, по цифрам воронки или по конкретной ситуации клиента.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChatPanel
            live={live}
            minHeight={520}
            intro={
              "Привет! Я знаю процесс банкротства и реструктуризации, разбираюсь в кредитных отчётах и вижу вашу воронку заявок.\n\n**Спросите меня о чём угодно** — помогу и с клиентом, и с аналитикой."
            }
            suggestions={[
              "Сколько заявок мы закрыли?",
              "Чем банкротство отличается от реструктуризации?",
              "При каком долге подходит внесудебное банкротство?",
              "Как отработать возражение «боюсь последствий»?",
            ]}
          />
        </div>

        <div className="card h-fit p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-ink-700">Что умеет ассистент</h2>
          </div>
          <ul className="space-y-2.5 text-sm text-ink-600">
            <li>• Объясняет процесс банкротства (БФЛ) и реструктуризации (РДГ) простым языком</li>
            <li>• Читает данные конкретной заявки и советует, что предложить клиенту</li>
            <li>• Отвечает на вопросы по аналитике: сколько поступило и закрыто заявок</li>
            <li>• Помогает с формулировками и отработкой возражений</li>
            <li>• Подсказывает, на что смотреть в compliance-блоке</li>
          </ul>
          <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
            Ответы носят справочный характер и не заменяют консультацию юриста. Суммы и сроки — ориентировочные.
          </p>
        </div>
      </div>
    </div>
  );
}
