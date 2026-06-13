"use client";

import { useActionState } from "react";
import {
  Button,
  Input,
  Textarea,
  Select,
  Label,
  FormMessage,
} from "@/components/ui";
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
  pixels,
  points,
}: {
  userId: number;
  credits: number;
  pixels: number;
  points: number;
}) {
  const [state, action, pending] = useActionState(updateUserCurrency, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <h3 className="rt-display text-lg">Currency</h3>
      <FormMessage message={state} />
      <input type="hidden" name="userId" value={userId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="cur-credits">Credits</Label>
          <Input
            id="cur-credits"
            name="credits"
            type="number"
            defaultValue={credits}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cur-pixels">Pixels</Label>
          <Input
            id="cur-pixels"
            name="pixels"
            type="number"
            defaultValue={pixels}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cur-points">Points</Label>
          <Input
            id="cur-points"
            name="points"
            type="number"
            defaultValue={points}
          />
        </div>
      </div>
      <div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Saving…" : "Update currency"}
        </Button>
      </div>
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
    <form action={action} className="flex flex-col gap-3">
      <h3 className="rt-display text-lg">Rank</h3>
      <FormMessage message={state} />
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="rank">Permission rank</Label>
        <Select id="rank" name="rank" defaultValue={rank}>
          {options.map((o) => (
            <option key={o.level} value={o.level}>
              {o.level} — {o.rank_name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Button type="submit" variant="blue" disabled={pending}>
          {pending ? "Saving…" : "Update rank"}
        </Button>
      </div>
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
    <form action={action} className="flex flex-col gap-3">
      <h3 className="rt-display text-lg">Profile</h3>
      <FormMessage message={state} />
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="motto">Motto</Label>
        <Textarea id="motto" name="motto" defaultValue={motto} rows={2} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="look">Look (figure string)</Label>
        <Input id="look" name="look" defaultValue={look} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="mail">Email</Label>
        <Input id="mail" name="mail" type="email" defaultValue={mail ?? ""} />
      </div>
      <div>
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "Saving…" : "Update profile"}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------- reset password ------------------------ */

export function PasswordForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(resetUserPassword, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <h3 className="rt-display text-lg">Reset password</h3>
      <FormMessage message={state} />
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="newPass">New password</Label>
        <Input
          id="newPass"
          name="newPass"
          type="password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />
      </div>
      <div>
        <Button type="submit" variant="blue" disabled={pending}>
          {pending ? "Saving…" : "Reset password"}
        </Button>
      </div>
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
    <form action={action} className="flex flex-col gap-3">
      <h3 className="rt-display text-lg">Ban user</h3>
      <FormMessage message={state} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="staffId" value={staffId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor="reason">Reason</Label>
        <Input id="reason" name="reason" placeholder="Reason for ban…" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="hours">Duration (hours)</Label>
        <Input
          id="hours"
          name="hours"
          type="number"
          min={1}
          defaultValue={24}
        />
      </div>
      <div>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Banning…" : "Ban user"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------ delete ---------------------------- */

export function DeleteForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(deleteUser, null);
  return (
    <form
      action={action}
      className="flex flex-col gap-3"
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
      <h3 className="rt-display text-lg">Delete user</h3>
      <FormMessage message={state} />
      <input type="hidden" name="userId" value={userId} />
      <p className="text-sm opacity-70">
        This permanently removes the account from the database.
      </p>
      <div>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Deleting…" : "Delete user"}
        </Button>
      </div>
    </form>
  );
}
