"use client";

import { useActionState } from "react";
import { Input, Label, Button, FormMessage } from "@/components/ui";
import { changePasswordAction, type ActionState } from "./actions";

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
