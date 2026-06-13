import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { Badge, Button, Panel } from "@/components/ui";
import { CreateItemForm, CreatePageForm } from "./forms";
import {
  deleteCatalogItem,
  deleteCatalogPage,
  togglePageVisible,
} from "./actions";

export const dynamic = "force-dynamic";

interface CatalogPageRow {
  id: number;
  parent_id: number;
  caption: string;
  min_rank: number;
  visible: string;
  order_num: number;
}

interface CatalogItemRow {
  id: number;
  catalog_name: string;
  cost_credits: number;
  cost_points: number;
  page_id: number;
  item_ids: string;
}

export default async function CatalogAdminPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    redirect("/");
  }

  const pages = await query<CatalogPageRow>(
    `SELECT id, parent_id, caption, min_rank, visible, order_num
       FROM catalog_pages
      ORDER BY order_num`,
  );

  const items = await query<CatalogItemRow>(
    `SELECT ci.id, ci.catalog_name, ci.cost_credits, ci.cost_points,
            ci.page_id, ci.item_ids
       FROM catalog_items ci
      ORDER BY ci.id DESC
      LIMIT 30`,
  );

  const pageOptions = pages.map((p) => ({ id: p.id, caption: p.caption }));

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 className="rt-display" style={{ fontSize: "1.8rem", margin: 0 }}>
          Catalog
        </h1>
        <p style={{ color: "var(--rt-muted, #777)", marginTop: "0.25rem" }}>
          Manage shop pages and purchasable items.
        </p>
      </header>

      {/* ------------------------------- pages ------------------------------- */}
      <section
        style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <Panel>
          <h2 style={{ fontWeight: 800, marginTop: 0 }}>Catalog pages</h2>
          <table className="rt-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Caption</th>
                <th>Parent</th>
                <th>Min rank</th>
                <th>Order</th>
                <th>Visible</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 ? (
                <tr>
                  <td colSpan={7}>No catalog pages yet.</td>
                </tr>
              ) : (
                pages.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td style={{ fontWeight: 700 }}>{p.caption}</td>
                    <td>{p.parent_id < 0 ? "root" : p.parent_id}</td>
                    <td>{p.min_rank}</td>
                    <td>{p.order_num}</td>
                    <td>
                      <Badge color={p.visible === "1" ? "#7ed957" : "#bbb"}>
                        {p.visible === "1" ? "Visible" : "Hidden"}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <form action={togglePageVisible.bind(null, p.id)}>
                          <Button type="submit" variant="blue">
                            {p.visible === "1" ? "Hide" : "Show"}
                          </Button>
                        </form>
                        <form action={deleteCatalogPage.bind(null, p.id)}>
                          <Button type="submit" variant="danger">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>

        <CreatePageForm pages={pageOptions} />
      </section>

      {/* ------------------------------- items ------------------------------- */}
      <section
        style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <Panel>
          <h2 style={{ fontWeight: 800, marginTop: 0 }}>Recent catalog items</h2>
          <table className="rt-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Base id</th>
                <th>Page</th>
                <th>Credits</th>
                <th>Points</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7}>No catalog items yet.</td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.id}</td>
                    <td style={{ fontWeight: 700 }}>{it.catalog_name}</td>
                    <td>{it.item_ids}</td>
                    <td>
                      <Link href="#" prefetch={false}>
                        #{it.page_id}
                      </Link>
                    </td>
                    <td>{it.cost_credits}</td>
                    <td>{it.cost_points}</td>
                    <td>
                      <form action={deleteCatalogItem.bind(null, it.id)}>
                        <Button type="submit" variant="danger">
                          Delete
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>

        <CreateItemForm pages={pageOptions} />
      </section>
    </div>
  );
}
