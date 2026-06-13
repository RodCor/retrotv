import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ButtonLink, Panel } from "@/components/ui";
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
  {
    icon: "🏠",
    title: "Design rooms",
    body: "Snag furni from the catalog and build the hangout of your dreams — pixel by pixel.",
  },
  {
    icon: "🤝",
    title: "Make friends",
    body: "Meet thousands of habbos, throw parties, and grow your friends list every day.",
  },
  {
    icon: "🛋️",
    title: "Collect furni",
    body: "Hunt rares, trade smart, and show off the flashiest collection in the hotel.",
  },
];

export default async function Home() {
  const session = await getSession();
  const stats = await loadStats();
  const playHref = session ? "/play" : "/register";

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        {/* Hero */}
        <section className="mb-10">
          <Panel className="overflow-hidden">
            <div className="grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
              <div>
                <p
                  className="rt-badge mb-4 inline-block"
                  style={{ background: "var(--rt-accent)" }}
                >
                  ✨ Now boarding new habbos
                </p>
                <h1
                  className="rt-display text-5xl leading-tight md:text-6xl"
                  style={{ color: "var(--rt-brand)" }}
                >
                  Welcome to {config.hotel.name}
                </h1>
                <p
                  className="mt-4 max-w-lg text-lg font-semibold"
                  style={{ color: "var(--rt-ink-soft)" }}
                >
                  Your retro hotel is back on air. Build rooms, collect rare
                  furni, and party with friends — all in glorious pixel-perfect
                  style.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <ButtonLink href={playHref} variant="accent">
                    ▶ Play Now
                  </ButtonLink>
                  <ButtonLink href="/login" variant="ghost">
                    Login
                  </ButtonLink>
                </div>
              </div>

              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="rt-avatar"
                  style={{ height: "240px", width: "auto" }}
                  src={avatarImageUrl(SAMPLE_LOOKS[1], {
                    size: "l",
                    direction: 4,
                    headDirection: 4,
                    action: "wav",
                  })}
                  alt="A waving habbo avatar"
                />
              </div>
            </div>
          </Panel>
        </section>

        {/* Live stats strip */}
        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          <StatCard label="Habbos registered" value={stats.users} accent="var(--rt-brand)" />
          <StatCard label="Online right now" value={stats.online} accent="var(--rt-accent)" />
          <StatCard label="Rooms built" value={stats.rooms} accent="var(--rt-accent-2)" />
        </section>

        {/* Features */}
        <section className="mb-10">
          <h2
            className="rt-display mb-4 text-3xl"
            style={{ color: "var(--rt-brand)" }}
          >
            What can you do?
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <Panel key={f.title} muted className="h-full">
                <div className="text-4xl">{f.icon}</div>
                <h3 className="mt-3 text-xl font-extrabold" style={{ color: "var(--rt-ink)" }}>
                  {f.title}
                </h3>
                <p className="mt-2 text-sm font-semibold" style={{ color: "var(--rt-ink-soft)" }}>
                  {f.body}
                </p>
              </Panel>
            ))}
          </div>
        </section>

        {/* Sample avatars */}
        <section className="mb-4">
          <Panel>
            <h2
              className="rt-display mb-4 text-2xl"
              style={{ color: "var(--rt-brand)" }}
            >
              Join the crowd
            </h2>
            <div className="flex flex-wrap items-end justify-center gap-3">
              {SAMPLE_LOOKS.map((look, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${look}-${i}`}
                  className="rt-avatar"
                  style={{ height: "120px", width: "auto" }}
                  src={avatarImageUrl(look, { size: "l", direction: 2, headDirection: 2 })}
                  alt={`Sample habbo avatar ${i + 1}`}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <ButtonLink href={playHref} variant="brand">
                Create your habbo →
              </ButtonLink>
            </div>
          </Panel>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <Panel className="text-center">
      <div className="rt-display text-4xl" style={{ color: accent }}>
        {value.toLocaleString()}
      </div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide" style={{ color: "#8aa3ba" }}>
        {label}
      </div>
    </Panel>
  );
}
