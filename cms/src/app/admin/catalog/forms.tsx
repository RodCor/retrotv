"use client";

import { useActionState } from "react";
import { Button, FormMessage, Input, Label, Select } from "@/components/ui";
import { createCatalogPage, createCatalogItem } from "./actions";

export interface PageOption {
  id: number;
  caption: string;
}

export function CreatePageForm({ pages }: { pages: PageOption[] }) {
  const [state, action, pending] = useActionState(createCatalogPage, null);

  return (
    <form action={action} className="rt-panel-muted" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
      <h3 style={{ fontWeight: 800, margin: 0 }}>Create catalog page</h3>
      <FormMessage message={state} />

      <div>
        <Label htmlFor="page-caption">Caption</Label>
        <Input id="page-caption" name="caption" required placeholder="Super Furni" />
      </div>

      <div>
        <Label htmlFor="page-parent">Parent page</Label>
        <Select id="page-parent" name="parent_id" defaultValue="-1">
          <option value="-1">Root (top level)</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.caption} (#{p.id})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="page-rank">Min rank</Label>
        <Input id="page-rank" name="min_rank" type="number" min={1} defaultValue={1} />
      </div>

      <div>
        <Label htmlFor="page-layout">Layout</Label>
        <Input id="page-layout" name="page_layout" defaultValue="default" />
      </div>

      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? "Creating…" : "Create page"}
      </Button>
    </form>
  );
}

export function CreateItemForm({ pages }: { pages: PageOption[] }) {
  const [state, action, pending] = useActionState(createCatalogItem, null);

  return (
    <form action={action} className="rt-panel-muted" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
      <h3 style={{ fontWeight: 800, margin: 0 }}>Create catalog item</h3>
      <FormMessage message={state} />

      <div>
        <Label htmlFor="item-name">Catalog name</Label>
        <Input id="item-name" name="catalog_name" required placeholder="dragon_lamp" />
      </div>

      <div>
        <Label htmlFor="item-base">Base item id (item_ids)</Label>
        <Input id="item-base" name="item_ids" type="number" min={1} required placeholder="1234" />
      </div>

      <div>
        <Label htmlFor="item-page">Catalog page</Label>
        <Select id="item-page" name="page_id" required defaultValue="">
          <option value="" disabled>
            Select a page…
          </option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.caption} (#{p.id})
            </option>
          ))}
        </Select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        <div>
          <Label htmlFor="item-credits">Cost (credits)</Label>
          <Input id="item-credits" name="cost_credits" type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label htmlFor="item-points">Cost (points)</Label>
          <Input id="item-points" name="cost_points" type="number" min={0} defaultValue={0} />
        </div>
      </div>

      <div>
        <Label htmlFor="item-amount">Amount</Label>
        <Input id="item-amount" name="amount" type="number" min={1} defaultValue={1} />
      </div>

      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? "Creating…" : "Create item"}
      </Button>
    </form>
  );
}
