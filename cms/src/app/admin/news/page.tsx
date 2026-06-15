import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { config } from "@/lib/config";
import { PageHead, ACard, Megaphone } from "@/components/admin-ui";
import { CreateNewsModal, NewsCard, type NewsRow } from "./forms";

export const dynamic = "force-dynamic";

async function loadNews(): Promise<{ rows: NewsRow[]; error: string | null }> {
  try {
    const rows = await query<NewsRow>(
      `SELECT id, title, text, button_text, button_type, button_link, image
         FROM hotelview_news ORDER BY id DESC`,
    );
    return { rows, error: null };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

export default async function NewsAdminPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) redirect("/");

  const { rows, error } = await loadNews();
  const promoBase = config.assets.promoImageUrl;

  return (
    <div>
      <PageHead eyebrow="Portada del hotel" title="Noticias">
        <CreateNewsModal promoBase={promoBase} />
      </PageHead>

      <div className="mt-4 space-y-3">
        {error ? (
          <ACard>
            <p className="text-sm adim">
              La tabla de noticias no está disponible en esta base de datos.
              <span className="mt-1 block text-xs opacity-70">{error}</span>
            </p>
          </ACard>
        ) : rows.length === 0 ? (
          <ACard title="Noticias publicadas" icon={<Megaphone size={16} strokeWidth={2} />}>
            <p className="text-sm adim">
              Todavía no hay noticias. Publica la primera con el formulario de arriba.
            </p>
          </ACard>
        ) : (
          <>
            <p className="aeyebrow px-1">
              {rows.length} {rows.length === 1 ? "noticia publicada" : "noticias publicadas"}
            </p>
            {rows.map((n) => (
              <NewsCard key={n.id} news={n} promoBase={promoBase} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
