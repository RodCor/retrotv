import Link from "next/link";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import {
  ACard, ABtn, PageHead, Tag, TableWrap, ShoppingBag, Sparkles,
  Eye, EyeOff, Trash2, ChevronRight, Home,
} from "@/components/admin-ui";
import { CreateItemForm, CreatePageForm, RenamePage } from "./forms";
import { deleteCatalogItem, deleteCatalogPage, togglePageVisible } from "./actions";

export const dynamic = "force-dynamic";

interface PageRow { id: number; parent_id: number; caption: string; min_rank: number; visible: string; }
interface ItemRow { id: number; catalog_name: string; cost_credits: number; cost_points: number; item_ids: string; amount: number; }

/** Compact display for an item_ids value that may be one or several base ids. */
function ItemIds({ value }: { value: string }) {
  const ids = String(value ?? "").split(/[,;]/).filter(Boolean);
  const label = ids.length > 1 ? `${ids[0]} +${ids.length - 1}` : (ids[0] ?? "—");
  return <span className="idchip" title={value}>{label}</span>;
}

export default async function CatalogAdminPage({
  searchParams,
}: { searchParams: Promise<{ p?: string }> }) {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) redirect("/");

  const { p } = await searchParams;
  const currentId = p && Number.isInteger(Number(p)) ? Number(p) : -1; // -1 = root

  // Current page (for breadcrumb + items + "add here" labels)
  const current = currentId === -1 ? null
    : await queryOne<PageRow>("SELECT id, parent_id, caption, min_rank, visible FROM catalog_pages WHERE id = :id", { id: currentId });
  if (currentId !== -1 && !current) redirect("/admin/catalog");

  // Breadcrumb: walk parent chain up to root
  const trail: { id: number; caption: string }[] = [];
  let walk: number | null = current ? current.id : null;
  let guard = 0;
  while (walk != null && walk !== -1 && guard++ < 16) {
    const row: PageRow | null = await queryOne<PageRow>("SELECT id, parent_id, caption, min_rank, visible FROM catalog_pages WHERE id = :id", { id: walk });
    if (!row) break;
    trail.unshift({ id: row.id, caption: row.caption });
    walk = row.parent_id;
  }

  // Children of the current node
  const children = await query<PageRow>(
    "SELECT id, parent_id, caption, min_rank, visible FROM catalog_pages WHERE parent_id = :pid ORDER BY order_num, caption",
    { pid: currentId },
  );
  const childIds = children.map((c) => c.id);

  // Content counts per child (sub-pages + items), so folders show what's inside
  const subCounts = new Map<number, number>();
  const itemCounts = new Map<number, number>();
  if (childIds.length) {
    const inList = childIds.join(",");
    for (const r of await query<{ parent_id: number; n: number }>(`SELECT parent_id, COUNT(*) AS n FROM catalog_pages WHERE parent_id IN (${inList}) GROUP BY parent_id`)) subCounts.set(r.parent_id, r.n);
    for (const r of await query<{ page_id: number; n: number }>(`SELECT page_id, COUNT(*) AS n FROM catalog_items WHERE page_id IN (${inList}) GROUP BY page_id`)) itemCounts.set(r.page_id, r.n);
  }

  // Items directly on the current page
  const items = currentId === -1 ? [] : await query<ItemRow>(
    "SELECT id, catalog_name, cost_credits, cost_points, item_ids, amount FROM catalog_items WHERE page_id = :pid ORDER BY order_number, id",
    { pid: currentId },
  );

  const hereLabel = current ? current.caption : "Root";

  return (
    <div>
      <PageHead eyebrow="Shop" title="Catalog">
        <ABtn href="/admin/catalog" variant="default" size="xs"><Home size={13} strokeWidth={2} />Root</ABtn>
      </PageHead>

      {/* breadcrumb */}
      <div className="acard acard-pad mb-4">
        <nav className="crumb">
          <Link href="/admin/catalog">Root</Link>
          {trail.map((c, i) => (
            <span key={c.id} className="contents">
              <span className="sep">/</span>
              {i === trail.length - 1
                ? <span className="cur">{c.caption}</span>
                : <Link href={`/admin/catalog?p=${c.id}`}>{c.caption}</Link>}
            </span>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        {/* ---- left: tree + items ---- */}
        <div className="space-y-4">
          <ACard title={current ? "Pages inside this page" : "Catalog pages"} icon={<ShoppingBag size={16} strokeWidth={2} />} pad={false}
            actions={<span className="text-xs adim">{children.length} page{children.length === 1 ? "" : "s"}</span>}>
            <TableWrap>
              <table className="dtable">
                <thead><tr><th className="cap">Page</th><th>Contains</th><th className="num">Rank</th><th>Visible</th><th>Actions</th></tr></thead>
                <tbody>
                  {children.length === 0 ? (
                    <tr><td colSpan={5} className="adim">No sub-pages here.</td></tr>
                  ) : children.map((c) => (
                    <tr key={c.id}>
                      <td className="cap">
                        <Link href={`/admin/catalog?p=${c.id}`} className="ell flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
                          <ChevronRight size={13} strokeWidth={2} style={{ color: "var(--cyan)", flexShrink: 0 }} />
                          <span className="ell">{c.caption}</span>
                        </Link>
                      </td>
                      <td className="adim text-xs">
                        {subCounts.get(c.id) ? `${subCounts.get(c.id)} pages` : ""}
                        {subCounts.get(c.id) && itemCounts.get(c.id) ? " · " : ""}
                        {itemCounts.get(c.id) ? `${itemCounts.get(c.id)} items` : ""}
                        {!subCounts.get(c.id) && !itemCounts.get(c.id) ? "empty" : ""}
                      </td>
                      <td className="num">{c.min_rank}</td>
                      <td>{c.visible === "1" ? <Tag color="green">Visible</Tag> : <Tag color="gray">Hidden</Tag>}</td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1">
                          <ABtn href={`/admin/catalog?p=${c.id}`} variant="default" size="xs"><ChevronRight size={13} strokeWidth={2} />Open</ABtn>
                          <RenamePage id={c.id} caption={c.caption} />
                          <form action={togglePageVisible.bind(null, c.id)}>
                            <ABtn type="submit" variant="default" size="xs">{c.visible === "1" ? <EyeOff size={13} strokeWidth={2} /> : <Eye size={13} strokeWidth={2} />}</ABtn>
                          </form>
                          <form action={deleteCatalogPage.bind(null, c.id)}>
                            <ABtn type="submit" variant="danger" size="xs"><Trash2 size={13} strokeWidth={2} /></ABtn>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </ACard>

          {current && (
            <ACard title="Items on this page" icon={<Sparkles size={16} strokeWidth={2} />} pad={false}
              actions={<span className="text-xs adim">{items.length} item{items.length === 1 ? "" : "s"}</span>}>
              <TableWrap>
                <table className="dtable">
                  <thead><tr><th className="cap">Name</th><th>Base id</th><th className="num">Credits</th><th className="num">Points</th><th className="num">Qty</th><th>Actions</th></tr></thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={6} className="adim">No items on this page.</td></tr>
                    ) : items.map((it) => (
                      <tr key={it.id}>
                        <td className="cap"><span className="ell">{it.catalog_name}</span></td>
                        <td><ItemIds value={it.item_ids} /></td>
                        <td className="num">{it.cost_credits || "—"}</td>
                        <td className="num">{it.cost_points || "—"}</td>
                        <td className="num">{it.amount}</td>
                        <td>
                          <form action={deleteCatalogItem.bind(null, it.id)}>
                            <ABtn type="submit" variant="danger" size="xs"><Trash2 size={13} strokeWidth={2} /></ABtn>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </ACard>
          )}
        </div>

        {/* ---- right: contextual create ---- */}
        <div className="space-y-4">
          <ACard title="Add page" icon={<ShoppingBag size={16} strokeWidth={2} />}>
            <CreatePageForm parentId={currentId} here={hereLabel} />
          </ACard>
          {current && (
            <ACard title="Add item" icon={<Sparkles size={16} strokeWidth={2} />}>
              <CreateItemForm pageId={current.id} here={hereLabel} />
            </ACard>
          )}
        </div>
      </div>
    </div>
  );
}
