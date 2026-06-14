import Link from "next/link";
import { Home as HomeIcon, Users, Gem, Play } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { config } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { avatarImageUrl } from "@/lib/habbo-imaging";

type Stats = { users: number; online: number; rooms: number };

async function loadStats(): Promise<Stats> {
  async function count(sql: string): Promise<number> {
    try {
      const rows = await query<{ n: number }>(sql);
      return Number(rows[0]?.n ?? 0);
    } catch {
      return 0;
    }
  }
  const [users, online, rooms] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM users"),
    count("SELECT COUNT(*) AS n FROM users WHERE online = '1'"),
    count("SELECT COUNT(*) AS n FROM rooms"),
  ]);
  return { users, online, rooms };
}

const SAMPLE_LOOKS = [
  "hr-100-61.hd-180-1.ch-210-66.lg-270-82.sh-290-80",
  "hr-3163-39.hd-180-2.ch-210-1408.lg-275-1280.sh-3068-1408",
  "hr-831-49.hd-209-10.ch-3030-82.lg-3023-82.sh-905-62",
  "hr-545-31.hd-185-1.ch-255-66.lg-280-110.sh-300-62",
  "hr-115-42.hd-190-10.ch-220-1408.lg-285-92.sh-295-80",
  "hr-3012-45.hd-600-1.ch-3110-66.lg-3058-82.sh-3016-80",
];

const FEATURES = [
  { Icon: HomeIcon, color: "var(--amber)", title: "Diseña salas", body: "Coge furnis del catálogo y construye el sitio de tus sueños — píxel a píxel." },
  { Icon: Users, color: "var(--cyan)", title: "Haz amigos", body: "Conoce a habbos de todas partes, monta fiestas y amplía tu lista de amigos cada día." },
  { Icon: Gem, color: "var(--pink)", title: "Colecciona raros", body: "Caza raros, tradea con cabeza y presume de la colección más espectacular del hotel." },
];

export default async function Home() {
  const session = await getSession();
  const stats = await loadStats();
  const playHref = session ? "/play" : "/register";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="relative z-10 flex-1">
        {/* ---------------------------------- hero ---------------------------------- */}
        <section className="shell grid items-center gap-10 pt-12 pb-10 md:grid-cols-[1.15fr_0.85fr] md:pt-20 md:pb-16">
          <div>
            <p className="eyebrow rise inline-flex items-center gap-2">
              <span style={{ color: "var(--green)" }}>●</span> Embarcando nuevos habbos
            </p>
            <h1 className="rise d1 mt-4 text-[clamp(2.6rem,6vw,4.6rem)]">
              Tu hotel retro,
              <br />
              <span className="text-gradient">de vuelta al aire.</span>
            </h1>
            <p className="rise d2 mt-5 max-w-md text-lg" style={{ color: "var(--ink-soft)" }}>
              Construye salas, viste a tu habbo, colecciona raros y queda con tus amigos en un
              mundo virtual pixelado — directo en tu navegador.
            </p>
            <div className="rise d3 mt-7 flex flex-wrap items-center gap-3">
              <Link href={playHref} prefetch={false} className="btn btn-amber inline-flex items-center gap-2" style={{ fontSize: "1.02rem", padding: "0.8rem 1.5rem" }}>
                <Play size={17} strokeWidth={2.5} fill="currentColor" />
                {session ? "Entrar al hotel" : "Juega gratis"}
              </Link>
              <Link href="/community" className="btn btn-ghost" style={{ padding: "0.8rem 1.3rem" }}>
                Explorar comunidad
              </Link>
            </div>
            <div className="rise d4 mt-8 flex items-center gap-6">
              <MiniStat value={stats.users} label="Habbos" accent="var(--amber)" />
              <span style={{ width: 1, height: 34, background: "var(--line-strong)" }} />
              <MiniStat value={stats.online} label="En línea" accent="var(--green)" />
              <span style={{ width: 1, height: 34, background: "var(--line-strong)" }} />
              <MiniStat value={stats.rooms} label="Salas" accent="var(--cyan)" />
            </div>
          </div>

          {/* hero avatar with glow stage */}
          <div className="rise d2 relative grid place-items-center">
            <div
              aria-hidden
              className="absolute h-72 w-72 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,157,47,0.35), transparent 65%)", filter: "blur(8px)" }}
            />
            <div
              aria-hidden
              className="absolute bottom-6 h-6 w-40 rounded-full"
              style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="pixel-img floaty relative"
              style={{ height: "320px", width: "auto", filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.5))" }}
              src={avatarImageUrl(SAMPLE_LOOKS[1], { size: "l", direction: 2, headDirection: 2, action: "wav" })}
              alt="A waving habbo avatar"
            />
          </div>
        </section>

        {/* --------------------------------- features ------------------------------- */}
        <section className="shell pb-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Lo mejor</p>
              <h2 className="mt-1 text-3xl">Todo Habbo, renovado</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`panel panel-pad rise d${i + 1} transition-transform hover:-translate-y-1`}>
                <div
                  className="grid h-12 w-12 place-items-center rounded-xl"
                  style={{ background: "#f3f9fd", border: "1px solid var(--line)", boxShadow: `0 6px 16px -10px ${f.color}`, color: f.color }}
                >
                  <f.Icon size={22} strokeWidth={2.2} />
                </div>
                <h3 className="mt-4 text-xl">{f.title}</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------- join the crowd --------------------------- */}
        <section className="shell pb-6">
          <div className="panel panel-pad panel-glow-amber overflow-hidden">
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <p className="eyebrow">Únete</p>
                <h2 className="mt-1 text-3xl">Crea tu habbo en segundos</h2>
                <p className="mt-3 max-w-md text-sm" style={{ color: "var(--ink-soft)" }}>
                  Elige un nombre, personaliza tu look y entra directo al hotel. Es gratis,
                  es rápido, y tu sala te está esperando.
                </p>
                <Link href={playHref} prefetch={false} className="btn btn-amber mt-5">Crea tu habbo →</Link>
              </div>
              <div className="flex flex-wrap items-end justify-center gap-1">
                {SAMPLE_LOOKS.map((look, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${look}-${i}`}
                    className="pixel-img"
                    style={{ height: "110px", width: "auto", filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.4))" }}
                    src={avatarImageUrl(look, { size: "l", direction: 2, headDirection: 2 })}
                    alt={`Sample habbo avatar ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function MiniStat({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div>
      <div className="font-pixel text-2xl" style={{ color: accent }}>{value.toLocaleString()}</div>
      <div className="text-xs font-semibold" style={{ color: "var(--ink-dim)" }}>{label}</div>
    </div>
  );
}
