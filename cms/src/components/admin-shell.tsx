import Link from "next/link";
import { config } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import {
  LayoutDashboard, Users, ShoppingBag, Shirt, Home, Star, ShieldAlert, Settings2, Megaphone, Calendar, Sofa, Newspaper, Swords,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/catalog", label: "Catálogo", icon: ShoppingBag },
  { href: "/admin/furniture", label: "Mobiliario", icon: Sofa },
  { href: "/admin/clothing", label: "Ropa", icon: Shirt },
  { href: "/admin/posts", label: "Publicaciones", icon: Newspaper },
  { href: "/admin/news", label: "Noticias", icon: Megaphone },
  { href: "/admin/events", label: "Eventos", icon: Calendar },
  { href: "/admin/rpg", label: "RPG", icon: Swords },
  { href: "/admin/rooms", label: "Salas", icon: Home },
  { href: "/admin/ranks", label: "Rangos", icon: Star },
  { href: "/admin/moderation", label: "Moderación", icon: ShieldAlert },
  { href: "/admin/settings", label: "Configuración", icon: Settings2 },
];

/** Shared chrome for every /admin page: sidebar + top bar. */
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="admin-scope relative z-10 flex min-h-screen" style={{ color: "var(--ink)" }}>
      <aside
        className="flex w-56 shrink-0 flex-col gap-0.5 p-3"
        style={{ background: "rgba(8,11,26,0.85)", borderRight: "1px solid var(--line)", backdropFilter: "blur(14px)" }}
      >
        <Link href="/admin" className="mb-4 flex items-center gap-2.5 px-2 pt-1.5">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg font-pixel text-sm"
            style={{ background: "linear-gradient(180deg, var(--amber), var(--amber-deep))", color: "#3a2600" }}
          >
            R
          </span>
          <span className="flex flex-col leading-none">
            <span className="rt-display text-sm" style={{ color: "var(--ink)" }}>{config.hotel.name}</span>
            <span className="font-pixel text-[0.56rem]" style={{ color: "var(--cyan)" }}>ADMINISTRACIÓN</span>
          </span>
        </Link>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="anav">
            <Icon strokeWidth={2} /> <span>{label}</span>
          </Link>
        ))}
        <Link href="/" className="anav mt-auto text-xs" style={{ color: "var(--ink-dim)" }}>
          ← Volver al sitio
        </Link>
      </aside>

      <div className="min-w-0 flex-1">
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-6 py-2.5"
          style={{ background: "rgba(10,14,31,0.7)", borderBottom: "1px solid var(--line)", backdropFilter: "blur(14px)" }}
        >
          <div>
            <p className="aeyebrow">Admin · {config.hotel.name}</p>
            <h2 className="rt-display text-base" style={{ color: "var(--ink)" }}>Administración</h2>
          </div>
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="text-right leading-tight">
                <div className="text-sm font-bold" style={{ color: "var(--ink)" }}>{user.username}</div>
                <div className="font-pixel text-[0.62rem]" style={{ color: "var(--cyan)" }}>RANGO {user.rank}</div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarImageUrl(user.look, { headOnly: true, size: "m" })} alt={user.username} width={36} height={36} className="av-head" />
            </div>
          )}
        </header>
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </div>
  );
}
