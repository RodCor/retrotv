import { query } from "@/lib/db";
import { PageHead, ACard, TableWrap, Plus } from "@/components/admin-ui";
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
      <PageHead eyebrow="Permissions" title="Ranks" />

      <ACard title="New rank" icon={<Plus size={16} strokeWidth={2} />}>
        <CreateRankForm />
      </ACard>

      <ACard title="Existing ranks" pad={false}>
        {ranks.length === 0 ? (
          <p className="acard-pad text-sm opacity-70">No ranks defined.</p>
        ) : (
          <TableWrap>
            <table className="dtable">
              <thead>
                <tr>
                  <th className="num">ID</th>
                  <th>Rank</th>
                  <th className="num">Level</th>
                  <th>Badge</th>
                  <th>Prefix</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ranks.map((rank) => (
                  <EditRankRow key={rank.id} rank={rank} />
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </ACard>
    </div>
  );
}
