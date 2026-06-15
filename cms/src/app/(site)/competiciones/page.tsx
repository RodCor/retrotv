import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { SectionHead, PostCard } from "@/components/site-content";
import { getPosts } from "@/lib/content";
import { config } from "@/lib/config";

export const metadata = { title: "Competiciones" };
export const dynamic = "force-dynamic";

export default async function CompeticionesPage() {
  const posts = await getPosts("competition", 24);
  const promoBase = config.assets.promoImageUrl;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="relative z-10 flex-1">
        <section className="shell pt-10 pb-14 md:pt-14">
          <SectionHead
            eyebrow="Juegos y eventos"
            title="Competiciones"
            sub="Torneos, concursos y eventos del hotel. Participa, demuestra tu nivel y llévate premios."
          />
          {posts.length === 0 ? (
            <div className="panel panel-pad text-center">
              <p style={{ color: "var(--ink-soft)" }}>
                No hay competiciones activas ahora mismo. ¡Vuelve pronto!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} promoBase={promoBase} full />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
