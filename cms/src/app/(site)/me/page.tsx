import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Panel, ButtonLink } from "@/components/ui";
import { CurrencyTile } from "@/components/currency";
import { PasswordForm } from "./forms";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Diamonds live in users_currency (type 5); the rest are columns on users.
  const diamondRow = await queryOne<{ amount: number }>(
    "SELECT amount FROM users_currency WHERE user_id = :id AND type = 5",
    { id: user.id },
  );
  const diamonds = Number(diamondRow?.amount ?? 0);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="rt-display text-3xl">Mi cuenta</h1>

        {/* Profile card — avatar is read-only; looks are changed inside the hotel */}
        <Panel>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="rt-avatar"
                src={avatarImageUrl(user.look, { size: "l" })}
                alt={`${user.username}'s avatar`}
              />
              <span className="text-xs opacity-60">Cambia tu look dentro del hotel</span>
            </div>

            <div className="flex flex-1 flex-col gap-4">
              <div>
                <h2 className="rt-display text-2xl">{user.username}</h2>
                <p className="mt-1 text-sm italic opacity-80">
                  {user.motto || "Sin misión."}
                </p>
              </div>

              <div className="rt-cur-grid">
                <CurrencyTile kind="coins" amount={user.credits} />
                <CurrencyTile kind="duckets" amount={user.pixels} />
                <CurrencyTile kind="diamonds" amount={diamonds} />
                <CurrencyTile kind="pixels" amount={user.points} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ButtonLink href="/play" prefetch={false} variant="accent">
                  Entrar al hotel
                </ButtonLink>
                <a href="/logout" className="rt-btn rt-btn-ghost">
                  Cerrar sesión
                </a>
              </div>
            </div>
          </div>
        </Panel>

        {/* Change password */}
        <Panel muted>
          <h2 className="rt-display mb-1 text-xl">Cambiar contraseña</h2>
          <p className="mb-3 text-sm opacity-70">
            Actualiza la contraseña que usas para entrar a la web y al hotel.
          </p>
          <PasswordForm />
        </Panel>
      </main>

      <SiteFooter />
    </>
  );
}
