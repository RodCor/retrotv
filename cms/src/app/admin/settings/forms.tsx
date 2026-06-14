"use client";

import { useActionState } from "react";
import {
  ABtn, Field, Select, FormMsg, Save, Tag, Puzzle, ToggleLeft, ToggleRight,
} from "@/components/admin-ui";
import { updateSetting, togglePlugin } from "./actions";

type ActionResult = { type: "error" | "success"; text: string };

/**
 * One installed-plugin row with an enable/disable toggle. The emulator loads
 * enabled plugins at boot, so a toggle takes effect on the next restart.
 */
export function PluginToggle({
  jar,
  name,
  description,
  enabled,
}: {
  jar: string;
  name: string;
  description: string;
  enabled: boolean;
}) {
  const action = async (): Promise<ActionResult> => togglePlugin(jar, !enabled);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="flex flex-col gap-1.5 border-b border-white/5 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Puzzle size={13} strokeWidth={2} style={{ color: "var(--cyan)", flexShrink: 0 }} />
          <span className="text-[13px] font-semibold">{name}</span>
          <code className="text-[11px]" style={{ color: "var(--rt-ink-soft, #8b93a7)" }}>{jar}</code>
          {enabled ? <Tag color="green">Activado</Tag> : <Tag color="gray">Desactivado</Tag>}
        </div>
        {description && (
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--rt-ink-soft, #8b93a7)" }}>{description}</p>
        )}
        <FormMsg message={state} />
      </div>
      <form action={formAction} className="flex shrink-0 items-center sm:w-[150px]">
        <ABtn
          type="submit"
          variant={enabled ? "default" : "primary"}
          size="xs"
          disabled={pending}
        >
          {enabled ? <ToggleRight size={13} strokeWidth={2} /> : <ToggleLeft size={13} strokeWidth={2} />}
          {pending ? "Guardando" : enabled ? "Desactivar" : "Activar"}
        </ABtn>
      </form>
    </div>
  );
}

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
            <option value="1">Activado</option>
            <option value="0">Desactivado</option>
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
          {pending ? "Guardando" : "Guardar"}
        </ABtn>
      </form>
    </div>
  );
}
