import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerAvatars } from "@/lib/owners";
import { PlayLauncher, type LaunchAvatar } from "./launcher";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ launch?: string }>;
}) {
  const session = await getOwnerSession();
  if (!session) redirect("/login");

  const avatars = await getOwnerAvatars(session.ownerId);
  if (avatars.length === 0) redirect("/account");

  const sp = await searchParams;
  const preselect = Number(sp.launch);

  const list: LaunchAvatar[] = avatars.map((a) => ({
    id: a.id,
    username: a.username,
    look: a.look,
  }));

  return (
    <main className="account-page">
      <header className="account-head">
        <h1>Entrar al hotel</h1>
        <p>Elige uno o varios avatares. Cada uno se abre en su propia pestaña.</p>
      </header>
      <PlayLauncher
        avatars={list}
        preselectId={Number.isInteger(preselect) ? preselect : undefined}
      />
    </main>
  );
}
