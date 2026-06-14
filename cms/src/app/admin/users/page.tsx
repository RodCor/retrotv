import { query } from "@/lib/db";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import {
  PageHead, ACard, ABtn, Tag, Field, TableWrap,
  Users, Search, Pencil, Crown, Circle, ChevronLeft, ChevronRight,
} from "@/components/admin-ui";

interface UserRow {
  id: number;
  username: string;
  look: string;
  rank: number;
  credits: number;
  online: string;
}

const PER_PAGE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  // inline-validated integer for LIMIT/OFFSET (server-controlled)
  const pageNum = Math.max(1, Math.trunc(Number(sp.page) || 1));
  const offset = (pageNum - 1) * PER_PAGE;

  let users: UserRow[] = [];
  if (q) {
    users = await query<UserRow>(
      `SELECT id, username, look, rank, credits, online
       FROM users
       WHERE username LIKE :q OR mail LIKE :q
       ORDER BY id DESC
       LIMIT ${PER_PAGE} OFFSET ${offset}`,
      { q: `%${q}%` },
    );
  } else {
    users = await query<UserRow>(
      `SELECT id, username, look, rank, credits, online
       FROM users
       ORDER BY id DESC
       LIMIT ${PER_PAGE} OFFSET ${offset}`,
    );
  }

  const hasNext = users.length === PER_PAGE;
  const baseQs = q ? `q=${encodeURIComponent(q)}&` : "";

  return (
    <div>
      <PageHead eyebrow="Personas" title="Usuarios" />

      <ACard
        title="Directorio"
        icon={<Users size={16} strokeWidth={2} />}
        actions={
          <form method="GET" className="flex items-end gap-2">
            <Field
              name="q"
              defaultValue={q}
              placeholder="Usuario o correo…"
              aria-label="Buscar usuario o correo"
            />
            <ABtn type="submit" variant="primary" size="xs">
              <Search size={14} strokeWidth={2} />
              Buscar
            </ABtn>
            {q && (
              <ABtn href="/admin/users" size="xs">
                Limpiar
              </ABtn>
            )}
          </form>
        }
        pad={false}
      >
        {users.length === 0 ? (
          <p className="px-4 py-6 text-sm opacity-60">No se encontraron usuarios.</p>
        ) : (
          <TableWrap>
            <table className="dtable">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th className="num">ID</th>
                  <th>Usuario</th>
                  <th>Rango</th>
                  <th className="num">Créditos</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="av-sm"
                        src={avatarImageUrl(u.look, { size: "s", headOnly: true })}
                        alt={`avatar de ${u.username}`}
                      />
                    </td>
                    <td className="num opacity-60">{u.id}</td>
                    <td className="font-semibold">{u.username}</td>
                    <td>
                      <Tag color="amber">
                        <Crown size={12} strokeWidth={2} />
                        {u.rank}
                      </Tag>
                    </td>
                    <td className="num">{u.credits.toLocaleString()}</td>
                    <td>
                      {u.online === "1" ? (
                        <Tag color="green">
                          <Circle size={8} fill="currentColor" />
                          En línea
                        </Tag>
                      ) : (
                        <Tag color="gray">Desconectado</Tag>
                      )}
                    </td>
                    <td>
                      <ABtn size="xs" variant="primary" href={`/admin/users/${u.id}`}>
                        <Pencil size={12} strokeWidth={2} />
                        Gestionar
                      </ABtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </ACard>

      <div className="mt-4 flex items-center justify-between">
        <div>
          {pageNum > 1 && (
            <ABtn href={`/admin/users?${baseQs}page=${pageNum - 1}`} size="xs">
              <ChevronLeft size={14} strokeWidth={2} />
              Anterior
            </ABtn>
          )}
        </div>
        <span className="text-xs opacity-50">Página {pageNum}</span>
        <div>
          {hasNext && (
            <ABtn href={`/admin/users?${baseQs}page=${pageNum + 1}`} size="xs">
              Siguiente
              <ChevronRight size={14} strokeWidth={2} />
            </ABtn>
          )}
        </div>
      </div>
    </div>
  );
}
