import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import { Panel, Badge, ButtonLink } from "@/components/ui";
import {
  CurrencyForm,
  RankForm,
  ProfileForm,
  PasswordForm,
  BanForm,
  DeleteForm,
} from "./forms";

interface UserDetail {
  id: number;
  username: string;
  mail: string | null;
  motto: string;
  look: string;
  gender: "M" | "F";
  rank: number;
  credits: number;
  pixels: number;
  points: number;
  online: string;
  account_created: number;
  last_online: number;
}

interface RankOption {
  level: number;
  rank_name: string;
}

function fmtDate(unix: number): string {
  if (!unix) return "—";
  const ms = unix > 1e12 ? unix : unix * 1000;
  return new Date(ms).toLocaleString();
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId) || userId <= 0) notFound();

  const user = await queryOne<UserDetail>(
    `SELECT id, username, mail, motto, look, gender, rank, credits, pixels, points,
            online, account_created, last_online
     FROM users WHERE id = :id`,
    { id: userId },
  );
  if (!user) notFound();

  const session = await getSession();
  const staffId = session?.userId ?? 0;

  let ranks: RankOption[] = [];
  try {
    ranks = await query<RankOption>(
      "SELECT level, rank_name FROM permissions ORDER BY level ASC",
    );
  } catch {
    ranks = [];
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="rt-display text-2xl">Manage: {user.username}</h1>
        <ButtonLink href="/admin/users" variant="ghost">
          ← Back to users
        </ButtonLink>
      </div>

      {/* Overview */}
      <Panel>
        <div className="flex flex-wrap items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="rt-avatar"
            src={avatarImageUrl(user.look, { size: "l" })}
            alt={`${user.username} avatar`}
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rt-display text-xl">{user.username}</span>
              {user.online === "1" ? (
                <Badge color="#7CFC9B">Online</Badge>
              ) : (
                <Badge color="#d9d9d9">Offline</Badge>
              )}
              <Badge color="#ffd166">Rank {user.rank}</Badge>
            </div>
            <p className="text-sm italic opacity-80">
              {user.motto || "(no motto)"}
            </p>
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              <span>ID #{user.id}</span>
              <span>{user.mail ?? "(no email)"}</span>
              <span>Gender: {user.gender}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm opacity-80">
              <span>Joined: {fmtDate(user.account_created)}</span>
              <span>Last online: {fmtDate(user.last_online)}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge color="#FFD27F">{user.credits} credits</Badge>
              <Badge color="#9ED2FF">{user.pixels} pixels</Badge>
              <Badge color="#D6B8FF">{user.points} points</Badge>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <CurrencyForm
            userId={user.id}
            credits={user.credits}
            pixels={user.pixels}
            points={user.points}
          />
        </Panel>

        <Panel>
          <RankForm userId={user.id} rank={user.rank} ranks={ranks} />
        </Panel>

        <Panel>
          <ProfileForm
            userId={user.id}
            motto={user.motto}
            look={user.look}
            mail={user.mail}
          />
        </Panel>

        <Panel>
          <PasswordForm userId={user.id} />
        </Panel>
      </div>

      {/* Danger zone */}
      <Panel muted>
        <h2 className="rt-display mb-3 text-xl" style={{ color: "var(--rt-danger)" }}>
          Danger zone
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rt-panel" style={{ boxShadow: "none" }}>
            <BanForm userId={user.id} staffId={staffId} />
          </div>
          <div className="rt-panel" style={{ boxShadow: "none" }}>
            <DeleteForm userId={user.id} />
          </div>
        </div>
        <p className="mt-3 text-xs opacity-60">
          <Link href="/admin/users" className="underline">
            Return to user list
          </Link>{" "}
          after destructive actions.
        </p>
      </Panel>
    </div>
  );
}
