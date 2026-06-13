import { query, queryOne } from "@/lib/db";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import {
  PageHead,
  ACard,
  StatTile,
  TableWrap,
  Tag,
  ABtn,
  Users,
  Circle,
  Home,
  ShoppingBag,
  Ban,
  Pencil,
} from "@/components/admin-ui";

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

function fmtCount(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

function fmtDate(unix: number): string {
  if (!unix) return "—";
  const ms = unix > 1e12 ? unix : unix * 1000;
  return new Date(ms).toLocaleDateString();
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
    <div>
      <PageHead eyebrow="Overview" title="Dashboard" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatTile
          icon={<Users size={18} strokeWidth={2} />}
          label="Total users"
          value={fmtCount(totalUsers)}
          accent="var(--cyan)"
        />
        <StatTile
          icon={<Circle size={18} strokeWidth={2} />}
          label="Online now"
          value={fmtCount(onlineNow)}
          accent="var(--green)"
        />
        <StatTile
          icon={<Home size={18} strokeWidth={2} />}
          label="Rooms"
          value={fmtCount(totalRooms)}
          accent="var(--amber)"
        />
        <StatTile
          icon={<ShoppingBag size={18} strokeWidth={2} />}
          label="Catalog items"
          value={fmtCount(totalCatalog)}
          accent="var(--violet)"
        />
        <StatTile
          icon={<Ban size={18} strokeWidth={2} />}
          label="Bans"
          value={fmtCount(totalBans)}
          accent="var(--red)"
        />
      </div>

      <div className="mt-4">
        <ACard
          title="Recent registrations"
          icon={<Users size={16} strokeWidth={2} />}
        >
          {recent.length === 0 ? (
            <p className="text-sm opacity-70">No recent registrations.</p>
          ) : (
            <TableWrap>
              <table className="dtable">
                <thead>
                  <tr>
                    <th></th>
                    <th className="num">ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="av-head"
                          src={avatarImageUrl(u.look, {
                            size: "s",
                            headOnly: true,
                          })}
                          alt={`${u.username} avatar`}
                        />
                      </td>
                      <td className="num">{u.id}</td>
                      <td className="font-semibold">{u.username}</td>
                      <td>{u.mail ?? "—"}</td>
                      <td>
                        <Tag color="gray">{fmtDate(u.account_created)}</Tag>
                      </td>
                      <td>
                        <ABtn
                          variant="default"
                          size="xs"
                          href={`/admin/users/${u.id}`}
                        >
                          <Pencil size={14} strokeWidth={2} />
                          Manage
                        </ABtn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </ACard>
      </div>
    </div>
  );
}
