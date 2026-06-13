"use client";

import { useActionState } from "react";
import { Input, Button, FormMessage } from "@/components/ui";
import { createRank, updateRank, deleteRank } from "./actions";

interface RankRow {
  id: number;
  rank_name: string;
  level: number;
  badge: string | null;
  prefix: string | null;
  prefix_color: string | null;
}

export function CreateRankForm() {
  const [state, action, pending] = useActionState(createRank, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage message={state} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-1">
          <label className="rt-label" htmlFor="create-rank_name">
            Rank name
          </label>
          <Input id="create-rank_name" name="rank_name" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="rt-label" htmlFor="create-level">
            Level
          </label>
          <Input
            id="create-level"
            name="level"
            type="number"
            min={1}
            defaultValue={1}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="rt-label" htmlFor="create-badge">
            Badge
          </label>
          <Input id="create-badge" name="badge" placeholder="ADM" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="rt-label" htmlFor="create-prefix">
            Prefix
          </label>
          <Input id="create-prefix" name="prefix" placeholder="[Admin]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="rt-label" htmlFor="create-prefix_color">
            Prefix color
          </label>
          <Input
            id="create-prefix_color"
            name="prefix_color"
            placeholder="#ff0000"
          />
        </div>
      </div>
      <div>
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "Creating…" : "Create Rank"}
        </Button>
      </div>
    </form>
  );
}

export function EditRankRow({ rank }: { rank: RankRow }) {
  const [editState, editAction, editPending] = useActionState(
    updateRank,
    null,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteRank,
    null,
  );

  return (
    <>
      <tr>
        <td>{rank.id}</td>
        <td>
          <form
            id={`edit-rank-${rank.id}`}
            action={editAction}
            className="contents"
          >
            <input type="hidden" name="id" value={rank.id} />
            <Input
              name="rank_name"
              defaultValue={rank.rank_name}
              aria-label="Rank name"
            />
          </form>
        </td>
        <td>
          <Input
            form={`edit-rank-${rank.id}`}
            name="level"
            type="number"
            min={1}
            defaultValue={rank.level}
            aria-label="Level"
            className="w-20"
          />
        </td>
        <td>
          <Input
            form={`edit-rank-${rank.id}`}
            name="badge"
            defaultValue={rank.badge ?? ""}
            aria-label="Badge"
            className="w-24"
          />
        </td>
        <td>{rank.prefix ?? ""}</td>
        <td>{rank.prefix_color ?? ""}</td>
        <td>
          <div className="flex flex-wrap gap-1">
            <Button
              type="submit"
              form={`edit-rank-${rank.id}`}
              variant="accent"
              disabled={editPending}
            >
              {editPending ? "Saving…" : "Save"}
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={rank.id} />
              <Button type="submit" variant="danger" disabled={deletePending}>
                {deletePending ? "Deleting…" : "Delete"}
              </Button>
            </form>
          </div>
        </td>
      </tr>
      {(editState || deleteState) && (
        <tr>
          <td colSpan={7}>
            <FormMessage message={editState ?? deleteState} />
          </td>
        </tr>
      )}
    </>
  );
}
