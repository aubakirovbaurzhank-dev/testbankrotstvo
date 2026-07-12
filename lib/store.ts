import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Application, ApplicationStatus, AuditEvent } from "./types";
import { buildDemoApplications } from "./demo";

// Локальное хранилище: по одному JSON-файлу на заявку в data/applications.
// Персональные данные не покидают этот ПК и не попадают в git (см. .gitignore).
const DATA_DIR = path.join(process.cwd(), "data", "applications");
const SEED_MARK = path.join(process.cwd(), "data", ".seeded");

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** При первом запуске наполняем хранилище демо-заявками (обезличенными). */
function ensureSeeded() {
  ensureDir();
  if (fs.existsSync(SEED_MARK)) return;
  const jsons = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  // Сеем демо только если нет «настоящих» заявок; идемпотентно дописываем
  // недостающие файлы (само-восстановление после прерванного сева).
  const onlyDemoOrEmpty = jsons.every((f) => f.startsWith("demo"));
  if (onlyDemoOrEmpty) {
    for (const app of buildDemoApplications()) {
      const p = fileFor(app.id);
      if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(app, null, 2), "utf-8");
    }
  }
  fs.writeFileSync(SEED_MARK, new Date().toISOString(), "utf-8");
}

/** Проверка, что распарсенный объект — валидная заявка. */
function isValidApp(x: unknown): x is Application {
  return (
    !!x && typeof x === "object" &&
    typeof (x as Application).id === "string" &&
    typeof (x as Application).createdAt === "string" &&
    !!(x as Application).analysis && !!(x as Application).report
  );
}

function fileFor(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

export function listApplications(): Application[] {
  ensureSeeded();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const apps: Application[] = [];
  for (const f of files) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf-8"));
      if (isValidApp(parsed)) apps.push(parsed); // пропускаем битые/неполные файлы
    } catch {
      /* пропускаем битые файлы */
    }
  }
  return apps.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getApplication(id: string): Application | null {
  ensureSeeded();
  const p = fileFor(id);
  if (!fs.existsSync(p)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
    return isValidApp(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveApplication(app: Application): Application {
  ensureDir();
  fs.writeFileSync(fileFor(app.id), JSON.stringify(app, null, 2), "utf-8");
  return app;
}

export function deleteApplication(id: string): boolean {
  const p = fileFor(id);
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}

export function newId(): string {
  const ts = Date.now().toString(36);
  const rnd = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 8);
  return `${ts}${rnd}`;
}

/** Меняет статус заявки и добавляет запись в аудит. */
export function changeStatus(
  id: string,
  to: ApplicationStatus,
  note?: string,
): Application | null {
  const app = getApplication(id);
  if (!app) return null;
  const from = app.status;
  if (from === to && !note) return app;
  app.status = to;
  app.updatedAt = new Date().toISOString();
  const event: AuditEvent = {
    at: app.updatedAt,
    type: "status_changed",
    from,
    to,
    note,
  };
  app.history = [event, ...(app.history || [])];
  return saveApplication(app);
}

export function addNote(id: string, note: string): Application | null {
  const app = getApplication(id);
  if (!app) return null;
  app.updatedAt = new Date().toISOString();
  app.history = [{ at: app.updatedAt, type: "note", note }, ...(app.history || [])];
  return saveApplication(app);
}
