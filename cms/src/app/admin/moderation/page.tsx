import { Panel, Button, Badge } from "@/components/ui";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { BanUserForm } from "./forms";
import { deleteBan } from "./actions";

export const dynamic = "force-dynamic";

interface BanRow {
  id: number;
  user_id: number;
  username: string | null;
  ban_reason: string | null;
  timestamp: number;
  ban_expire: number;
  type: string;
}

interface ChatRow {
  user_id: number;
  message: string;
  timestamp: number;
}

/** Format a unix timestamp relative to now, e.g. "in 3 days" / "2 hours ago". */
function relativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = unixSeconds - now;
  const abs = Math.abs(diff);
  const future = diff > 0;

  const units: [number, string][] = [
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];

  if (abs < 60) return future ? "in moments" : "just now";

  for (const [secs, label] of units) {
    if (abs >= secs) {
      const n = Math.floor(abs / secs);
      const plural = n === 1 ? label : `${label}s`;
      return future ? `in ${n} ${plural}` : `${n} ${plural} ago`;
    }
  }
  return future ? "soon" : "just now";
}

function isPermanent(expire: number): boolean {
  // Arcturus uses a far-future timestamp for permanent bans.
  const now = Math.floor(Date.now() / 1000);
  return expire - now > 60 * 60 * 24 * 365 * 5; // > 5 years out
}

export default async function ModerationPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) {
    return (
      <Panel>
        <h2 className="rt-display mb-2 text-lg">Moderation</h2>
        <p>You do not have permission to view this page.</p>
      </Panel>
    );
  }

  let bans: BanRow[] = [];
  try {
    bans = await query<BanRow>(
      `SELECT b.id, b.user_id, u.username, b.ban_reason, b.timestamp, b.ban_expire, b.type
         FROM bans b
         LEFT JOIN users u ON u.id = b.user_id
        ORDER BY b.id DESC
        LIMIT 30`,
    );
  } catch {
    bans = [];
  }

  // Optional chatlogs viewer — table may not exist on every emulator build.
  let chatlogs: ChatRow[] | null = null;
  try {
    chatlogs = await query<ChatRow>(
      `SELECT user_id, message, timestamp
         FROM chatlogs_room
        ORDER BY id DESC
        LIMIT 30`,
    );
  } catch {
    chatlogs = null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="rt-display text-2xl">🛡️ Moderation</h2>
        <p style={{ color: "var(--rt-ink-soft)" }}>
          Manage active bans, ban users, and review recent chat activity.
        </p>
      </div>

      <Panel>
        <h3 className="rt-display mb-3 text-lg">Ban a user</h3>
        <BanUserForm />
      </Panel>

      <Panel>
        <h3 className="rt-display mb-3 text-lg">
          Active bans{" "}
          <Badge color="var(--rt-danger)">{bans.length}</Badge>
        </h3>
        {bans.length === 0 ? (
          <p style={{ color: "var(--rt-ink-soft)" }}>
            No bans on record. A peaceful hotel. 🌴
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="rt-table w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Reason</th>
                  <th>Type</th>
                  <th>Banned</th>
                  <th>Expires</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bans.map((b) => (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td className="font-bold">
                      {b.username ?? `#${b.user_id}`}
                    </td>
                    <td>{b.ban_reason ?? "—"}</td>
                    <td>
                      <Badge color="var(--rt-blue)">{b.type}</Badge>
                    </td>
                    <td style={{ color: "var(--rt-ink-soft)" }}>
                      {relativeTime(b.timestamp)}
                    </td>
                    <td>
                      {isPermanent(b.ban_expire) ? (
                        <Badge color="var(--rt-danger)">permanent</Badge>
                      ) : (
                        relativeTime(b.ban_expire)
                      )}
                    </td>
                    <td>
                      <form action={deleteBan}>
                        <input type="hidden" name="id" value={b.id} />
                        <Button type="submit" variant="ghost">
                          Lift ban
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {chatlogs !== null && (
        <Panel muted>
          <h3 className="rt-display mb-3 text-lg">Recent room chat</h3>
          {chatlogs.length === 0 ? (
            <p style={{ color: "var(--rt-ink-soft)" }}>No chat logs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="rt-table w-full">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Message</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {chatlogs.map((c, i) => (
                    <tr key={i}>
                      <td className="font-bold">#{c.user_id}</td>
                      <td>{c.message}</td>
                      <td style={{ color: "var(--rt-ink-soft)" }}>
                        {relativeTime(c.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
