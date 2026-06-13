import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import {
  ACard,
  ABtn,
  PageHead,
  Tag,
  TableWrap,
  ShoppingBag,
  Sparkles,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Plus,
} from "@/components/admin-ui";
import { CreateItemForm, CreatePageForm } from "./forms";
import {
  deleteCatalogItem,
  deleteCatalogPage,
  togglePageVisible,
} from "./actions";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 25;

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

export default async function CatalogAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    redirect("/");
  }

  const { q } = await searchParams;
  const search = (q ?? "").trim();
  const like = `%${search}%`;

  const totalRow = await queryOne<{ total: number }>(
    search
      ? `SELECT COUNT(*) AS total FROM catalog_pages WHERE caption LIKE :like`
      : `SELECT COUNT(*) AS total FROM catalog_pages`,
    search ? { like } : {},
  );
  const totalPages = totalRow?.total ?? 0;

  const pages = await query<CatalogPageRow>(
    `SELECT id, parent_id, caption, min_rank, visible, order_num
       FROM catalog_pages
      ${search ? "WHERE caption LIKE :like" : ""}
      ORDER BY order_num
      LIMIT ${PAGE_LIMIT}`,
    search ? { like } : {},
  );

  // For the page_id <Select>, list all pages (caption + id), unfiltered.
  const allPages = await query<{ id: number; caption: string }>(
    `SELECT id, caption FROM catalog_pages ORDER BY order_num`,
  );

  const items = await query<CatalogItemRow>(
    `SELECT ci.id, ci.catalog_name, ci.cost_credits, ci.cost_points,
            ci.page_id, ci.item_ids
       FROM catalog_items ci
      ORDER BY ci.id DESC
      LIMIT 30`,
  );

  const pageOptions = allPages.map((p) => ({ id: p.id, caption: p.caption }));

  return (
    <div>
      <PageHead eyebrow="Shop" title="Catalog" />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* ---------------------------- left: lists ---------------------------- */}
        <div className="space-y-4">
          <ACard
            title="Catalog pages"
            icon={<ShoppingBag size={16} strokeWidth={2} />}
            pad={false}
            actions={
              <span className="text-xs text-[var(--muted,#888)]">
                showing {pages.length} of {totalPages}
              </span>
            }
          >
            <form
              method="get"
              className="flex items-center gap-2 border-b border-[var(--line,#222)] px-3 py-2"
            >
              <Search size={14} strokeWidth={2} className="text-[var(--muted,#888)]" />
              <input
                name="q"
                defaultValue={search}
                placeholder="Search caption…"
                className="afield"
                style={{ flex: 1 }}
              />
              <ABtn type="submit" variant="primary" size="xs">
                Search
              </ABtn>
              {search && (
                <ABtn href="/admin/catalog" variant="default" size="xs">
                  Clear
                </ABtn>
              )}
            </form>

            <TableWrap>
              <table className="dtable">
                <thead>
                  <tr>
                    <th className="num">ID</th>
                    <th>Caption</th>
                    <th>Min rank</th>
                    <th>Visible</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        {search ? "No pages match that search." : "No catalog pages yet."}
                      </td>
                    </tr>
                  ) : (
                    pages.map((p) => (
                      <tr key={p.id}>
                        <td className="num">{p.id}</td>
                        <td>{p.caption}</td>
                        <td>{p.min_rank}</td>
                        <td>
                          {p.visible === "1" ? (
                            <Tag color="green">Visible</Tag>
                          ) : (
                            <Tag color="gray">Hidden</Tag>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <form action={togglePageVisible.bind(null, p.id)}>
                              <ABtn type="submit" variant="default" size="xs">
                                {p.visible === "1" ? (
                                  <>
                                    <EyeOff size={14} strokeWidth={2} />
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <Eye size={14} strokeWidth={2} />
                                    Show
                                  </>
                                )}
                              </ABtn>
                            </form>
                            <form action={deleteCatalogPage.bind(null, p.id)}>
                              <ABtn type="submit" variant="danger" size="xs">
                                <Trash2 size={14} strokeWidth={2} />
                              </ABtn>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableWrap>
          </ACard>

          <ACard
            title="Catalog items"
            icon={<Sparkles size={16} strokeWidth={2} />}
            pad={false}
            actions={
              <span className="text-xs text-[var(--muted,#888)]">recent 30</span>
            }
          >
            <TableWrap>
              <table className="dtable">
                <thead>
                  <tr>
                    <th className="num">ID</th>
                    <th>Name</th>
                    <th className="num">Base id</th>
                    <th className="num">Page</th>
                    <th className="num">Credits</th>
                    <th className="num">Points</th>
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
                        <td className="num">{it.id}</td>
                        <td>{it.catalog_name}</td>
                        <td className="num">{it.item_ids}</td>
                        <td className="num">#{it.page_id}</td>
                        <td className="num">{it.cost_credits}</td>
                        <td className="num">{it.cost_points}</td>
                        <td>
                          <form action={deleteCatalogItem.bind(null, it.id)}>
                            <ABtn type="submit" variant="danger" size="xs">
                              <Trash2 size={14} strokeWidth={2} />
                            </ABtn>
                          </form>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableWrap>
          </ACard>
        </div>

        {/* --------------------------- right: create --------------------------- */}
        <div className="space-y-4">
          <ACard title="New page" icon={<Plus size={16} strokeWidth={2} />}>
            <CreatePageForm pages={pageOptions} />
          </ACard>

          <ACard title="New item" icon={<Plus size={16} strokeWidth={2} />}>
            <CreateItemForm pages={pageOptions} />
          </ACard>
        </div>
      </div>
    </div>
  );
}
