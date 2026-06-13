import { query } from "@/lib/db";
import {
  PageHead,
  ACard,
  ABtn,
  Tag,
  Field,
  TableWrap,
  Search,
  Star,
  Home,
  Eye,
  Trash2,
} from "@/components/admin-ui";
import { toggleStaffPick, togglePublic, deleteRoom } from "./actions";

interface RoomRow {
  id: number;
  name: string;
  owner_name: string;
  users: number;
  users_max: number;
  state: string;
  is_public: string;
  is_staff_picked: string;
}

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const rooms = await query<RoomRow>(
    `SELECT id, name, owner_name, users, users_max, state, is_public, is_staff_picked
     FROM rooms
     WHERE name LIKE :q
     ORDER BY id DESC
     LIMIT 30`,
    { q: `%${q}%` },
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHead eyebrow="Spaces" title="Rooms" />

      <ACard title="Search" icon={<Search size={16} strokeWidth={2} />}>
        <form method="GET" className="flex flex-wrap items-end gap-2">
          <div className="grow">
            <Field
              label="Room name"
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Search by name…"
            />
          </div>
          <ABtn type="submit" variant="primary">
            <Search size={14} strokeWidth={2} />
            Search
          </ABtn>
        </form>
      </ACard>

      <ACard title="Rooms" icon={<Home size={16} strokeWidth={2} />} pad={false}>
        {rooms.length === 0 ? (
          <p className="acard-pad text-sm opacity-70">No rooms found.</p>
        ) : (
          <TableWrap>
            <table className="dtable">
              <thead>
                <tr>
                  <th className="num">ID</th>
                  <th>Name</th>
                  <th>Owner</th>
                  <th className="num">Users</th>
                  <th>Public</th>
                  <th>Staff Pick</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const isPublic = room.is_public === "1";
                  const isPicked = room.is_staff_picked === "1";
                  return (
                    <tr key={room.id}>
                      <td className="num">{room.id}</td>
                      <td className="font-medium">{room.name}</td>
                      <td>{room.owner_name}</td>
                      <td className="num">
                        {room.users} / {room.users_max}
                      </td>
                      <td>
                        {isPublic ? (
                          <Tag color="green">Public</Tag>
                        ) : (
                          <Tag color="gray">Private</Tag>
                        )}
                      </td>
                      <td>
                        {isPicked ? (
                          <Tag color="cyan">
                            <Star size={12} strokeWidth={2} />
                            Picked
                          </Tag>
                        ) : (
                          <Tag color="gray">—</Tag>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1">
                          <form action={toggleStaffPick.bind(null, room.id)}>
                            <ABtn
                              type="submit"
                              size="xs"
                              variant={isPicked ? "solid" : "default"}
                              title={isPicked ? "Remove staff pick" : "Staff pick"}
                            >
                              <Star size={14} strokeWidth={2} />
                              {isPicked ? "Unpick" : "Pick"}
                            </ABtn>
                          </form>
                          <form action={togglePublic.bind(null, room.id)}>
                            <ABtn
                              type="submit"
                              size="xs"
                              variant="default"
                              title={isPublic ? "Make private" : "Make public"}
                            >
                              {isPublic ? (
                                <Eye size={14} strokeWidth={2} />
                              ) : (
                                <Home size={14} strokeWidth={2} />
                              )}
                              {isPublic ? "Private" : "Public"}
                            </ABtn>
                          </form>
                          <form action={deleteRoom.bind(null, room.id)}>
                            <ABtn
                              type="submit"
                              size="xs"
                              variant="danger"
                              title="Delete room"
                            >
                              <Trash2 size={14} strokeWidth={2} />
                              Delete
                            </ABtn>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </ACard>
    </div>
  );
}
