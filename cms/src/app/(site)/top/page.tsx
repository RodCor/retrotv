import Link from "next/link";
import { Trophy, Coins, Clock, Award } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { SectionHead } from "@/components/site-content";
import { getRankings, type RankMetric } from "@/lib/content";
import { avatarImageUrl } from "@/lib/habbo-imaging";

export const metadata = { title: "Top 10" };
export const dynamic = "force-dynamic";

const TABS: { key: RankMetric; q: string; label: string; Icon: typeof Trophy; unit: (v: number) => string }[] = [
  { key: "score", q: "nivel", label: "Nivel", Icon: Award, unit: (v) => `${v.toLocaleString()} pts` },
  { key: "credits", q: "creditos", label: "Créditos", Icon: Coins, unit: (v) => v.toLocaleString() },
  { key: "time", q: "tiempo", label: "Tiempo en línea", Icon: Clock, unit: fmtTime },
];

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m} m`;
  return `${m} m`;
}

export default async function TopPage({
  searchParams,
}: {
  searchParams: Promise<{ por?: string }>;
}) {
  const { por } = await searchParams;
  const tab = TABS.find((t) => t.q === por) ?? TABS[0];
  const rows = await getRankings(tab.key, 10);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  // podium display order: 2nd, 1st, 3rd
  const order = [podium[1], podium[0], podium[2]];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="relative z-10 flex-1">
        <section className="shell pt-10 pb-14 md:pt-14">
          <SectionHead
            eyebrow="Clasificación"
            title="Top 10 del hotel"
            sub="Los habbos más destacados de RetroTV. ¿Conseguirás entrar en el ranking?"
          />

          {/* metric tabs */}
          <div className="top-tabs">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/top?por=${t.q}`}
                className={`top-tab${t.key === tab.key ? " is-active" : ""}`}
              >
                <t.Icon size={15} strokeWidth={2.2} /> {t.label}
              </Link>
            ))}
          </div>

          {rows.length === 0 ? (
            <div className="panel panel-pad text-center">
              <p style={{ color: "var(--ink-soft)" }}>Todavía no hay suficientes datos para el ranking.</p>
            </div>
          ) : (
            <>
              {/* podium */}
              <div className="podium">
                {order.map((p, i) =>
                  p ? (
                    <div key={p.username} className={`podium-spot rank-${i === 1 ? 1 : i === 0 ? 2 : 3}`}>
                      <span className="podium-medal">{i === 1 ? "1" : i === 0 ? "2" : "3"}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="pixel-img podium-av"
                        src={avatarImageUrl(p.look, { size: "l", direction: 2, headDirection: 2 })}
                        alt={p.username}
                      />
                      <div className="podium-name">{p.username}</div>
                      <div className="podium-val">{tab.unit(Number(p.value))}</div>
                      <div className="podium-bar" />
                    </div>
                  ) : (
                    <div key={`empty-${i}`} className="podium-spot" />
                  ),
                )}
              </div>

              {/* ranks 4-10 */}
              {rest.length > 0 && (
                <div className="panel mt-4 overflow-hidden">
                  {rest.map((p, idx) => (
                    <div key={p.username} className="rank-row">
                      <span className="rank-num">{idx + 4}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="rank-av"
                        src={avatarImageUrl(p.look, { size: "m", headOnly: true })}
                        alt={p.username}
                      />
                      <span className="rank-name">{p.username}</span>
                      <span className="rank-val">{tab.unit(Number(p.value))}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
