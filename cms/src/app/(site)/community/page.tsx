import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Panel } from "@/components/ui";
import { SectionHead, PostCard } from "@/components/site-content";
import { ADMIN_MIN_RANK } from "@/lib/auth";
import { query } from "@/lib/db";
import { config } from "@/lib/config";
import { getPosts } from "@/lib/content";
import { avatarImageUrl } from "@/lib/habbo-imaging";

export const metadata = { title: "Comunidad" };
export const dynamic = "force-dynamic";

interface StaffRow {
  username: string;
  look: string;
  rank: number;
  rank_name: string | null;
  badge: string | null;
}
interface MemberRow {
  username: string;
  look: string;
  motto: string | null;
}

async function loadStaff(): Promise<StaffRow[]> {
  try {
    return await query<StaffRow>(
      `SELECT u.username, u.look, u.rank, p.rank_name, p.badge
         FROM users u JOIN permissions p ON p.id = u.rank
        WHERE u.rank >= :minRank ORDER BY u.rank DESC`,
      { minRank: ADMIN_MIN_RANK },
    );
  } catch {
    return [];
  }
}

async function loadNewest(): Promise<MemberRow[]> {
  try {
    return await query<MemberRow>(
      "SELECT username, look, motto FROM users WHERE username <> '[SYSTEM]' ORDER BY id DESC LIMIT 12",
    );
  } catch {
    return [];
  }
}

export default async function CommunityPage() {
  const [news, staff, members] = await Promise.all([
    getPosts("news", 9),
    loadStaff(),
    loadNewest(),
  ]);
  const promoBase = config.assets.promoImageUrl;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="relative z-10 flex-1">
        <header className="shell pt-10 md:pt-14">
          <h1 className="rt-display text-4xl" style={{ color: "var(--rt-brand)" }}>Comunidad</h1>
          <p className="mt-2 max-w-2xl font-semibold" style={{ color: "var(--ink-soft)" }}>
            Novedades del hotel, el equipo que lo cuida y las caras nuevas que se unen cada día.
          </p>
        </header>

        {/* Community news */}
        {news.length > 0 && (
          <section className="shell pt-8">
            <SectionHead eyebrow="Novedades" title="Noticias de la comunidad" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((p) => (
                <PostCard key={p.id} post={p} promoBase={promoBase} full />
              ))}
            </div>
          </section>
        )}

        {/* Staff */}
        <section className="shell pt-12">
          <SectionHead eyebrow="El equipo" title="Equipo del hotel" />
          {staff.length === 0 ? (
            <Panel muted><p className="font-semibold" style={{ color: "var(--ink-soft)" }}>El equipo está tomando un café. ¡Vuelve pronto!</p></Panel>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((s) => (
                <Panel key={s.username} className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="rt-avatar" style={{ height: "90px", width: "auto" }}
                    src={avatarImageUrl(s.look, { size: "m", headOnly: true })} alt={s.username} />
                  <div className="min-w-0">
                    <div className="truncate text-lg font-extrabold" style={{ color: "var(--ink)" }}>{s.username}</div>
                    {s.rank_name && (
                      <span className="rt-badge" style={{ background: "rgba(0,163,224,0.12)", borderColor: "rgba(0,163,224,0.4)", color: "var(--cyan)" }}>{s.rank_name}</span>
                    )}
                    {s.badge && <div className="mt-1 text-xs font-bold" style={{ color: "var(--ink-dim)" }}>Placa: {s.badge}</div>}
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </section>

        {/* Newest members */}
        <section className="shell pt-12 pb-14">
          <SectionHead eyebrow="Bienvenidos" title="Nuevos miembros" />
          {members.length === 0 ? (
            <Panel muted><p className="font-semibold" style={{ color: "var(--ink-soft)" }}>Aún no hay miembros — ¡sé el primero en unirte!</p></Panel>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {members.map((m) => (
                <Panel key={m.username} muted className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="rt-avatar mx-auto" style={{ height: "110px", width: "auto" }}
                    src={avatarImageUrl(m.look, { size: "l", direction: 2, headDirection: 2 })} alt={m.username} />
                  <div className="mt-2 truncate text-sm font-extrabold" style={{ color: "var(--ink)" }}>{m.username}</div>
                  {m.motto && <div className="mt-1 truncate text-xs font-semibold" style={{ color: "var(--ink-dim)" }}>{m.motto}</div>}
                </Panel>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
