import Link from "next/link";
import { config } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { avatarImageUrl } from "@/lib/habbo-imaging";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/catalog", label: "Catalog", icon: "🛒" },
  { href: "/admin/clothing", label: "Clothing", icon: "👕" },
  { href: "/admin/rooms", label: "Rooms", icon: "🏠" },
  { href: "/admin/ranks", label: "Ranks", icon: "⭐" },
  { href: "/admin/moderation", label: "Moderation", icon: "🛡️" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

/** Shared chrome for every /admin page: sidebar + top bar. */
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen" style={{ color: "var(--rt-ink)" }}>
      <aside
        className="flex w-60 flex-col gap-1 p-3"
        style={{ background: "#081828", borderRight: "3px solid var(--rt-border)" }}
      >
        <Link href="/admin" className="rt-display mb-3 px-2 text-xl" style={{ color: "var(--rt-brand)" }}>
          {config.hotel.name} CRM
        </Link>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 font-bold"
            style={{ color: "#cfe0ee" }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <div className="mt-auto">
          <Link href="/" className="block rounded-lg px-3 py-2 text-sm font-bold" style={{ color: "#8aa3ba" }}>
            ← Back to site
          </Link>
        </div>
      </aside>
      <div className="flex-1">
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ background: "#fff", borderBottom: "3px solid var(--rt-border)" }}
        >
          <h1 className="rt-display text-lg">Housekeeping</h1>
          {user && (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarImageUrl(user.look, { headOnly: true, size: "s" })}
                alt={user.username}
                width={40}
                height={40}
                className="rt-avatar"
              />
              <div className="text-right">
                <div className="font-extrabold">{user.username}</div>
                <div className="text-xs" style={{ color: "var(--rt-ink-soft)" }}>
                  Rank {user.rank}
                </div>
              </div>
            </div>
          )}
        </div>
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </div>
  );
}
