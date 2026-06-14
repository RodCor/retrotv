import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Panel, Badge } from "@/components/ui";
import { ADMIN_MIN_RANK } from "@/lib/auth";
import { query } from "@/lib/db";
import { avatarImageUrl } from "@/lib/habbo-imaging";

export const metadata = {
  title: "Community",
};

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
         FROM users u
         JOIN permissions p ON p.id = u.rank
        WHERE u.rank >= :minRank
        ORDER BY u.rank DESC`,
      { minRank: ADMIN_MIN_RANK },
    );
  } catch {
    return [];
  }
}

async function loadNewest(): Promise<MemberRow[]> {
  try {
    return await query<MemberRow>(
      `SELECT username, look, motto
         FROM users
        ORDER BY id DESC
        LIMIT 12`,
    );
  } catch {
    return [];
  }
}

export default async function CommunityPage() {
  const [staff, members] = await Promise.all([loadStaff(), loadNewest()]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <header className="mb-8">
          <h1 className="rt-display text-4xl" style={{ color: "var(--rt-brand)" }}>
            Community
          </h1>
          <p className="mt-2 font-semibold" style={{ color: "#cfe0ee" }}>
            Meet the team keeping the hotel running and say hi to our newest
            faces.
          </p>
        </header>

        {/* Staff team */}
        <section className="mb-10">
          <h2 className="rt-display mb-4 text-2xl" style={{ color: "var(--rt-brand)" }}>
            Staff team
          </h2>
          {staff.length === 0 ? (
            <Panel muted>
              <p className="font-semibold" style={{ color: "#cfe0ee" }}>
                The staff roster is taking a coffee break. Check back soon!
              </p>
            </Panel>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((s) => (
                <Panel key={s.username} className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="rt-avatar"
                    style={{ height: "90px", width: "auto" }}
                    src={avatarImageUrl(s.look, { size: "m", headOnly: true })}
                    alt={`${s.username}'s avatar`}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-lg font-extrabold" style={{ color: "#fff" }}>
                      {s.username}
                    </div>
                    {s.rank_name && (
                      <span
                        className="rt-badge"
                        style={{
                          background: "rgba(52,225,212,0.14)",
                          borderColor: "rgba(52,225,212,0.4)",
                          color: "var(--cyan)",
                        }}
                      >
                        {s.rank_name}
                      </span>
                    )}
                    {s.badge && (
                      <div className="mt-1 text-xs font-bold" style={{ color: "#8aa3ba" }}>
                        Badge: {s.badge}
                      </div>
                    )}
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </section>

        {/* Newest members */}
        <section>
          <h2 className="rt-display mb-4 text-2xl" style={{ color: "var(--rt-brand)" }}>
            Newest members
          </h2>
          {members.length === 0 ? (
            <Panel muted>
              <p className="font-semibold" style={{ color: "#cfe0ee" }}>
                No members to show yet — be the first to join!
              </p>
            </Panel>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {members.map((m) => (
                <Panel key={m.username} muted className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="rt-avatar mx-auto"
                    style={{ height: "110px", width: "auto" }}
                    src={avatarImageUrl(m.look, { size: "l", direction: 2, headDirection: 2 })}
                    alt={`${m.username}'s avatar`}
                  />
                  <div className="mt-2 truncate text-sm font-extrabold" style={{ color: "#fff" }}>
                    {m.username}
                  </div>
                  {m.motto && (
                    <div className="mt-1 truncate text-xs font-semibold" style={{ color: "#8aa3ba" }}>
                      {m.motto}
                    </div>
                  )}
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
