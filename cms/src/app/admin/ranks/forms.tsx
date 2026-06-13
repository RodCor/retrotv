"use client";

import { useActionState } from "react";
import {
  Field,
  ABtn,
  Tag,
  FormMsg,
  Crown,
  Save,
  Trash2,
  Plus,
} from "@/components/admin-ui";
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
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Rank name" name="rank_name" required />
        <Field
          label="Level"
          name="level"
          type="number"
          min={1}
          defaultValue={1}
          required
        />
        <Field label="Badge" name="badge" placeholder="ADM" />
        <Field label="Prefix" name="prefix" placeholder="[Admin]" />
        <Field label="Prefix color" name="prefix_color" placeholder="#ff0000" />
      </div>
      <div className="flex items-center gap-2">
        <ABtn type="submit" variant="primary" disabled={pending}>
          <Plus size={14} strokeWidth={2} />
          {pending ? "Creating…" : "Create rank"}
        </ABtn>
        <FormMsg message={state} />
      </div>
    </form>
  );
}

export function EditRankRow({ rank }: { rank: RankRow }) {
  const [editState, editAction, editPending] = useActionState(updateRank, null);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteRank,
    null,
  );

  return (
    <>
      <tr>
        <td className="num">{rank.id}</td>
        <td>
          <form
            id={`edit-rank-${rank.id}`}
            action={editAction}
            className="contents"
          >
            <input type="hidden" name="id" value={rank.id} />
            <Field
              name="rank_name"
              defaultValue={rank.rank_name}
              aria-label="Rank name"
              className="min-w-[8rem]"
            />
          </form>
          <Tag color="amber" className="mt-1">
            <Crown size={12} strokeWidth={2} />
            {rank.rank_name}
          </Tag>
        </td>
        <td className="num">
          <Field
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
          <Field
            form={`edit-rank-${rank.id}`}
            name="badge"
            defaultValue={rank.badge ?? ""}
            aria-label="Badge"
            className="w-24"
          />
        </td>
        <td>
          {rank.prefix ? (
            <span style={rank.prefix_color ? { color: rank.prefix_color } : undefined}>
              {rank.prefix}
            </span>
          ) : (
            <span className="opacity-50">—</span>
          )}
        </td>
        <td>
          <div className="flex flex-wrap items-center gap-1">
            <ABtn
              type="submit"
              form={`edit-rank-${rank.id}`}
              variant="primary"
              size="xs"
              disabled={editPending}
            >
              <Save size={14} strokeWidth={2} />
              {editPending ? "Saving…" : "Save"}
            </ABtn>
            <form action={deleteAction} className="contents">
              <input type="hidden" name="id" value={rank.id} />
              <ABtn
                type="submit"
                variant="danger"
                size="xs"
                disabled={deletePending}
              >
                <Trash2 size={14} strokeWidth={2} />
                {deletePending ? "Deleting…" : "Delete"}
              </ABtn>
            </form>
          </div>
        </td>
      </tr>
      {(editState || deleteState) && (
        <tr>
          <td colSpan={6}>
            <FormMsg message={editState ?? deleteState} />
          </td>
        </tr>
      )}
    </>
  );
}
