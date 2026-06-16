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

interface SiblingRow {
  owner_id: number;
  username: string;
  banned: number;
}

/** Format a unix timestamp relative to now, e.g. "in 3 days" / "2 hours ago". */
function relativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = unixSeconds - now;
  const abs = Math.abs(diff);
  const future = diff > 0;

  const units: [number, string, string][] = [
    [86400, "día", "días"],
    [3600, "hora", "horas"],
    [60, "minuto", "minutos"],
  ];

  if (abs < 60) return future ? "en unos momentos" : "ahora mismo";

  for (const [secs, singular, plural] of units) {
    if (abs >= secs) {
      const n = Math.floor(abs / secs);
      const label = n === 1 ? singular : plural;
      return future ? `en ${n} ${label}` : `hace ${n} ${label}`;
    }
  }
  return future ? "pronto" : "ahora mismo";
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
        <PageHead eyebrow="Seguridad" title="Moderación" />
        <ACard title="Acceso denegado" icon={<ShieldAlert size={16} strokeWidth={2} />}>
          <p style={{ color: "var(--ink-soft, #98a0b3)" }}>
            No tienes permiso para ver esta página.
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

  // Sibling avatars of every owner that currently has a ban (owner-aware view).
  let siblings: SiblingRow[] = [];
  try {
    siblings = await query<SiblingRow>(
      `SELECT u.owner_id, u.username, o.banned
         FROM users u JOIN account_owners o ON o.id = u.owner_id
        WHERE u.owner_id IN (
          SELECT u2.owner_id FROM bans b JOIN users u2 ON u2.id = b.user_id
           WHERE u2.owner_id IS NOT NULL
        )
        ORDER BY u.owner_id, u.id`,
    );
  } catch {
    siblings = [];
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
      <PageHead eyebrow="Seguridad" title="Moderación" />

      <div className="flex flex-col gap-4">
        <ACard title="Banear a un usuario" icon={<UserX size={16} strokeWidth={2} />}>
          <BanUserForm />
        </ACard>

        <ACard
          title="Baneos activos"
          icon={<Ban size={16} strokeWidth={2} />}
          actions={<Tag color="gray">{bans.length}</Tag>}
          pad={false}
        >
          {bans.length === 0 ? (
            <div className="acard-pad">
              <p style={{ color: "var(--ink-soft, #98a0b3)" }}>
                No hay baneos registrados.
              </p>
            </div>
          ) : (
            <TableWrap>
              <table className="dtable">
                <thead>
                  <tr>
                    <th className="num">ID</th>
                    <th>Usuario</th>
                    <th>Motivo</th>
                    <th>Tipo</th>
                    <th>Baneado</th>
                    <th>Expira</th>
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
                          <Tag color="red">Permanente</Tag>
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
                            Levantar
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

        {siblings.length > 0 && (
          <ACard
            title="Avatares por cuenta baneada"
            icon={<UserX size={16} strokeWidth={2} />}
            pad={false}
          >
            <div className="acard-pad flex flex-col gap-3">
              {Array.from(
                siblings.reduce((m, s) => {
                  const arr = m.get(s.owner_id) ?? [];
                  arr.push(s);
                  m.set(s.owner_id, arr);
                  return m;
                }, new Map<number, SiblingRow[]>()),
              ).map(([ownerId, rows]) => (
                <div key={ownerId} className="flex flex-wrap items-center gap-2">
                  <span style={{ color: "var(--ink-soft, #98a0b3)" }}>Cuenta #{ownerId}:</span>
                  {rows.map((r) => (
                    <Tag key={r.username} color={r.banned ? "red" : "gray"}>
                      {r.username}
                    </Tag>
                  ))}
                </div>
              ))}
            </div>
          </ACard>
        )}

        {chatlogs !== null && (
          <ACard
            title="Chat reciente"
            icon={<ShieldAlert size={16} strokeWidth={2} />}
            pad={false}
          >
            {chatlogs.length === 0 ? (
              <div className="acard-pad">
                <p style={{ color: "var(--ink-soft, #98a0b3)" }}>
                  Todavía no hay registros de chat.
                </p>
              </div>
            ) : (
              <TableWrap>
                <table className="dtable">
                  <thead>
                    <tr>
                      <th className="num">Usuario</th>
                      <th>Mensaje</th>
                      <th>Cuándo</th>
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
