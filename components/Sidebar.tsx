"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  FilePlus2,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Аналитика", icon: LayoutDashboard },
  { href: "/applications", label: "Заявки", icon: FolderKanban },
  { href: "/new", label: "Новая заявка", icon: FilePlus2 },
  { href: "/assistant", label: "ИИ-ассистент", icon: Sparkles },
  { href: "/help", label: "Справка", icon: BookOpen },
];

export function Sidebar({ live }: { live: boolean }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink-200/70 bg-white/70 backdrop-blur md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-soft">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold text-ink-900">КредитАнализ</div>
          <div className="text-xs text-ink-400">банкротство физлиц</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand-600" : "text-ink-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-5">
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs",
            live
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          <Cpu className="h-4 w-4" />
          <div>
            <div className="font-semibold">{live ? "Gemini подключён" : "Демо-режим"}</div>
            <div className="opacity-80">{live ? "Живой ИИ-анализ" : "Добавьте ключ в .env.local"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
