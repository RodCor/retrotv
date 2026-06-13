import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import {
  PageHead,
  ACard,
  TableWrap,
  ShoppingBag,
  Coins,
} from "@/components/admin-ui";
import { SetLookForm } from "./forms";

export const dynamic = "force-dynamic";

interface ClothingRow {
  id: number;
  setid: number;
  price: number;
}

async function loadClothing(): Promise<{ rows: ClothingRow[]; error: string | null }> {
  try {
    const rows = await query<ClothingRow>(
      "SELECT id, setid, price FROM catalog_clothing ORDER BY id LIMIT 50",
    );
    return { rows, error: null };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

export default async function ClothingAdminPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    redirect("/");
  }

  const { rows: clothing, error: clothingError } = await loadClothing();

  return (
    <div>
      <PageHead eyebrow="Looks" title="Clothing" />

      <SetLookForm />

      <div className="mt-4">
        <ACard title="Purchasable clothing" icon={<ShoppingBag size={16} strokeWidth={2} />}>
          {clothingError ? (
            <p className="text-sm" style={{ color: "var(--muted, #777)" }}>
              Clothing catalog unavailable on this database.
              <span className="mt-1 block text-xs opacity-70">{clothingError}</span>
            </p>
          ) : clothing.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted, #777)" }}>
              No clothing entries found.
            </p>
          ) : (
            <TableWrap>
              <table className="dtable">
                <thead>
                  <tr>
                    <th className="num">ID</th>
                    <th className="num">Set id</th>
                    <th className="num">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {clothing.map((c) => (
                    <tr key={c.id}>
                      <td className="num">{c.id}</td>
                      <td className="num">{c.setid}</td>
                      <td className="num">
                        <span className="inline-flex items-center gap-1">
                          <Coins size={12} strokeWidth={2} />
                          {c.price}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </ACard>
      </div>
    </div>
  );
}
