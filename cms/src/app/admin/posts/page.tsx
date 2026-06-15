import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { PageHead, ACard } from "@/components/admin-ui";
import { Newspaper } from "lucide-react";
import { CreatePostModal, PostCard, type PostRow } from "./forms";

export const dynamic = "force-dynamic";

async function loadPosts(): Promise<{ rows: PostRow[]; error: string | null }> {
  try {
    const rows = await query<PostRow>(
      `SELECT id, category, title, excerpt, body, image, label, author, pinned, visible,
              DATE_FORMAT(starts_at, '%Y-%m-%dT%H:%i') AS starts_input,
              DATE_FORMAT(starts_at, '%d/%m/%Y · %H:%i') AS starts_display
         FROM cms_posts
        ORDER BY category, pinned DESC, created_at DESC`,
    );
    return { rows, error: null };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

export default async function PostsAdminPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) redirect("/");

  const { rows, error } = await loadPosts();

  return (
    <div>
      <PageHead eyebrow="Sitio web" title="Publicaciones">
        <CreatePostModal />
      </PageHead>

      <div className="space-y-3">
        {error ? (
          <ACard>
            <p className="text-sm adim">
              La tabla de publicaciones no está disponible.
              <span className="mt-1 block text-xs opacity-70">{error}</span>
            </p>
          </ACard>
        ) : rows.length === 0 ? (
          <ACard title="Publicaciones" icon={<Newspaper size={16} strokeWidth={2} />}>
            <p className="text-sm adim">Aún no hay publicaciones. Crea la primera para llenar Comunidad y Competiciones.</p>
          </ACard>
        ) : (
          rows.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}
