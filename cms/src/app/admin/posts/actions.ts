"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

async function staffOk(): Promise<boolean> {
  const session = await getSession();
  return !!session && isStaff(session.rank);
}

function toMysqlDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/.exec(v);
  return m ? `${m[1]} ${m[2]}:${m[3] ?? "00"}` : null;
}

interface PostInput {
  category: "news" | "competition";
  title: string;
  excerpt: string;
  body: string;
  image: string;
  label: string;
  author: string;
  pinned: number;
  visible: number;
  startsAt: string | null;
}

function parsePost(formData: FormData): PostInput | { error: string } {
  const category = String(formData.get("category") ?? "news") === "competition" ? "competition" : "news";
  const title = String(formData.get("title") ?? "").trim().slice(0, 140);
  const excerpt = String(formData.get("excerpt") ?? "").trim().slice(0, 300);
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const image = String(formData.get("image") ?? "").trim().slice(0, 300);
  const label = String(formData.get("label") ?? "").trim().slice(0, 40);
  const author = String(formData.get("author") ?? "").trim().slice(0, 64) || "Equipo RetroTV";
  const pinned = formData.get("pinned") === "1" ? 1 : 0;
  const visible = String(formData.get("visible") ?? "1") === "1" ? 1 : 0;
  const startsAt = toMysqlDate(String(formData.get("starts_at") ?? ""));

  if (!title) return { error: "El título es obligatorio." };
  if (!body) return { error: "El contenido es obligatorio." };
  return { category, title, excerpt, body, image, label, author, pinned, visible, startsAt };
}

export async function createPost(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await staffOk())) return { type: "error", text: "No autorizado." };
  const p = parsePost(formData);
  if ("error" in p) return { type: "error", text: p.error };
  try {
    await execute(
      `INSERT INTO cms_posts (category, title, excerpt, body, image, label, author, pinned, visible, starts_at)
       VALUES (:category, :title, :excerpt, :body, :image, :label, :author, :pinned, :visible, :startsAt)`,
      { ...p },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo crear: ${(err as Error).message}` };
  }
  revalidatePath("/admin/posts");
  return { type: "success", text: `Publicación "${p.title}" creada.` };
}

export async function updatePost(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await staffOk())) return { type: "error", text: "No autorizado." };
  const id = Number(String(formData.get("id") ?? "").trim());
  if (!Number.isInteger(id) || id <= 0) return { type: "error", text: "Id no válido." };
  const p = parsePost(formData);
  if ("error" in p) return { type: "error", text: p.error };
  try {
    await execute(
      `UPDATE cms_posts SET category=:category, title=:title, excerpt=:excerpt, body=:body,
              image=:image, label=:label, author=:author, pinned=:pinned, visible=:visible, starts_at=:startsAt
        WHERE id=:id`,
      { ...p, id },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo actualizar: ${(err as Error).message}` };
  }
  revalidatePath("/admin/posts");
  return { type: "success", text: `Publicación "${p.title}" actualizada.` };
}

export async function deletePost(id: number): Promise<void> {
  if (!(await staffOk())) return;
  if (!Number.isInteger(id)) return;
  await execute("DELETE FROM cms_posts WHERE id = :id", { id });
  revalidatePath("/admin/posts");
}
