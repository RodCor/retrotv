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
      <div className="site-head">
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
              <span className="rt-display text-xl" style={{ color: "var(--amber-deep)" }}>
                {config.hotel.name}
              </span>
              <span className="font-pixel text-[0.6rem]" style={{ color: "var(--cyan)" }}>
                HOTEL RETRO
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm font-bold">
            <NavLink href="/">Inicio</NavLink>
            <NavLink href="/community">Comunidad</NavLink>
            <NavLink href="/competiciones">Competiciones</NavLink>
            <NavLink href="/top">Top 10</NavLink>
            {session ? (
              <>
                <Link href="/me" className="btn btn-ghost btn-sm ml-1">Mi cuenta</Link>
                {isStaff && (
                  <Link href="/admin" className="btn btn-ghost btn-sm">Panel</Link>
                )}
                <Link href="/play" prefetch={false} className="btn btn-amber btn-sm inline-flex items-center gap-1.5"><Play size={14} strokeWidth={2.5} fill="currentColor" />Jugar</Link>
                <Link href="/logout" prefetch={false} className="btn btn-ghost btn-sm inline-flex items-center" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={15} strokeWidth={2.5} /></Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm ml-1">Entrar</Link>
                <Link href="/register" className="btn btn-amber btn-sm">Regístrate</Link>
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
      className="site-navlink hidden rounded-lg px-3 py-2 transition-colors sm:block"
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
          Hotel retro estilo Habbo hecho por fans con fines educativos. Sin afiliación con Sulake.
          Construido sobre Arcturus Morningstar + Nitro.
        </p>
      </div>
    </footer>
  );
}
