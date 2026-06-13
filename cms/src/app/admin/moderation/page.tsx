import {
  PageHead,
  ACard,
  ABtn,
  Tag,
  TableWrap,
  Ban,
  UserX,
  ShieldAlert,
} from "@/components/admin-ui";
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
      <>
        <PageHead eyebrow="Safety" title="Moderation" />
        <ACard title="Access denied" icon={<ShieldAlert size={16} strokeWidth={2} />}>
          <p style={{ color: "var(--ink-soft, #98a0b3)" }}>
            You do not have permission to view this page.
          </p>
        </ACard>
      </>
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
    <>
      <PageHead eyebrow="Safety" title="Moderation" />

      <div className="flex flex-col gap-4">
        <ACard title="Ban a user" icon={<UserX size={16} strokeWidth={2} />}>
          <BanUserForm />
        </ACard>

        <ACard
          title="Active bans"
          icon={<Ban size={16} strokeWidth={2} />}
          actions={<Tag color="gray">{bans.length}</Tag>}
          pad={false}
        >
          {bans.length === 0 ? (
            <div className="acard-pad">
              <p style={{ color: "var(--ink-soft, #98a0b3)" }}>
                No bans on record.
              </p>
            </div>
          ) : (
            <TableWrap>
              <table className="dtable">
                <thead>
                  <tr>
                    <th className="num">ID</th>
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
                      <td className="num">{b.id}</td>
                      <td>{b.username ?? `#${b.user_id}`}</td>
                      <td>{b.ban_reason ?? "—"}</td>
                      <td>
                        <Tag color="red">{b.type}</Tag>
                      </td>
                      <td style={{ color: "var(--ink-soft, #98a0b3)" }}>
                        {relativeTime(b.timestamp)}
                      </td>
                      <td>
                        {isPermanent(b.ban_expire) ? (
                          <Tag color="red">Permanent</Tag>
                        ) : (
                          <span style={{ color: "var(--ink-soft, #98a0b3)" }}>
                            {relativeTime(b.ban_expire)}
                          </span>
                        )}
                      </td>
                      <td>
                        <form action={deleteBan}>
                          <input type="hidden" name="id" value={b.id} />
                          <ABtn type="submit" size="xs" variant="primary">
                            Lift
                          </ABtn>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </ACard>

        {chatlogs !== null && (
          <ACard
            title="Recent chat"
            icon={<ShieldAlert size={16} strokeWidth={2} />}
            pad={false}
          >
            {chatlogs.length === 0 ? (
              <div className="acard-pad">
                <p style={{ color: "var(--ink-soft, #98a0b3)" }}>
                  No chat logs yet.
                </p>
              </div>
            ) : (
              <TableWrap>
                <table className="dtable">
                  <thead>
                    <tr>
                      <th className="num">User</th>
                      <th>Message</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chatlogs.map((c, i) => (
                      <tr key={i}>
                        <td className="num">#{c.user_id}</td>
                        <td>{c.message}</td>
                        <td style={{ color: "var(--ink-soft, #98a0b3)" }}>
                          {relativeTime(c.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </ACard>
        )}
      </div>
    </>
  );
}
