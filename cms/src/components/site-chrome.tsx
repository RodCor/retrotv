import Link from "next/link";
import { config } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { ButtonLink } from "./ui";

/** Public site top navigation. */
export async function SiteHeader() {
  const session = await getSession();
  const isStaff = (session?.rank ?? 0) >= Number(process.env.ADMIN_MIN_RANK ?? 5);
  return (
    <header
      className="w-full"
      style={{
        borderBottom: "3px solid var(--rt-border)",
        background: "rgba(8,24,40,0.55)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="rt-display flex items-center gap-2 text-2xl" style={{ color: "var(--rt-brand)" }}>
          <span>📺</span>
          <span>{config.hotel.name}</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-bold" style={{ color: "#cfe0ee" }}>
          <Link href="/" className="px-2 py-1">Home</Link>
          <Link href="/community" className="px-2 py-1">Community</Link>
          {session ? (
            <>
              <ButtonLink href="/me" variant="ghost">My Account</ButtonLink>
              {isStaff && <ButtonLink href="/admin" variant="blue">CRM</ButtonLink>}
              <ButtonLink href="/play" variant="accent">Play Now</ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">Login</ButtonLink>
              <ButtonLink href="/register" variant="brand">Register</ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer
      className="mt-auto w-full px-4 py-6 text-center text-xs"
      style={{ color: "#8aa3ba", borderTop: "3px solid var(--rt-border)" }}
    >
      <p>
        {config.hotel.name} — a fan-made Habbo-style retro hotel for educational use.
        Not affiliated with Sulake. Built on Arcturus Morningstar + Nitro.
      </p>
    </footer>
  );
}
