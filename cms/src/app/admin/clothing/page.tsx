import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import {
  PageHead,
  ACard,
  TableWrap,
  Shirt,
  ImageIcon,
} from "@/components/admin-ui";
import { SetLookForm } from "./forms";
import { MediaThumb } from "@/components/media-thumb";
import { setTypeMap, buildClothingFigure } from "@/lib/figure-sets";
import { avatarImageUrl } from "@/lib/habbo-imaging";

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

  // Resolve clothing sets -> a full avatar figure so each row can be previewed.
  // If FigureData can't be loaded we simply skip the preview column.
  let typeMap: Map<string, string> | null = null;
  try {
    typeMap = await setTypeMap();
  } catch {
    typeMap = null;
  }
  const lookFor = (setid: string): string | null => {
    if (!typeMap) return null;
    const figure = buildClothingFigure(typeMap, setid);
    return figure ? avatarImageUrl(figure, { size: "m", direction: 2, gesture: "sml" }) : null;
  };
  const lookForLarge = (setid: string): string | null => {
    if (!typeMap) return null;
    const figure = buildClothingFigure(typeMap, setid);
    return figure ? avatarImageUrl(figure, { size: "l", direction: 2, gesture: "sml" }) : null;
  };

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
                    <th className="thumb-col"></th>
                    <th className="num">ID</th>
                    <th className="cap">Name</th>
                    <th>Figure sets</th>
                  </tr>
                </thead>
                <tbody>
                  {clothing.map((c) => {
                    const look = lookFor(c.setid);
                    return (
                    <tr key={c.id}>
                      <td className="thumb-col">{look ? <MediaThumb src={look} large={lookForLarge(c.setid) ?? undefined} alt={c.name} /> : <span className="thumb thumb-empty"><ImageIcon size={14} strokeWidth={2} /></span>}</td>
                      <td className="num">{c.id}</td>
                      <td className="cap"><span className="ell">{c.name}</span></td>
                      <td><span className="idchip" title={c.setid}>{c.setid}</span></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </ACard>
      </div>
    </div>
  );
}
