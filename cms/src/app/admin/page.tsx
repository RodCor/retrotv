import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import { Panel, Badge } from "@/components/ui";

interface RecentUser {
  id: number;
  username: string;
  look: string;
  mail: string | null;
  account_created: number;
}

interface CountRow {
  n: number;
}

async function safeCount(sql: string): Promise<number | null> {
  try {
    const row = await queryOne<CountRow>(sql);
    return row?.n ?? 0;
  } catch {
    return null;
  }
}

function fmtDate(unix: number): string {
  if (!unix) return "—";
  const ms = unix > 1e12 ? unix : unix * 1000;
  return new Date(ms).toLocaleDateString();
}

function StatCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: number | null;
  color: string;
  href?: string;
}) {
  const inner = (
    <Panel className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide opacity-60">
        {label}
      </span>
      <span className="rt-display text-3xl" style={{ color }}>
        {value === null ? "—" : value.toLocaleString()}
      </span>
    </Panel>
  );
  return href ? (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function AdminDashboard() {
  const [totalUsers, onlineNow, totalRooms, totalCatalog, totalBans] =
    await Promise.all([
      safeCount("SELECT COUNT(*) AS n FROM users"),
      safeCount("SELECT COUNT(*) AS n FROM users WHERE online = '1'"),
      safeCount("SELECT COUNT(*) AS n FROM rooms"),
      safeCount("SELECT COUNT(*) AS n FROM catalog_items"),
      safeCount("SELECT COUNT(*) AS n FROM bans"),
    ]);

  let recent: RecentUser[] = [];
  try {
    recent = await query<RecentUser>(
      `SELECT id, username, look, mail, account_created
       FROM users
       ORDER BY id DESC
       LIMIT 8`,
    );
  } catch {
    recent = [];
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="rt-display text-2xl">Admin Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total users"
          value={totalUsers}
          color="var(--rt-brand)"
          href="/admin/users"
        />
        <StatCard label="Online now" value={onlineNow} color="#3FAE57" />
        <StatCard
          label="Rooms"
          value={totalRooms}
          color="var(--rt-blue)"
          href="/admin/rooms"
        />
        <StatCard label="Catalog items" value={totalCatalog} color="#B07CFF" />
        <StatCard label="Bans" value={totalBans} color="var(--rt-danger)" />
      </div>

      <Panel>
        <h2 className="rt-display mb-3 text-xl">Recent registrations</h2>
        {recent.length === 0 ? (
          <p className="text-sm opacity-70">No recent registrations.</p>
        ) : (
          <table className="rt-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((u) => (
                <tr key={u.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="rt-avatar"
                      src={avatarImageUrl(u.look, { size: "s", headOnly: true })}
                      alt={`${u.username} avatar`}
                      style={{ width: 40, height: 56 }}
                    />
                  </td>
                  <td>{u.id}</td>
                  <td className="font-bold">{u.username}</td>
                  <td>{u.mail ?? "—"}</td>
                  <td>
                    <Badge color="#e8e8e8">{fmtDate(u.account_created)}</Badge>
                  </td>
                  <td>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="rt-btn rt-btn-blue"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
