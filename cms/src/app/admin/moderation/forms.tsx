"use client";

import { useActionState } from "react";
import { Button, Input, Label, FormMessage } from "@/components/ui";
import { banUserByName } from "./actions";

type ActionResult = { type: "error" | "success"; text: string };

async function banAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const hours = Number(formData.get("hours") ?? 0);
  return banUserByName(username, reason, hours);
}

/** Client form for banning a user, with inline validation messages. */
export function BanUserForm() {
  const [state, formAction, pending] = useActionState(banAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage message={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="ban-username">Username</Label>
          <Input
            id="ban-username"
            name="username"
            placeholder="HabboName"
            autoComplete="off"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="ban-hours">Duration (hours)</Label>
          <Input
            id="ban-hours"
            name="hours"
            type="number"
            min={1}
            step={1}
            defaultValue={24}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="ban-reason">Reason</Label>
        <Input
          id="ban-reason"
          name="reason"
          placeholder="Breaking the rules…"
          autoComplete="off"
        />
      </div>
      <div>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Banning…" : "🔨 Ban user"}
        </Button>
      </div>
    </form>
  );
}
