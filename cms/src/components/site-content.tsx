import Link from "next/link";
import { Newspaper, Trophy, CalendarClock } from "lucide-react";
import type { Post } from "@/lib/content";

/** Eyebrow + title section header, with an optional "see all" link. */
export function SectionHead({
  eyebrow,
  title,
  sub,
  href,
  hrefLabel = "Ver todo",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-3xl">{title}</h2>
        {sub && <p className="mt-1.5 text-sm" style={{ color: "var(--ink-soft)" }}>{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="btn btn-ghost btn-sm shrink-0">
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}

function postImage(post: Post, promoBase: string): string | null {
  if (!post.image) return null;
  return post.image.startsWith("http") ? post.image : `${promoBase}/${post.image}`;
}

/** A news / competition card. `full` shows the body instead of the excerpt. */
export function PostCard({
  post,
  promoBase,
  full = false,
}: {
  post: Post;
  promoBase: string;
  full?: boolean;
}) {
  const isComp = post.category === "competition";
  const Icon = isComp ? Trophy : Newspaper;
  const img = postImage(post, promoBase);
  return (
    <article className="post-card">
      <div className={`post-card__cover${isComp ? " is-comp" : ""}`}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" />
        ) : (
          <Icon size={34} strokeWidth={1.5} aria-hidden />
        )}
        {post.label && <span className="post-card__label">{post.label}</span>}
        {post.pinned ? <span className="post-card__pin">Destacado</span> : null}
      </div>
      <div className="post-card__body">
        <div className="post-card__meta">
          {isComp && post.starts_at ? (
            <span className="inline-flex items-center gap-1" style={{ color: "var(--amber-deep)" }}>
              <CalendarClock size={12} strokeWidth={2.2} /> {post.starts_at}
            </span>
          ) : (
            <span>{post.created}</span>
          )}
          <span className="opacity-40">·</span>
          <span>{post.author}</span>
        </div>
        <h3 className="post-card__title">{post.title}</h3>
        <p className="post-card__text">{full ? post.body : post.excerpt}</p>
      </div>
    </article>
  );
}
