import Link from "next/link";
import { config } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { avatarImageUrl } from "@/lib/habbo-imaging";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/users", label: "Users", icon: "◍" },
  { href: "/admin/catalog", label: "Catalog", icon: "◫" },
  { href: "/admin/clothing", label: "Clothing", icon: "✦" },
  { href: "/admin/rooms", label: "Rooms", icon: "⌂" },
  { href: "/admin/ranks", label: "Ranks", icon: "★" },
  { href: "/admin/moderation", label: "Moderation", icon: "⛨" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

/** Shared chrome for every /admin page: sidebar + top bar. */
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="relative z-10 flex min-h-screen">
      <aside
        className="flex w-60 shrink-0 flex-col gap-1 p-3"
        style={{ background: "rgba(8,11,26,0.85)", borderRight: "1px solid var(--line)", backdropFilter: "blur(14px)" }}
      >
        <Link href="/admin" className="mb-4 flex items-center gap-2 px-2 pt-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-base"
            style={{ background: "linear-gradient(180deg, var(--amber), var(--amber-deep))", color: "#3a2600" }}
          >
            📺
          </span>
          <span className="flex flex-col leading-none">
            <span className="rt-display text-base" style={{ color: "var(--ink)" }}>{config.hotel.name}</span>
            <span className="font-pixel text-[0.58rem]" style={{ color: "var(--cyan)" }}>HOUSEKEEPING</span>
          </span>
        </Link>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors hover:bg-white/5"
            style={{ color: "var(--ink-soft)" }}
          >
            <span style={{ color: "var(--cyan)", width: "1.1rem", textAlign: "center" }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <Link
          href="/"
          className="mt-auto rounded-lg px-3 py-2 text-xs font-bold"
          style={{ color: "var(--ink-dim)" }}
        >
          ← Back to site
        </Link>
      </aside>

      <div className="min-w-0 flex-1">
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-6 py-3"
          style={{ background: "rgba(10,14,31,0.7)", borderBottom: "1px solid var(--line)", backdropFilter: "blur(14px)" }}
        >
          <div>
            <p className="eyebrow">Admin CRM</p>
            <h1 className="rt-display text-lg" style={{ color: "var(--ink)" }}>Housekeeping</h1>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-bold" style={{ color: "var(--ink)" }}>{user.username}</div>
                <div className="font-pixel text-xs" style={{ color: "var(--cyan)" }}>RANK {user.rank}</div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarImageUrl(user.look, { headOnly: true, size: "m" })}
                alt={user.username}
                width={42}
                height={42}
                className="pixel-img rounded-lg"
                style={{ border: "1px solid var(--line-strong)", background: "rgba(8,12,28,0.6)" }}
              />
            </div>
          )}
        </header>
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </div>
  );
}
