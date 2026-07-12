import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { isLiveMode } from "@/lib/gemini";

export const metadata: Metadata = {
  title: "КредитАнализ · ИИ для банкротства физлиц",
  description:
    "Загрузите кредитный отчёт — ИИ распознает долги, посчитает выгоду банкротства и подскажет менеджеру, что делать.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const live = isLiveMode();
  return (
    <html lang="ru">
      <body>
        <div className="flex min-h-screen">
          <Sidebar live={live} />
          <main className="flex-1 min-w-0">
            <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8 md:py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
