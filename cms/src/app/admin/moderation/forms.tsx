"use client";

import { useActionState } from "react";
import { Field, ABtn, FormMsg, Ban } from "@/components/admin-ui";
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
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Field
          label="Username"
          name="username"
          placeholder="HabboName"
          autoComplete="off"
          required
        />
        <Field
          label="Reason"
          name="reason"
          placeholder="Breaking the rules…"
          autoComplete="off"
        />
        <Field
          label="Duration (hours)"
          name="hours"
          type="number"
          min={1}
          step={1}
          defaultValue={24}
          required
        />
      </div>
      <div className="flex items-center gap-3">
        <ABtn type="submit" variant="danger" disabled={pending}>
          <Ban size={14} strokeWidth={2} />
          {pending ? "Banning…" : "Ban"}
        </ABtn>
      </div>
      <FormMsg message={state} />
    </form>
  );
}
