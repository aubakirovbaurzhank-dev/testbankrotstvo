import { NextResponse } from "next/server";
import { getApplication, changeStatus, addNote, deleteApplication } from "@/lib/store";
import type { ApplicationStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = getApplication(id);
  if (!app) return NextResponse.json({ error: "Заявка не найдена." }, { status: 404 });
  return NextResponse.json(app);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { status?: ApplicationStatus; note?: string };
  let app = getApplication(id);
  if (!app) return NextResponse.json({ error: "Заявка не найдена." }, { status: 404 });

  if (body.status) app = changeStatus(id, body.status, body.note);
  else if (body.note) app = addNote(id, body.note);

  return NextResponse.json(app);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = deleteApplication(id);
  if (!ok) return NextResponse.json({ error: "Заявка не найдена." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
