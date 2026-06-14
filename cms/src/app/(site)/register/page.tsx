import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { RegisterForm } from "./form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="rt-panel w-full max-w-md">
          <h1 className="rt-display mb-1 text-3xl" style={{ color: "var(--rt-brand)" }}>
            Join the hotel
          </h1>
          <p className="mb-6 text-sm" style={{ color: "#6b7c8c" }}>
            Create your free account and start hanging out.
          </p>

          <RegisterForm />

          <p className="mt-6 text-center text-sm" style={{ color: "#6b7c8c" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-bold" style={{ color: "var(--rt-blue)" }}>
              Log in
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
