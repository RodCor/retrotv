import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { PageHead, ACard } from "@/components/admin-ui";
import { Swords } from "lucide-react";
import { CreateCharacterModal, CharacterCard, type CharacterRow } from "./forms";

export const dynamic = "force-dynamic";

async function loadCharacters(): Promise<{ rows: CharacterRow[]; error: string | null }> {
  try {
    const rows = await query<CharacterRow>(
      `SELECT c.id, c.user_id, u.username, u.look, c.name,
              c.max_hp, c.atk, c.def, c.spd, c.max_resource
         FROM rpg_characters c JOIN users u ON u.id = c.user_id
        ORDER BY u.username`,
    );
    return { rows, error: null };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

export default async function RpgAdminPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) redirect("/");

  const { rows, error } = await loadCharacters();

  return (
    <div>
      <PageHead eyebrow="RPG" title="Fichas de personaje">
        <CreateCharacterModal />
      </PageHead>

      <p className="mb-4 text-sm adim">
        Define los stats RPG de cada usuario. El emulador los usa al unirse a un combate
        (<code>:rpg join</code>); sin ficha se usan valores por defecto (HP 100 · ATK 10 · DEF 10 · VEL 10).
      </p>

      <div className="space-y-3">
        {error ? (
          <ACard>
            <p className="text-sm adim">
              La tabla de personajes no está disponible.
              <span className="mt-1 block text-xs opacity-70">{error}</span>
            </p>
          </ACard>
        ) : rows.length === 0 ? (
          <ACard title="Personajes" icon={<Swords size={16} strokeWidth={2} />}>
            <p className="text-sm adim">Aún no hay fichas. Crea la primera con “Nueva ficha”.</p>
          </ACard>
        ) : (
          rows.map((c) => <CharacterCard key={c.id} character={c} />)
        )}
      </div>
    </div>
  );
}
