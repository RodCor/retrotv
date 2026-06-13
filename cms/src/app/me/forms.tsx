"use client";

import { useActionState, useState } from "react";
import { Input, Textarea, Label, Button, FormMessage } from "@/components/ui";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import {
  updateProfileAction,
  changePasswordAction,
  type ActionState,
} from "./actions";

export function ProfileForm({
  user,
}: {
  user: { motto: string; look: string };
}) {
  const [state, formAction, pending] = useActionState<
    ActionState | null,
    FormData
  >(updateProfileAction, null);
  const [look, setLook] = useState(user.look);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state} />

      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="rt-avatar"
            src={avatarImageUrl(look || user.look, { size: "l" })}
            alt="Avatar preview"
          />
          <span className="text-xs opacity-70">Live preview</span>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="motto">Motto</Label>
            <Input
              id="motto"
              name="motto"
              defaultValue={user.motto}
              maxLength={127}
              placeholder="Say something…"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="look">Figure string (look)</Label>
            <Input
              id="look"
              name="look"
              value={look}
              onChange={(e) => setLook(e.target.value)}
              placeholder="hr-100-.hd-180-.ch-..."
            />
          </div>

          <div>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<
    ActionState | null,
    FormData
  >(changePasswordAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state} />

      <div className="flex flex-col gap-1">
        <Label htmlFor="current">Current password</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="next">New password</Label>
        <Input id="next" name="next" type="password" autoComplete="new-password" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
      </div>

      <div>
        <Button type="submit" variant="blue" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
