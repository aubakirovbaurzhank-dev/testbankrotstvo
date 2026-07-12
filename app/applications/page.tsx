import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { listApplications } from "@/lib/store";
import { ApplicationsList } from "@/components/ApplicationsList";

export const dynamic = "force-dynamic";

export default function ApplicationsPage() {
  const apps = listApplications();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Заявки</h1>
          <p className="mt-1 text-sm text-ink-500">Все клиенты, статусы и рекомендации ИИ в одном месте.</p>
        </div>
        <Link href="/new" className="btn-primary">
          <FilePlus2 className="h-4 w-4" /> Новая заявка
        </Link>
      </div>
      <ApplicationsList apps={apps} />
    </div>
  );
}
