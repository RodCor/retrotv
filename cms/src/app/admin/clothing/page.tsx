import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import {
  PageHead,
  ACard,
  TableWrap,
  Shirt,
} from "@/components/admin-ui";
import { SetLookForm } from "./forms";

export const dynamic = "force-dynamic";

interface ClothingRow {
  id: number;
  name: string;
  setid: string;
}

async function loadClothing(): Promise<{ rows: ClothingRow[]; total: number; error: string | null }> {
  try {
    const rows = await query<ClothingRow>(
      "SELECT id, name, setid FROM catalog_clothing ORDER BY name LIMIT 100",
    );
    const t = await query<{ n: number }>("SELECT COUNT(*) AS n FROM catalog_clothing");
    return { rows, total: Number(t[0]?.n ?? rows.length), error: null };
  } catch (err) {
    return { rows: [], total: 0, error: (err as Error).message };
  }
}

export default async function ClothingAdminPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    redirect("/");
  }

  const { rows: clothing, total: clothingTotal, error: clothingError } = await loadClothing();

  return (
    <div>
      <PageHead eyebrow="Looks" title="Clothing" />

      <SetLookForm />

      <div className="mt-4">
        <ACard
          title="Purchasable clothing"
          icon={<Shirt size={16} strokeWidth={2} />}
          pad={false}
          actions={!clothingError && <span className="text-xs adim">showing {clothing.length} of {clothingTotal}</span>}
        >
          {clothingError ? (
            <p className="acard-pad text-sm adim">
              Clothing catalog unavailable on this database.
              <span className="mt-1 block text-xs opacity-70">{clothingError}</span>
            </p>
          ) : clothing.length === 0 ? (
            <p className="acard-pad text-sm adim">No purchasable-clothing entries on this hotel yet.</p>
          ) : (
            <TableWrap>
              <table className="dtable">
                <thead>
                  <tr>
                    <th className="num">ID</th>
                    <th className="cap">Name</th>
                    <th>Figure sets</th>
                  </tr>
                </thead>
                <tbody>
                  {clothing.map((c) => (
                    <tr key={c.id}>
                      <td className="num">{c.id}</td>
                      <td className="cap"><span className="ell">{c.name}</span></td>
                      <td><span className="idchip" title={c.setid}>{c.setid}</span></td>
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
