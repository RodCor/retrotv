import { query } from "@/lib/db";
import { Panel } from "@/components/ui";
import { CreateRankForm, EditRankRow } from "./forms";

interface RankRow {
  id: number;
  rank_name: string;
  level: number;
  badge: string | null;
  prefix: string | null;
  prefix_color: string | null;
}

export default async function RanksPage() {
  const ranks = await query<RankRow>(
    `SELECT id, rank_name, level, badge, prefix, prefix_color
     FROM permissions
     ORDER BY id`,
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="rt-display text-2xl">Ranks &amp; Permissions</h1>

      <Panel muted>
        <h2 className="rt-display mb-3 text-lg">Create a new rank</h2>
        <CreateRankForm />
      </Panel>

      <Panel>
        <h2 className="rt-display mb-3 text-lg">Existing ranks</h2>
        {ranks.length === 0 ? (
          <p className="text-sm opacity-70">No ranks defined.</p>
        ) : (
          <table className="rt-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Level</th>
                <th>Badge</th>
                <th>Prefix</th>
                <th>Prefix Color</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map((rank) => (
                <EditRankRow key={rank.id} rank={rank} />
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
