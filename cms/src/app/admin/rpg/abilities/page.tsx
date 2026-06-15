import Link from "next/link";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { PageHead, ACard } from "@/components/admin-ui";
import { CreateAbilityModal, AbilityCard, type AbilityRow } from "./forms";

export const dynamic = "force-dynamic";

interface Ruleset { id: number; name: string }

export default async function AbilitiesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ruleset?: string; rama?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) redirect("/");

  const sp = await searchParams;
  const rulesets = await query<Ruleset>("SELECT id, name FROM rpg_rulesets ORDER BY id").catch(() => []);
  const rulesetId = Number(sp.ruleset) || rulesets[0]?.id || 1;
  const rama = (sp.rama ?? "").trim();
  const q = (sp.q ?? "").trim();

  const ramas = await query<{ rama: string }>(
    "SELECT DISTINCT rama FROM rpg_abilities WHERE ruleset_id = :r AND rama <> '' ORDER BY rama",
    { r: rulesetId },
  ).catch(() => []);

  const where = ["ruleset_id = :r"];
  const params: Record<string, unknown> = { r: rulesetId };
  if (rama) { where.push("rama = :rama"); params.rama = rama; }
  if (q) { where.push("(name LIKE :q OR formula LIKE :q)"); params.q = `%${q}%`; }

  const total = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM rpg_abilities WHERE ${where.join(" AND ")}`, params,
  ).then((r) => Number(r[0]?.n ?? 0)).catch(() => 0);

  const rows = await query<AbilityRow>(
    `SELECT id, ruleset_id, name, rama, tipo, rango, cost, formula, range_shape, range_n,
            area_size, cooldown, effect_text
       FROM rpg_abilities WHERE ${where.join(" AND ")}
      ORDER BY rama, name LIMIT 60`, params,
  ).catch(() => []);

  const link = (p: Record<string, string>) => {
    const u = new URLSearchParams({ ruleset: String(rulesetId), ...(rama && { rama }), ...(q && { q }), ...p });
    return `/admin/rpg/abilities?${u}`;
  };

  return (
    <div>
      <PageHead eyebrow="RPG · personalización" title="Habilidades">
        <CreateAbilityModal rulesetId={rulesetId} />
      </PageHead>

      {/* ruleset tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {rulesets.map((r) => (
          <Link key={r.id} href={`/admin/rpg/abilities?ruleset=${r.id}`}
            className={`top-tab${r.id === rulesetId ? " is-active" : ""}`}>{r.name}</Link>
        ))}
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex items-center gap-2">
          <input type="hidden" name="ruleset" value={rulesetId} />
          {rama && <input type="hidden" name="rama" value={rama} />}
          <input name="q" defaultValue={q} placeholder="Buscar habilidad o fórmula…" className="afield" style={{ width: 220 }} />
        </form>
        {ramas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Link href={link({ rama: "" })} className={`chip-check${!rama ? " !border-cyan-400" : ""}`} style={rama ? {} : { borderColor: "var(--cyan)" }}>Todas</Link>
            {ramas.map((r) => (
              <Link key={r.rama} href={link({ rama: r.rama })} className="chip-check"
                style={r.rama === rama ? { borderColor: "var(--cyan)", color: "var(--cyan)" } : {}}>{r.rama}</Link>
            ))}
          </div>
        )}
      </div>

      <p className="aeyebrow mb-2 px-1">mostrando {rows.length} de {total}{rama ? ` en ${rama}` : ""}</p>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <ACard><p className="text-sm adim">No hay habilidades para este filtro.</p></ACard>
        ) : (
          rows.map((a) => <AbilityCard key={a.id} ability={a} />)
        )}
      </div>
    </div>
  );
}
