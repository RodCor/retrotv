"use client";

import { useActionState, useState } from "react";
import { Button, FormMessage, Input, Label } from "@/components/ui";
import { avatarImageUrl } from "@/lib/habbo-imaging";
import { saveUserLook } from "./actions";

const DEFAULT_LOOK = "hr-100-0.hd-180-1.ch-210-66.lg-270-82.sh-290-80";

export function SetLookForm() {
  const [state, action, pending] = useActionState(saveUserLook, null);
  const [look, setLook] = useState(DEFAULT_LOOK);

  const trimmed = look.trim();
  const previewUrl = trimmed ? avatarImageUrl(trimmed, { size: "l" }) : null;

  return (
    <form
      action={action}
      className="rt-panel"
      style={{ padding: "1.25rem", display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0, 1fr) auto" }}
    >
      <div style={{ display: "grid", gap: "0.6rem" }}>
        <h2 style={{ fontWeight: 800, margin: 0 }}>Figure / Look editor</h2>
        <p style={{ color: "var(--rt-muted, #777)", margin: 0, fontSize: "0.9rem" }}>
          Paste a figure string and a target username to overwrite their look.
        </p>

        <FormMessage message={state} />

        <div>
          <Label htmlFor="look-username">Target username</Label>
          <Input id="look-username" name="username" required placeholder="CoolHabbo" />
        </div>

        <div>
          <Label htmlFor="look-figure">Figure string</Label>
          <Input
            id="look-figure"
            name="look"
            required
            value={look}
            onChange={(e) => setLook(e.target.value)}
            placeholder="hr-100-0.hd-180-1.ch-210-66…"
          />
        </div>

        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "Saving…" : "Save look"}
        </Button>
      </div>

      <div style={{ display: "grid", placeItems: "center", minWidth: "140px" }}>
        <Label>Live preview</Label>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="rt-avatar" src={previewUrl} alt="Avatar preview" />
        ) : (
          <div className="rt-panel-muted" style={{ padding: "2rem", textAlign: "center" }}>
            No figure
          </div>
        )}
      </div>
    </form>
  );
}
