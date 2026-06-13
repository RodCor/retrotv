import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import {
  PageHead,
  ACard,
  ABtn,
  Tag,
  ChevronLeft,
  Crown,
  Coins,
  Pencil,
  KeyRound,
  Ban,
  Circle,
} from "@/components/admin-ui";
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

  const dia = await queryOne<{ amount: number }>(
    "SELECT amount FROM users_currency WHERE user_id = :id AND type = 5",
    { id: userId },
  );

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

  const rankName =
    ranks.find((r) => r.level === user.rank)?.rank_name ?? `Rank ${user.rank}`;
  const isOnline = user.online === "1";

  return (
    <div>
      <PageHead eyebrow="Manage user" title={user.username}>
        <ABtn href="/admin/users">
          <ChevronLeft size={14} strokeWidth={2} />
          Back
        </ABtn>
      </PageHead>

      {/* Overview */}
      <ACard className="mb-4">
        <div className="acard-pad flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="av-head"
            style={{ width: 64, height: 64 }}
            src={avatarImageUrl(user.look, { size: "l", headOnly: true })}
            alt={`${user.username} avatar`}
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">{user.username}</span>
              {isOnline ? (
                <Tag color="green">
                  <Circle size={8} fill="currentColor" />
                  Online
                </Tag>
              ) : (
                <Tag color="gray">Offline</Tag>
              )}
              <Tag color="amber">
                <Crown size={12} strokeWidth={2} />
                {rankName}
              </Tag>
            </div>
            <p className="text-sm italic opacity-70">
              {user.motto || "(no motto)"}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-60">
              <span>ID #{user.id}</span>
              <span>{user.mail ?? "(no email)"}</span>
              <span>Gender: {user.gender}</span>
              <span>Joined: {fmtDate(user.account_created)}</span>
              <span>Last online: {fmtDate(user.last_online)}</span>
            </div>
          </div>
        </div>
      </ACard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ACard title="Currency" icon={<Coins size={16} strokeWidth={2} />}>
          <div className="acard-pad">
            <CurrencyForm
              userId={user.id}
              credits={user.credits}
              duckets={user.pixels}
              diamonds={dia?.amount ?? 0}
              points={user.points}
            />
          </div>
        </ACard>

        <ACard title="Rank" icon={<Crown size={16} strokeWidth={2} />}>
          <div className="acard-pad">
            <RankForm userId={user.id} rank={user.rank} ranks={ranks} />
          </div>
        </ACard>

        <ACard title="Profile" icon={<Pencil size={16} strokeWidth={2} />}>
          <div className="acard-pad">
            <ProfileForm
              userId={user.id}
              motto={user.motto}
              look={user.look}
              mail={user.mail}
            />
          </div>
        </ACard>

        <ACard
          title="Reset password"
          icon={<KeyRound size={16} strokeWidth={2} />}
        >
          <div className="acard-pad">
            <PasswordForm userId={user.id} />
          </div>
        </ACard>
      </div>

      {/* Danger zone */}
      <ACard
        title="Danger zone"
        icon={<Ban size={16} strokeWidth={2} />}
        className="mt-4"
      >
        <div className="acard-pad grid grid-cols-1 gap-6 md:grid-cols-2">
          <BanForm userId={user.id} staffId={staffId} />
          <DeleteForm userId={user.id} />
        </div>
      </ACard>
    </div>
  );
}
