import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Panel, ButtonLink, Badge } from "@/components/ui";
import { ProfileForm, PasswordForm } from "./forms";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <h1 className="rt-display text-3xl">My Account</h1>

        {/* Profile card */}
        <Panel>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="rt-avatar"
                src={avatarImageUrl(user.look, { size: "l" })}
                alt={`${user.username}'s avatar`}
              />
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="rt-display text-2xl">{user.username}</h2>
                <Badge color="#ffd166">Rank {user.rank}</Badge>
              </div>
              <p className="text-sm italic opacity-80">
                {user.motto || "No motto set."}
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge color="#ffe08a">💰 {user.credits} Credits</Badge>
                <Badge color="#b8f5c0">💎 {user.pixels} Pixels</Badge>
                <Badge color="#cdd9ff">⭐ {user.points} Points</Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <ButtonLink href="/play" variant="accent">
                  Enter Hotel
                </ButtonLink>
                <a href="/logout" className="rt-btn rt-btn-ghost">
                  Logout
                </a>
              </div>
            </div>
          </div>
        </Panel>

        {/* Edit profile */}
        <Panel muted>
          <h2 className="rt-display mb-3 text-xl">Edit profile</h2>
          <ProfileForm user={{ motto: user.motto, look: user.look }} />
        </Panel>

        {/* Change password */}
        <Panel muted>
          <h2 className="rt-display mb-3 text-xl">Change password</h2>
          <PasswordForm />
        </Panel>
      </main>

      <SiteFooter />
    </>
  );
}
