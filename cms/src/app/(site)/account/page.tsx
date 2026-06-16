import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerById, getOwnerAvatars, effectiveCap } from "@/lib/owners";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AccountCarousel, type AvatarCard } from "./carousel";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getOwnerSession();
  if (!session) redirect("/login");

  const owner = await getOwnerById(session.ownerId);
  if (!owner) redirect("/login");

  const avatars = await getOwnerAvatars(session.ownerId);
  const cap = await effectiveCap(owner);

  const cards: AvatarCard[] = avatars.map((a) => ({
    id: a.id,
    username: a.username,
    look: a.look,
    motto: a.motto,
    rank: a.rank,
    credits: a.credits,
  }));

  return (
    <>
      <SiteHeader />
      <main className="account-page">
        <header className="account-head">
          <h1>Tus avatares</h1>
          <p>Cuenta <strong>{owner.username}</strong> · elige uno para jugar o crea otro.</p>
        </header>
        <AccountCarousel
          avatars={cards}
          primaryId={owner.primary_user_id}
          activeId={session.userId}
          cap={cap}
        />
      </main>
      <SiteFooter />
    </>
  );
}
