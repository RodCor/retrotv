"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { reloadHotelView } from "@/lib/rcon";

/** Append a hint about when the hotel view will reflect the change. */
function reloadNote(pushed: boolean): string {
  return pushed
    ? " La portada del hotel se actualizó al instante."
    : " Aparecerá en la portada en la próxima recarga automática (o usa :update_view en el hotel).";
}

type ActionResult = { type: "error" | "success"; text: string };

async function requireStaff(): Promise<ActionResult | null> {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return { type: "error", text: "No autorizado." };
  }
  return null;
}

/** A single hotelview_news billboard, read from FormData and validated. */
interface NewsInput {
  title: string;
  text: string;
  buttonText: string;
  buttonType: "web" | "client";
  buttonLink: string;
  image: string;
}

function parseNews(formData: FormData): NewsInput | { error: string } {
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const text = String(formData.get("text") ?? "").trim().slice(0, 500);
  const buttonText = String(formData.get("button_text") ?? "").trim().slice(0, 50);
  const rawType = String(formData.get("button_type") ?? "web").trim();
  const buttonType: "web" | "client" = rawType === "client" ? "client" : "web";
  const buttonLink = String(formData.get("button_link") ?? "").trim().slice(0, 200);
  const image = String(formData.get("image") ?? "").trim().slice(0, 200);

  if (!title) return { error: "El título es obligatorio." };
  if (!image) return { error: "La imagen es obligatoria (ej. web_promo_small/foo.png)." };
  return { title, text, buttonText, buttonType, buttonLink, image };
}

export async function createNews(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const parsed = parseNews(formData);
  if ("error" in parsed) return { type: "error", text: parsed.error };

  try {
    await execute(
      `INSERT INTO hotelview_news (title, text, button_text, button_type, button_link, image)
       VALUES (:title, :text, :buttonText, :buttonType, :buttonLink, :image)`,
      { ...parsed },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo crear la noticia: ${(err as Error).message}` };
  }

  const { pushed } = await reloadHotelView();
  revalidatePath("/admin/news");
  return { type: "success", text: `Noticia "${parsed.title}" publicada.` + reloadNote(pushed) };
}

export async function updateNews(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const id = Number(String(formData.get("id") ?? "").trim());
  if (!Number.isInteger(id) || id <= 0) {
    return { type: "error", text: "Identificador de noticia no válido." };
  }
  const parsed = parseNews(formData);
  if ("error" in parsed) return { type: "error", text: parsed.error };

  try {
    await execute(
      `UPDATE hotelview_news
          SET title = :title, text = :text, button_text = :buttonText,
              button_type = :buttonType, button_link = :buttonLink, image = :image
        WHERE id = :id`,
      { ...parsed, id },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo actualizar la noticia: ${(err as Error).message}` };
  }

  const { pushed } = await reloadHotelView();
  revalidatePath("/admin/news");
  return { type: "success", text: `Noticia "${parsed.title}" actualizada.` + reloadNote(pushed) };
}

export async function deleteNews(id: number): Promise<void> {
  const denied = await requireStaff();
  if (denied) return;
  if (!Number.isInteger(id)) return;

  await execute("DELETE FROM hotelview_news WHERE id = :id", { id });
  await reloadHotelView();
  revalidatePath("/admin/news");
}
