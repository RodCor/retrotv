import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { Panel } from "@/components/ui";
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
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 className="rt-display" style={{ fontSize: "1.8rem", margin: 0 }}>
          Clothing
        </h1>
        <p style={{ color: "var(--rt-muted, #777)", marginTop: "0.25rem" }}>
          Edit user looks and review purchasable clothing.
        </p>
      </header>

      <SetLookForm />

      <Panel>
        <h2 style={{ fontWeight: 800, marginTop: 0 }}>Purchasable clothing</h2>
        {clothingError ? (
          <p style={{ color: "var(--rt-muted, #777)" }}>
            Clothing catalog unavailable on this database
            <span style={{ display: "block", fontSize: "0.8rem", opacity: 0.7 }}>
              ({clothingError})
            </span>
          </p>
        ) : clothing.length === 0 ? (
          <p style={{ color: "var(--rt-muted, #777)" }}>No clothing entries found.</p>
        ) : (
          <table className="rt-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Set id</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {clothing.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.setid}</td>
                  <td>{c.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
