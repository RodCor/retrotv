"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";

type ActionResult = { type: "error" | "success"; text: string };

async function requireStaff(): Promise<ActionResult | null> {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return { type: "error", text: "Not authorised." };
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
    return { type: "error", text: "Caption is required." };
  }

  const parentId = parentRaw === "" ? -1 : Number(parentRaw);
  if (!Number.isInteger(parentId)) {
    return { type: "error", text: "Parent id must be a whole number." };
  }

  const minRank = minRankRaw === "" ? 1 : Number(minRankRaw);
  if (!Number.isInteger(minRank) || minRank < 1) {
    return { type: "error", text: "Min rank must be a positive whole number." };
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
      text: `Failed to create page: ${(err as Error).message}`,
    };
  }

  revalidatePath("/admin/catalog");
  return { type: "success", text: `Page "${caption}" created.` };
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
  revalidatePath("/admin/catalog");
}

export async function deleteCatalogPage(id: number): Promise<void> {
  const denied = await requireStaff();
  if (denied) return;
  if (!Number.isInteger(id)) return;

  await execute("DELETE FROM catalog_pages WHERE id = :id", { id });
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
    return { type: "error", text: "Catalog name is required." };
  }
  if (!itemIds || !Number.isInteger(Number(itemIds))) {
    return { type: "error", text: "Item id must be a base item id." };
  }
  if (!Number.isInteger(pageId) || pageId <= 0) {
    return { type: "error", text: "Select a valid catalog page." };
  }
  if (!Number.isInteger(costCredits) || costCredits < 0) {
    return { type: "error", text: "Credit cost must be a non-negative whole number." };
  }
  if (!Number.isInteger(costPoints) || costPoints < 0) {
    return { type: "error", text: "Point cost must be a non-negative whole number." };
  }
  if (!Number.isInteger(amount) || amount < 1) {
    return { type: "error", text: "Amount must be at least 1." };
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
      text: `Failed to create item: ${(err as Error).message}`,
    };
  }

  revalidatePath("/admin/catalog");
  return { type: "success", text: `Item "${catalogName}" created.` };
}

export async function deleteCatalogItem(id: number): Promise<void> {
  const denied = await requireStaff();
  if (denied) return;
  if (!Number.isInteger(id)) return;

  await execute("DELETE FROM catalog_items WHERE id = :id", { id });
  revalidatePath("/admin/catalog");
}
