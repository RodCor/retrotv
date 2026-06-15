"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { reloadCatalog } from "@/lib/rcon";

/** Note appended to success messages indicating live-reload state. */
function catalogReloadNote(pushed: boolean): string {
  return pushed
    ? " El catálogo del hotel se recargó al instante."
    : " Reinicia el emulador o usa :update_catalog para aplicarlo en el hotel.";
}

type ActionResult = { type: "error" | "success"; text: string };

async function requireStaff(): Promise<ActionResult | null> {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return { type: "error", text: "No autorizado." };
  }
  return null;
}

/* ------------------------------ catalog pages ------------------------------ */

export async function createCatalogPage(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const caption = String(formData.get("caption") ?? "").trim();
  const parentRaw = String(formData.get("parent_id") ?? "").trim();
  const minRankRaw = String(formData.get("min_rank") ?? "").trim();
  const pageLayout = String(formData.get("page_layout") ?? "").trim() || "default";

  if (!caption) {
    return { type: "error", text: "El título es obligatorio." };
  }

  const parentId = parentRaw === "" ? -1 : Number(parentRaw);
  if (!Number.isInteger(parentId)) {
    return { type: "error", text: "El ID padre debe ser un número entero." };
  }

  const minRank = minRankRaw === "" ? 1 : Number(minRankRaw);
  if (!Number.isInteger(minRank) || minRank < 1) {
    return { type: "error", text: "El rango mínimo debe ser un número entero positivo." };
  }

  const maxRow = await queryOne<{ max_order: number | null }>(
    "SELECT MAX(order_num) AS max_order FROM catalog_pages",
  );
  const orderNum = (maxRow?.max_order ?? 0) + 1;

  try {
    await execute(
      `INSERT INTO catalog_pages
        (parent_id, caption, caption_save, page_layout, icon_color, icon_image,
         min_rank, order_num, visible, enabled, club_only, vip_only,
         page_headline, page_teaser)
       VALUES
        (:parent_id, :caption, :caption, :page_layout, 0, 0,
         :min_rank, :order_num, '1', '1', '0', '0', '', '')`,
      {
        parent_id: parentId,
        caption,
        page_layout: pageLayout,
        min_rank: minRank,
        order_num: orderNum,
      },
    );
  } catch (err) {
    return {
      type: "error",
      text: `No se pudo crear la página: ${(err as Error).message}`,
    };
  }

  const { pushed } = await reloadCatalog();
  revalidatePath("/admin/catalog");
  return { type: "success", text: `Página "${caption}" creada.` + catalogReloadNote(pushed) };
}

export async function renameCatalogPage(id: number, formData: FormData): Promise<void> {
  const denied = await requireStaff();
  if (denied) return;
  if (!Number.isInteger(id)) return;
  // Strip characters the legacy utf8mb3 caption column can't store (4-byte
  // emoji, some symbols) so a rename never crashes the page.
  const caption = String(formData.get("caption") ?? "")
    .replace(/[\u{10000}-\u{10FFFF}☀-➿←-⇿⌀-⏿]/gu, "")
    .trim()
    .slice(0, 120);
  if (!caption) return;
  try {
    await execute(
      "UPDATE catalog_pages SET caption = :c, caption_save = :c WHERE id = :id",
      { c: caption, id },
    );
  } catch {
    /* invalid value for the legacy column — ignore rather than crash */
  }
  revalidatePath("/admin/catalog");
}

export async function togglePageVisible(id: number): Promise<void> {
  const denied = await requireStaff();
  if (denied) return;
  if (!Number.isInteger(id)) return;

  await execute(
    `UPDATE catalog_pages
       SET visible = IF(visible = '1', '0', '1')
     WHERE id = :id`,
    { id },
  );
  await reloadCatalog();
  revalidatePath("/admin/catalog");
}

export async function deleteCatalogPage(id: number): Promise<void> {
  const denied = await requireStaff();
  if (denied) return;
  if (!Number.isInteger(id)) return;

  await execute("DELETE FROM catalog_pages WHERE id = :id", { id });
  await reloadCatalog();
  revalidatePath("/admin/catalog");
}

/* ------------------------------ catalog items ------------------------------ */

export async function createCatalogItem(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireStaff();
  if (denied) return denied;

  const catalogName = String(formData.get("catalog_name") ?? "").trim();
  const itemIds = String(formData.get("item_ids") ?? "").trim();
  const pageId = Number(String(formData.get("page_id") ?? "").trim());
  const costCredits = Number(String(formData.get("cost_credits") ?? "0").trim());
  const costPoints = Number(String(formData.get("cost_points") ?? "0").trim());
  const amount = Number(String(formData.get("amount") ?? "1").trim());

  if (!catalogName) {
    return { type: "error", text: "El nombre del catálogo es obligatorio." };
  }
  if (!itemIds || !Number.isInteger(Number(itemIds))) {
    return { type: "error", text: "El ID del objeto debe ser un ID base de objeto." };
  }
  if (!Number.isInteger(pageId) || pageId <= 0) {
    return { type: "error", text: "Selecciona una página del catálogo válida." };
  }
  if (!Number.isInteger(costCredits) || costCredits < 0) {
    return { type: "error", text: "El coste en créditos debe ser un número entero no negativo." };
  }
  if (!Number.isInteger(costPoints) || costPoints < 0) {
    return { type: "error", text: "El coste en puntos debe ser un número entero no negativo." };
  }
  if (!Number.isInteger(amount) || amount < 1) {
    return { type: "error", text: "La cantidad debe ser al menos 1." };
  }

  try {
    await execute(
      `INSERT INTO catalog_items
        (item_ids, page_id, catalog_name, cost_credits, cost_points,
         points_type, amount, order_number, club_only)
       VALUES
        (:item_ids, :page_id, :catalog_name, :cost_credits, :cost_points,
         0, :amount, 0, '0')`,
      {
        item_ids: itemIds,
        page_id: pageId,
        catalog_name: catalogName,
        cost_credits: costCredits,
        cost_points: costPoints,
        amount,
      },
    );
  } catch (err) {
    return {
      type: "error",
      text: `No se pudo crear el objeto: ${(err as Error).message}`,
    };
  }

  const { pushed } = await reloadCatalog();
  revalidatePath("/admin/catalog");
  return { type: "success", text: `Objeto "${catalogName}" creado.` + catalogReloadNote(pushed) };
}

export async function deleteCatalogItem(id: number): Promise<void> {
  const denied = await requireStaff();
  if (denied) return;
  if (!Number.isInteger(id)) return;

  await execute("DELETE FROM catalog_items WHERE id = :id", { id });
  await reloadCatalog();
  revalidatePath("/admin/catalog");
}
