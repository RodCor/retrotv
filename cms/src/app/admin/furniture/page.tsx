import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { config } from "@/lib/config";
import { PageHead } from "@/components/admin-ui";
import {
  FurnitureStudio,
  CreateFurniModal,
  type CatalogPageOption,
  type RecentOffer,
} from "./forms";

export const dynamic = "force-dynamic";

async function loadPages(): Promise<CatalogPageOption[]> {
  try {
    return await query<CatalogPageOption>(
      `SELECT id, caption FROM catalog_pages
        WHERE enabled = '1' AND caption <> ''
        ORDER BY caption LIMIT 400`,
    );
  } catch {
    return [];
  }
}

async function loadRecent(): Promise<RecentOffer[]> {
  try {
    return await query<RecentOffer>(
      `SELECT ci.id, ci.catalog_name, ci.item_ids AS item_id,
              ci.cost_credits, ci.cost_points, ci.points_type, ci.amount,
              ib.item_name, cp.caption AS page_caption
         FROM catalog_items ci
         LEFT JOIN items_base ib
                ON ib.id = CAST(SUBSTRING_INDEX(ci.item_ids, ';', 1) AS UNSIGNED)
         LEFT JOIN catalog_pages cp ON cp.id = ci.page_id
        ORDER BY ci.id DESC
        LIMIT 24`,
    );
  } catch {
    return [];
  }
}

export default async function FurnitureAdminPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) redirect("/");

  const [pages, recent] = await Promise.all([loadPages(), loadRecent()]);

  return (
    <div>
      <PageHead eyebrow="Catálogo" title="Mobiliario">
        <CreateFurniModal />
      </PageHead>

      {pages.length === 0 ? (
        <p className="text-sm adim">
          No hay páginas de catálogo todavía. Crea una en <span className="font-semibold">Catálogo</span> antes de añadir muebles.
        </p>
      ) : (
        <FurnitureStudio
          pages={pages}
          furniIconBase={config.assets.furniIconUrl}
          recent={recent}
        />
      )}
    </div>
  );
}
