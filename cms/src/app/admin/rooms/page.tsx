import { query } from "@/lib/db";
import { Panel, Input, Button, Badge } from "@/components/ui";
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
      <div className="flex items-center justify-between gap-4">
        <h1 className="rt-display text-2xl">Room Management</h1>
      </div>

      <Panel muted>
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="rt-label" htmlFor="q">
              Search by name
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Room name…"
            />
          </div>
          <Button type="submit" variant="blue">
            Search
          </Button>
        </form>
      </Panel>

      <Panel>
        {rooms.length === 0 ? (
          <p className="text-sm opacity-70">No rooms found.</p>
        ) : (
          <table className="rt-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Owner</th>
                <th>Users</th>
                <th>State</th>
                <th>Flags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.id}</td>
                  <td className="font-bold">{room.name}</td>
                  <td>{room.owner_name}</td>
                  <td>
                    {room.users}/{room.users_max}
                  </td>
                  <td>{room.state}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {room.is_public === "1" && (
                        <Badge color="#7ec8ff">Public</Badge>
                      )}
                      {room.is_staff_picked === "1" && (
                        <Badge color="#ffd166">Staff Pick</Badge>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <form action={toggleStaffPick.bind(null, room.id)}>
                        <Button type="submit" variant="accent">
                          {room.is_staff_picked === "1"
                            ? "Unpick"
                            : "Staff Pick"}
                        </Button>
                      </form>
                      <form action={togglePublic.bind(null, room.id)}>
                        <Button type="submit" variant="blue">
                          {room.is_public === "1"
                            ? "Make Private"
                            : "Make Public"}
                        </Button>
                      </form>
                      <form action={deleteRoom.bind(null, room.id)}>
                        <Button type="submit" variant="danger">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
