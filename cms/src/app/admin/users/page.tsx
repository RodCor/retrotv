import Link from "next/link";
import { query } from "@/lib/db";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import { Panel, Input, Button, Badge, ButtonLink } from "@/components/ui";

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="rt-display text-2xl">User Management</h1>
        <ButtonLink href="/admin" variant="ghost">
          ← Dashboard
        </ButtonLink>
      </div>

      <Panel muted>
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="rt-label" htmlFor="q">
              Search username or email
            </label>
            <Input id="q" name="q" defaultValue={q} placeholder="Username or email…" />
          </div>
          <Button type="submit" variant="blue">
            Search
          </Button>
          {q && (
            <ButtonLink href="/admin/users" variant="ghost">
              Clear
            </ButtonLink>
          )}
        </form>
      </Panel>

      <Panel>
        {users.length === 0 ? (
          <p className="text-sm opacity-70">No users found.</p>
        ) : (
          <table className="rt-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>ID</th>
                <th>Username</th>
                <th>Rank</th>
                <th>Credits</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
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
                  <td>
                    <Badge color="#ffd166">{u.rank}</Badge>
                  </td>
                  <td>{u.credits}</td>
                  <td>
                    {u.online === "1" ? (
                      <Badge color="#7CFC9B">Online</Badge>
                    ) : (
                      <Badge color="#d9d9d9">Offline</Badge>
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className="rt-btn rt-btn-blue">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <div className="flex items-center justify-between">
        <div>
          {pageNum > 1 && (
            <ButtonLink
              href={`/admin/users?${baseQs}page=${pageNum - 1}`}
              variant="ghost"
            >
              ← Previous
            </ButtonLink>
          )}
        </div>
        <span className="text-sm opacity-70">Page {pageNum}</span>
        <div>
          {hasNext && (
            <ButtonLink
              href={`/admin/users?${baseQs}page=${pageNum + 1}`}
              variant="ghost"
            >
              Next →
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}
