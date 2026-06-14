import Link from "next/link";
import { Tv, Play, LogOut } from "lucide-react";
import { config } from "@/lib/config";
import { getSession } from "@/lib/auth";

/** Public site top navigation — sticky, glassy, with a pixel-mark logo. */
export async function SiteHeader() {
  const session = await getSession();
  const isStaff = (session?.rank ?? 0) >= Number(process.env.ADMIN_MIN_RANK ?? 5);
  return (
    <header className="sticky top-0 z-50">
      <div
        className="border-b"
        style={{
          borderColor: "var(--line)",
          background: "rgba(10,14,31,0.72)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{
                background: "linear-gradient(180deg, var(--amber), var(--amber-deep))",
                boxShadow: "0 8px 20px -8px rgba(255,157,47,0.7)",
                color: "#3a2600",
              }}
            >
              <Tv size={18} strokeWidth={2.5} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="rt-display text-xl" style={{ color: "var(--ink)" }}>
                {config.hotel.name}
              </span>
              <span className="font-pixel text-[0.6rem]" style={{ color: "var(--cyan)" }}>
                RETRO HOTEL
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm font-bold">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/community">Community</NavLink>
            {session ? (
              <>
                <Link href="/me" className="btn btn-ghost btn-sm ml-1">My Account</Link>
                {isStaff && (
                  <Link href="/admin" className="btn btn-ghost btn-sm">CRM</Link>
                )}
                <Link href="/play" prefetch={false} className="btn btn-amber btn-sm inline-flex items-center gap-1.5"><Play size={14} strokeWidth={2.5} fill="currentColor" />Play</Link>
                <Link href="/logout" prefetch={false} className="btn btn-ghost btn-sm inline-flex items-center" title="Log out" aria-label="Log out"><LogOut size={15} strokeWidth={2.5} /></Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm ml-1">Log in</Link>
                <Link href="/register" className="btn btn-amber btn-sm">Get started</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="hidden rounded-lg px-3 py-2 transition-colors sm:block"
      style={{ color: "var(--ink-soft)" }}
    >
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-16 border-t" style={{ borderColor: "var(--line)" }}>
      <div className="shell flex flex-col items-center gap-3 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--amber)" }}><Tv size={16} strokeWidth={2.5} /></span>
          <span className="rt-display text-sm" style={{ color: "var(--ink)" }}>
            {config.hotel.name}
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--ink-dim)", maxWidth: "42rem" }}>
          A fan-made Habbo-style retro hotel for educational use. Not affiliated with Sulake.
          Built on Arcturus Morningstar + Nitro.
        </p>
      </div>
    </footer>
  );
}
