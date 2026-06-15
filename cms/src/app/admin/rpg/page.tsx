import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { PageHead, ACard } from "@/components/admin-ui";
import { Swords, Sparkles } from "lucide-react";
import { CreateCharacterModal, CharacterCard, type CharacterRow, type RulesetOption } from "./forms";

export const dynamic = "force-dynamic";

async function loadCharacters(rulesetId: number): Promise<{ rows: CharacterRow[]; error: string | null }> {
  try {
    const rows = await query<CharacterRow>(
      `SELECT c.id, c.user_id, u.username, u.look, c.name, c.ruleset_id,
              c.max_hp, c.atk, c.def, c.spd, c.max_resource,
              c.level, c.arma, c.rango, c.clase
         FROM rpg_characters c JOIN users u ON u.id = c.user_id
        WHERE c.ruleset_id = :r
        ORDER BY u.username`,
      { r: rulesetId },
    );
    return { rows, error: null };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

export default async function RpgAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ruleset?: string }>;
}) {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) redirect("/");

  const sp = await searchParams;
  const rulesets = await query<RulesetOption>("SELECT id, name FROM rpg_rulesets ORDER BY id").catch(() => []);
  const rulesetId = Number(sp.ruleset) || rulesets[0]?.id || 1;

  const { rows, error } = await loadCharacters(rulesetId);

  return (
    <div>
      <PageHead eyebrow="RPG" title="Fichas de personaje">
        <div className="flex items-center gap-2">
          <Link href={`/admin/rpg/abilities?ruleset=${rulesetId}`} className="abtn">
            <Sparkles size={14} strokeWidth={2} /> Habilidades
          </Link>
          <CreateCharacterModal rulesets={rulesets} />
        </div>
      </PageHead>

      <p className="mb-4 text-sm adim">
        Define los stats RPG de cada usuario por ruleset. El emulador los usa al unirse a un combate
        (<code>:rpg join</code>); sin ficha se usan valores por defecto (HP 100 · ATK 10 · DEF 10 · VEL 10).
      </p>

      {rulesets.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {rulesets.map((r) => (
            <Link key={r.id} href={`/admin/rpg?ruleset=${r.id}`}
              className={`top-tab${r.id === rulesetId ? " is-active" : ""}`}>{r.name}</Link>
          ))}
        </div>
      )}

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
            <p className="text-sm adim">Aún no hay fichas en este ruleset. Crea la primera con “Nueva ficha”.</p>
          </ACard>
        ) : (
          rows.map((c) => <CharacterCard key={c.id} character={c} rulesets={rulesets} />)
        )}
      </div>
    </div>
  );
}
