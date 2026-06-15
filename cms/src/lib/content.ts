import { query } from "@/lib/db";

export type PostCategory = "news" | "competition";

export interface Post {
  id: number;
  category: PostCategory;
  title: string;
  excerpt: string;
  body: string;
  image: string;
  label: string;
  pinned: number;
  author: string;
  starts_at: string | null; // formatted, competitions only
  created: string; // formatted date
}

/** Visible posts of a category, pinned first then newest. */
export async function getPosts(category: PostCategory, limit = 12): Promise<Post[]> {
  const lim = Math.max(1, Math.min(50, Math.floor(limit)));
  try {
    return await query<Post>(
      `SELECT id, category, title, excerpt, body, image, label, pinned, author,
              DATE_FORMAT(starts_at, '%d/%m/%Y · %H:%i') AS starts_at,
              DATE_FORMAT(created_at, '%d/%m/%Y')       AS created
         FROM cms_posts
        WHERE category = :c AND visible = 1
        ORDER BY pinned DESC, created_at DESC
        LIMIT ${lim}`,
      { c: category },
    );
  } catch {
    return [];
  }
}

export type RankMetric = "score" | "credits" | "time";

export interface RankEntry {
  username: string;
  look: string;
  value: number;
}

const RANK_SQL: Record<RankMetric, string> = {
  score:
    `SELECT u.username, u.look, COALESCE(s.achievement_score,0) AS value
       FROM users u LEFT JOIN users_settings s ON s.user_id = u.id`,
  credits: `SELECT username, look, credits AS value FROM users u`,
  time:
    `SELECT u.username, u.look, COALESCE(s.online_time,0) AS value
       FROM users u LEFT JOIN users_settings s ON s.user_id = u.id`,
};

/** Top players by a metric, excluding the [SYSTEM] account. */
export async function getRankings(metric: RankMetric, limit = 10): Promise<RankEntry[]> {
  const lim = Math.max(1, Math.min(50, Math.floor(limit)));
  const base = RANK_SQL[metric] ?? RANK_SQL.score;
  try {
    return await query<RankEntry>(
      `${base}
        WHERE u.username <> '[SYSTEM]'
        ORDER BY value DESC, u.username ASC
        LIMIT ${lim}`,
    );
  } catch {
    return [];
  }
}
