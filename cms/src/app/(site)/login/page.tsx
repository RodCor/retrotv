import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { LoginForm } from "./form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="rt-panel w-full max-w-md">
          <h1 className="rt-display mb-1 text-3xl" style={{ color: "var(--rt-brand)" }}>
            ¡Hola de nuevo!
          </h1>
          <p className="mb-6 text-sm" style={{ color: "#6b7c8c" }}>
            Inicia sesión en tu cuenta para seguir jugando.
          </p>

          <LoginForm />

          <p className="mt-6 text-center text-sm" style={{ color: "#6b7c8c" }}>
            ¿Nuevo por aquí?{" "}
            <Link href="/register" className="font-bold" style={{ color: "var(--rt-blue)" }}>
              Crea una cuenta
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
