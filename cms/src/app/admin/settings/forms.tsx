"use client";

import { useActionState } from "react";
import { Button, Input, FormMessage } from "@/components/ui";
import { updateSetting } from "./actions";

type ActionResult = { type: "error" | "success"; text: string };

/** One editable emulator_settings row, with its own inline action state. */
export function SettingRow({
  settingKey,
  value,
}: {
  settingKey: string;
  value: string;
}) {
  const action = async (
    _prev: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> => {
    const v = String(formData.get("value") ?? "");
    return updateSetting(settingKey, v);
  };

  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <code className="font-bold" style={{ color: "var(--rt-blue)" }}>
          {settingKey}
        </code>
      </div>
      <form action={formAction} className="flex items-center gap-2">
        <Input
          name="value"
          defaultValue={value}
          autoComplete="off"
          className="flex-1"
        />
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
      <FormMessage message={state} />
    </div>
  );
}
