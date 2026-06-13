"use client";

import { useActionState } from "react";
import { ABtn, Field, Select, FormMsg, Save } from "@/components/admin-ui";
import { updateSetting } from "./actions";

type ActionResult = { type: "error" | "success"; text: string };

/**
 * One editable emulator_settings row, with its own inline action state.
 * Renders a compact label + control + Save button. When `kind="bool"` the
 * control is a Yes/No <Select> emitting '1'/'0'; otherwise a free-text <Field>.
 */
export function SettingRow({
  settingKey,
  label,
  value,
  kind = "text",
  hint,
}: {
  settingKey: string;
  label: string;
  value: string;
  kind?: "text" | "bool";
  hint?: string;
}) {
  const action = async (
    _prev: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> => {
    const v = String(formData.get("value") ?? "");
    return updateSetting(settingKey, v);
  };

  const [state, formAction, pending] = useActionState(action, null);
  const bool = value === "1" || value === "0" ? value : "0";

  return (
    <div className="flex flex-col gap-1.5 border-b border-white/5 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[13px] font-semibold">{label}</span>
          <code
            className="text-[11px]"
            style={{ color: "var(--rt-ink-soft, #8b93a7)" }}
          >
            {settingKey}
          </code>
        </div>
        {hint && (
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--rt-ink-soft, #8b93a7)" }}
          >
            {hint}
          </p>
        )}
        <FormMsg message={state} />
      </div>
      <form
        action={formAction}
        className="flex shrink-0 items-center gap-2 sm:w-[260px]"
      >
        {kind === "bool" ? (
          <Select name="value" defaultValue={bool} className="flex-1">
            <option value="1">Enabled</option>
            <option value="0">Disabled</option>
          </Select>
        ) : (
          <Field
            name="value"
            defaultValue={value}
            autoComplete="off"
            className="flex-1"
          />
        )}
        <ABtn type="submit" variant="primary" size="xs" disabled={pending}>
          <Save size={12} strokeWidth={2} />
          {pending ? "Saving" : "Save"}
        </ABtn>
      </form>
    </div>
  );
}
