# CLAUDE.md

Контекст для Claude Code при работе с этим проектом.

## Что это
**КредитАнализ** — веб-система для менеджеров компании по банкротству физлиц.
Менеджер загружает PDF кредитного отчёта (Кредистори / ОКБ / НБКИ) → **Google Gemini**
распознаёт кредитные договоры → код считает 3 сценария погашения (платить банкам /
банкротство / реструктуризация), таблицу решений, compliance-риски. Плюс ИИ-чат-ассистент,
аналитика воронки и аудит. Всё работает локально; интерфейс на русском.

## Команды
```bash
npm run dev              # локальный запуск → http://localhost:3000
npm run build            # прод-сборка
npm start                # запуск собранного (для деплоя; уважает $PORT)
npm run lint             # next lint
npm run verify:finance   # 24 теста финансовой математики (node --experimental-strip-types)
```
Требуется Node 18.18+ (разрабатывалось на Node 26).

## Стек
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Recharts · lucide-react.
ИИ — `@google/genai` (НЕ устаревший `@google/generative-ai`).

## Архитектура
Поток: **PDF → `lib/analyze.ts` (Gemini) → `lib/finance.ts` (расчёты) → `lib/store.ts` (JSON) → UI**.
```
app/
  page.tsx                    Дашборд / аналитика
  new/page.tsx                Загрузка отчёта
  applications/[id]/page.tsx  Карточка заявки (анализ + чат + аудит)
  assistant/, help/           Глобальный ассистент, справка
  api/analyze  api/chat  api/applications/[id]   Route handlers (runtime = nodejs)
lib/
  analyze.ts    PDF → структурированный JSON (Gemini responseSchema, temperature 0, ретраи+фолбэк)
  finance.ts    Сценарии, таблица решений, compliance — ДЕТЕРМИНИРОВАННО, помесячная амортизация
  chat.ts       Стриминговый чат (systemInstruction = knowledge + контекст заявки/аналитики)
  knowledge.ts  База знаний по процессу банкротства (ядро «погружения» ИИ)
  store.ts      Локальное хранилище (JSON на файл) + аудит + демо-сев
  analytics.ts  Агрегаты для дашборда
  gemini.ts     Клиент Gemini + выбор модели + isLiveMode()
  types.ts  format.ts  demo.ts  utils.ts
components/     UI: Sidebar, Stat, DashboardCharts, analysis.tsx, ChatPanel, StatusControl, ...
scripts/verify-finance.ts     Независимый аудит расчётов
```

## Ключевые принципы
- **ИИ только распознаёт; все деньги считает код** (`lib/finance.ts`). Не переносить финансовые
  расчёты в промпт — иначе получим «выдуманные» числа. При правках finance гоняй `npm run verify:finance`.
- **Деньги — целые рубли**, формат через `lib/format.ts` (`rub`, `rubShort`, `months`, `pct`) в локали ru-RU.
- UI и микротексты — **на русском**, дружелюбно и просто (аудитория — непогружённый менеджер).

## Переменные окружения (`.env.local`, см. `.env.example`)
- `GEMINI_API_KEY` — ключ Google AI Studio. **Никогда не коммитить** (в .gitignore).
- `GEMINI_MODEL_EXTRACT` / `GEMINI_MODEL_CHAT` — по умолчанию `gemini-3.5-flash`
  (фолбэк извлечения — `gemini-2.5-flash`, зашит в `analyze.ts`). При 503 «перегрузка» —
  ретраи с бэкоффом, затем запасная модель.
- `SEED_DEMO` — `true` показывает обезличенные демо-заявки при первом запуске; `false` — пустой старт.
- `BANKRUPTCY_COST` (200000) / `RESTRUCTURING_COST` (150000) — стоимость услуг для сценариев.

## Данные и приватность
- Заявки — `data/applications/*.json`, **gitignored** (персональные данные не покидают ПК).
- Демо-заявки — синтетические (вымышленные ФИО) из `lib/demo.ts`.
- НИКОГДА не коммитить: `.env.local`, `*.txt` с ключами, содержимое `data/`.

## Подводные камни (важно)
- **git через Bash-инструмент на этом окружении иногда зависает** (Cyrillic-путь `…/ДЗ/тех файлы/…`).
  Надёжно — выполнять git через **PowerShell** (`& git -C "<path>" ...`).
- Путь проекта содержит кириллицу и пробелы — заключать в кавычки, использовать `git -C`.
- `runtime = "nodejs"` обязателен в API-роутах (нужны fs и Buffer).
- Хранилище файловое: на эфемерной ФС (Render free) данные не переживают передеплой — это ок для демо.

## Деплой
`render.yaml` — блюпринт для Render (Node-сервер). **Не Vercel Hobby**: лимит функции 10 сек
оборвёт распознавание (20–40 сек). Подробно — `docs/DEPLOY.md`.

## Лицензия
Проприетарная, «только для оценки» (см. `LICENSE`) — код не для повторного использования.
