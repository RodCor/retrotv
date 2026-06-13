"use client";

import { useActionState } from "react";
import { ABtn, Field, Select, FormMsg, Plus } from "@/components/admin-ui";
import { createCatalogPage, createCatalogItem } from "./actions";

export interface PageOption {
  id: number;
  caption: string;
}

export function CreatePageForm({ pages }: { pages: PageOption[] }) {
  const [state, action, pending] = useActionState(createCatalogPage, null);

  return (
    <form action={action} className="space-y-3">
      <Field
        label="Caption"
        name="caption"
        required
        placeholder="Super Furni"
        className="w-full"
      />

      <Select label="Parent page" name="parent_id" defaultValue="-1" className="w-full">
        <option value="-1">Root (top level)</option>
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.caption} (#{p.id})
          </option>
        ))}
      </Select>

      <Field
        label="Min rank"
        name="min_rank"
        type="number"
        min={1}
        defaultValue={1}
        className="w-full"
      />

      <Field
        label="Layout"
        name="page_layout"
        defaultValue="default"
        className="w-full"
      />

      <ABtn type="submit" variant="primary" disabled={pending}>
        <Plus size={14} strokeWidth={2} />
        {pending ? "Creating…" : "Create"}
      </ABtn>

      <FormMsg message={state} />
    </form>
  );
}

export function CreateItemForm({ pages }: { pages: PageOption[] }) {
  const [state, action, pending] = useActionState(createCatalogItem, null);

  return (
    <form action={action} className="space-y-3">
      <Field
        label="Catalog name"
        name="catalog_name"
        required
        placeholder="dragon_lamp"
        className="w-full"
      />

      <Field
        label="Base item id (item_ids)"
        name="item_ids"
        type="number"
        min={1}
        required
        placeholder="1234"
        className="w-full"
      />

      <Select label="Catalog page" name="page_id" required defaultValue="" className="w-full">
        <option value="" disabled>
          Select a page…
        </option>
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.caption} (#{p.id})
          </option>
        ))}
      </Select>

      <Field
        label="Cost (credits)"
        name="cost_credits"
        type="number"
        min={0}
        defaultValue={0}
        className="w-full"
      />

      <Field
        label="Cost (points)"
        name="cost_points"
        type="number"
        min={0}
        defaultValue={0}
        className="w-full"
      />

      <Field
        label="Amount"
        name="amount"
        type="number"
        min={1}
        defaultValue={1}
        className="w-full"
      />

      <ABtn type="submit" variant="primary" disabled={pending}>
        <Plus size={14} strokeWidth={2} />
        {pending ? "Creating…" : "Create"}
      </ABtn>

      <FormMsg message={state} />
    </form>
  );
}
