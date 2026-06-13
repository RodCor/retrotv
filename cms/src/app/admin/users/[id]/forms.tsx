"use client";

import { useActionState } from "react";
import {
  Field,
  Select,
  Textarea,
  ABtn,
  FormMsg,
  Coins,
  Gem,
  Diamond,
  Save,
  Crown,
  Pencil,
  KeyRound,
  Ban,
  Trash2,
} from "@/components/admin-ui";
import {
  updateUserCurrency,
  updateUserRank,
  updateUserProfile,
  resetUserPassword,
  banUser,
  deleteUser,
} from "../actions";

interface RankOption {
  level: number;
  rank_name: string;
}

/* ----------------------------- currency ---------------------------- */

export function CurrencyForm({
  userId,
  credits,
  duckets,
  diamonds,
  points,
}: {
  userId: number;
  credits: number;
  duckets: number;
  diamonds: number;
  points: number;
}) {
  const [state, action, pending] = useActionState(updateUserCurrency, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Credits"
          name="credits"
          type="number"
          min={0}
          defaultValue={credits}
        />
        <Field
          label="Duckets"
          name="duckets"
          type="number"
          min={0}
          defaultValue={duckets}
        />
        <Field
          label="Diamonds"
          name="diamonds"
          type="number"
          min={0}
          defaultValue={diamonds}
        />
        <Field
          label="Points"
          name="points"
          type="number"
          min={0}
          defaultValue={points}
        />
      </div>
      <div className="flex items-center gap-3">
        <ABtn variant="primary" type="submit" disabled={pending}>
          <Save size={14} strokeWidth={2} />
          {pending ? "Saving…" : "Save"}
        </ABtn>
        <span className="flex items-center gap-3 text-xs opacity-50">
          <Coins size={13} strokeWidth={2} />
          <Gem size={13} strokeWidth={2} />
          <Diamond size={13} strokeWidth={2} />
        </span>
      </div>
      <FormMsg message={state} />
    </form>
  );
}

/* ------------------------------ rank ------------------------------ */

export function RankForm({
  userId,
  rank,
  ranks,
}: {
  userId: number;
  rank: number;
  ranks: RankOption[];
}) {
  const [state, action, pending] = useActionState(updateUserRank, null);
  const options =
    ranks.length > 0
      ? ranks
      : [1, 2, 3, 4, 5, 6, 7].map((l) => ({ level: l, rank_name: `Rank ${l}` }));
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <Select label="Permission rank" name="rank" defaultValue={rank}>
        {options.map((o) => (
          <option key={o.level} value={o.level}>
            {o.level} — {o.rank_name}
          </option>
        ))}
      </Select>
      <ABtn variant="solid" type="submit" disabled={pending}>
        <Crown size={14} strokeWidth={2} />
        {pending ? "Saving…" : "Update rank"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}

/* ----------------------------- profile ---------------------------- */

export function ProfileForm({
  userId,
  motto,
  look,
  mail,
}: {
  userId: number;
  motto: string;
  look: string;
  mail: string | null;
}) {
  const [state, action, pending] = useActionState(updateUserProfile, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <Textarea label="Motto" name="motto" defaultValue={motto} rows={2} />
      <Field label="Look (figure string)" name="look" defaultValue={look} />
      <Field
        label="Email"
        name="mail"
        type="email"
        defaultValue={mail ?? ""}
      />
      <ABtn variant="primary" type="submit" disabled={pending}>
        <Pencil size={14} strokeWidth={2} />
        {pending ? "Saving…" : "Update profile"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}

/* -------------------------- reset password ------------------------ */

export function PasswordForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(resetUserPassword, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <Field
        label="New password"
        name="newPass"
        type="password"
        placeholder="At least 6 characters"
        autoComplete="new-password"
      />
      <ABtn variant="solid" type="submit" disabled={pending}>
        <KeyRound size={14} strokeWidth={2} />
        {pending ? "Saving…" : "Reset password"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}

/* ------------------------------- ban ------------------------------ */

export function BanForm({
  userId,
  staffId,
}: {
  userId: number;
  staffId: number;
}) {
  const [state, action, pending] = useActionState(banUser, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="staffId" value={staffId} />
      <Field label="Reason" name="reason" placeholder="Reason for ban…" />
      <Field
        label="Duration (hours)"
        name="hours"
        type="number"
        min={1}
        defaultValue={24}
      />
      <ABtn variant="danger" type="submit" disabled={pending}>
        <Ban size={14} strokeWidth={2} />
        {pending ? "Banning…" : "Ban user"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}

/* ------------------------------ delete ---------------------------- */

export function DeleteForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(deleteUser, null);
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Permanently delete this user? This cannot be undone.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs opacity-60">
        This permanently removes the account from the database.
      </p>
      <ABtn variant="danger" type="submit" disabled={pending}>
        <Trash2 size={14} strokeWidth={2} />
        {pending ? "Deleting…" : "Delete user"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}
