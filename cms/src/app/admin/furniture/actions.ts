"use server";

import { revalidatePath } from "next/cache";
import { execute, query, queryOne } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { reloadCatalog } from "@/lib/rcon";
import { addFurniFromSwf } from "@/lib/furni-pipeline";

type ActionResult = { type: "error" | "success"; text: string };

const MAX_SWF_BYTES = 8 * 1024 * 1024; // furni SWFs are small (KBs); 8 MB is generous

/** Upload a new furni SWF and register it into the hotel (convert + DB + reload). */
export async function createFurni(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await staffOk())) return { type: "error", text: "No autorizado." };

  const className = String(formData.get("class") ?? "").trim().toLowerCase().slice(0, 64);
  const name = String(formData.get("name") ?? "").trim().slice(0, 56);
  const wall = String(formData.get("type") ?? "floor") === "wall";
  const xdim = Math.max(1, Math.min(64, Number(formData.get("x") ?? 1)));
  const ydim = Math.max(1, Math.min(64, Number(formData.get("y") ?? 1)));
  const stackHeight = Math.max(0, Number(formData.get("z") ?? 0));
  const revision = Math.max(0, Number(formData.get("revision") ?? 1));
  const category = String(formData.get("category") ?? "").trim().slice(0, 32) || (wall ? "wall" : "floor");
  const description = String(formData.get("description") ?? "").trim().slice(0, 128);
  const siton = formData.get("siton") === "1";
  const layon = formData.get("layon") === "1";
  const standon = formData.get("standon") === "1";

  if (!/^[a-z0-9_]+$/.test(className)) {
    return { type: "error", text: "La clase debe ser como retrotv_silla (solo a-z, 0-9, _)." };
  }
  if (!name) return { type: "error", text: "El nombre es obligatorio." };

  const file = formData.get("swf");
  if (!(file instanceof File) || file.size === 0) {
    return { type: "error", text: "Sube un archivo .swf del mueble." };
  }
  if (file.size > MAX_SWF_BYTES) {
    return { type: "error", text: "El SWF es demasiado grande (máx. 8 MB)." };
  }
  const swf = Buffer.from(await file.arrayBuffer());

  try {
    const { id, reloaded } = await addFurniFromSwf({
      swf, className, name, wall, xdim, ydim, stackHeight, category, revision,
      siton, layon, standon, description,
    });
    revalidatePath("/admin/furniture");
    return {
      type: "success",
      text:
        `Mueble "${className}" añadido (#${id}). ` +
        (reloaded
          ? "Emulador recargado. Refresca el cliente para ver los assets."
          : "Sin staff en línea: reinicia el emulador (make emu-restart) y refresca el cliente.") +
        " Ya puedes ponerlo a la venta buscándolo abajo.",
    };
  } catch (err) {
    return { type: "error", text: (err as Error).message };
  }
}

async function staffOk(): Promise<boolean> {
  const session = await getSession();
  return !!session && isStaff(session.rank);
}

export interface FurniHit {
  id: number;
  item_name: string;
  public_name: string;
  type: string;
  width: number;
  length: number;
}

/** Search the furni library (items_base) by classname or display name. */
export async function searchFurni(q: string): Promise<FurniHit[]> {
  if (!(await staffOk())) return [];
  const term = (q ?? "").trim();
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_]/g, "")}%`;
  try {
    return await query<FurniHit>(
      `SELECT id, item_name, public_name, type, width, length
         FROM items_base
        WHERE item_name LIKE :like OR public_name LIKE :like
        ORDER BY (item_name = :exact) DESC, item_name
        LIMIT 48`,
      { like, exact: term },
    );
  } catch {
    return [];
  }
}

const CURRENCY_TYPES = new Set([0, 5]); // 0 = duckets/pixels, 5 = diamonds

export async function createFurniOffer(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await staffOk())) return { type: "error", text: "No autorizado." };

  const baseId = Number(String(formData.get("base_id") ?? "").trim());
  const name = String(formData.get("catalog_name") ?? "").trim().slice(0, 100);
  const pageId = Number(String(formData.get("page_id") ?? "").trim());
  const costCredits = Number(String(formData.get("cost_credits") ?? "0").trim());
  const costPoints = Number(String(formData.get("cost_points") ?? "0").trim());
  const pointsType = Number(String(formData.get("points_type") ?? "0").trim());
  const amount = Number(String(formData.get("amount") ?? "1").trim());
  const clubOnly = String(formData.get("club_only") ?? "0") === "1" ? "1" : "0";

  if (!Number.isInteger(baseId) || baseId <= 0) {
    return { type: "error", text: "Selecciona un mueble de la biblioteca." };
  }
  if (!name) return { type: "error", text: "El nombre de la oferta es obligatorio." };
  if (!Number.isInteger(pageId) || pageId <= 0) {
    return { type: "error", text: "Selecciona una página del catálogo." };
  }
  if (!Number.isInteger(costCredits) || costCredits < 0) {
    return { type: "error", text: "El coste en créditos no es válido." };
  }
  if (!Number.isInteger(costPoints) || costPoints < 0) {
    return { type: "error", text: "El coste en puntos no es válido." };
  }
  if (!CURRENCY_TYPES.has(pointsType)) {
    return { type: "error", text: "Tipo de moneda no válido." };
  }
  if (!Number.isInteger(amount) || amount < 1) {
    return { type: "error", text: "La cantidad debe ser al menos 1." };
  }

  const base = await queryOne<{ id: number }>(
    "SELECT id FROM items_base WHERE id = :id",
    { id: baseId },
  );
  if (!base) return { type: "error", text: "Ese mueble no existe en la biblioteca." };

  try {
    await execute(
      `INSERT INTO catalog_items
        (item_ids, page_id, catalog_name, cost_credits, cost_points, points_type,
         amount, order_number, club_only)
       VALUES
        (:base_id, :page_id, :name, :credits, :points, :ptype, :amount, 0, :club)`,
      {
        base_id: String(baseId),
        page_id: pageId,
        name,
        credits: costCredits,
        points: costPoints,
        ptype: costPoints > 0 ? pointsType : 0,
        amount,
        club: clubOnly,
      },
    );
  } catch (err) {
    return { type: "error", text: `No se pudo crear la oferta: ${(err as Error).message}` };
  }

  const { pushed } = await reloadCatalog();
  revalidatePath("/admin/furniture");
  return {
    type: "success",
    text:
      `Mueble "${name}" añadido al catálogo.` +
      (pushed
        ? " Disponible en el hotel al instante."
        : " Reinicia el emulador para aplicarlo."),
  };
}

export async function deleteFurniOffer(id: number): Promise<void> {
  if (!(await staffOk())) return;
  if (!Number.isInteger(id)) return;
  await execute("DELETE FROM catalog_items WHERE id = :id", { id });
  await reloadCatalog();
  revalidatePath("/admin/furniture");
}
