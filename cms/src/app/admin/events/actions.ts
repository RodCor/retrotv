"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

async function requireStaff(): Promise<ActionResult | null> {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return { type: "error", text: "No autorizado." };
  }
  return null;
}

interface EventInput {
  title: string;
  description: string;
  image: string;
  location: string;
  eventDate: string | null;
  visible: number;
}

/** "2026-06-20T18:00" (datetime-local) -> "2026-06-20 18:00:00" (MySQL), or null. */
function toMysqlDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/.exec(v);
  if (!m) return null;
  return `${m[1]} ${m[2]}:${m[3] ?? "00"}`;
}

function parseEvent(formData: FormData): EventInput | { error: string } {
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const description = String(formData.get("description") ?? "").trim().slice(0, 800);
  const image = String(formData.get("image") ?? "").trim().slice(0, 300);
  const location = String(formData.get("location") ?? "").trim().slice(0, 120);
  const eventDate = toMysqlDate(String(formData.get("event_date") ?? ""));
  const visible = String(formData.get("visible") ?? "1") === "1" ? 1 : 0;

  if (!title) return { error: "El título es obligatorio." };
  return { title, description, image, location, eventDate, visible };
}

export async function createEvent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const parsed = parseEvent(formData);
  if ("error" in parsed) return { type: "error", text: parsed.error };

  try {
    await execute(
      `INSERT INTO cms_events (title, description, image, location, event_date, visible)
       VALUES (:title, :description, :image, :location, :eventDate, :visible)`,
      { ...parsed },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo crear el evento: ${(err as Error).message}` };
  }

  revalidatePath("/admin/events");
  return { type: "success", text: `Evento "${parsed.title}" creado.` };
}

export async function updateEvent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const id = Number(String(formData.get("id") ?? "").trim());
  if (!Number.isInteger(id) || id <= 0) {
    return { type: "error", text: "Identificador de evento no válido." };
  }
  const parsed = parseEvent(formData);
  if ("error" in parsed) return { type: "error", text: parsed.error };

  try {
    await execute(
      `UPDATE cms_events
          SET title = :title, description = :description, image = :image,
              location = :location, event_date = :eventDate, visible = :visible
        WHERE id = :id`,
      { ...parsed, id },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo actualizar el evento: ${(err as Error).message}` };
  }

  revalidatePath("/admin/events");
  return { type: "success", text: `Evento "${parsed.title}" actualizado.` };
}

export async function deleteEvent(id: number): Promise<void> {
  const denied = await requireStaff();
  if (denied) return;
  if (!Number.isInteger(id)) return;

  await execute("DELETE FROM cms_events WHERE id = :id", { id });
  revalidatePath("/admin/events");
}
