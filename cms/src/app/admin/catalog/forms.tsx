"use client";

import { useActionState } from "react";
import { ABtn, Field, FormMsg, Plus } from "@/components/admin-ui";
import { createCatalogPage, createCatalogItem } from "./actions";

/** Create a sub-page inside the page currently being browsed (parentId). */
export function CreatePageForm({ parentId, here }: { parentId: number; here: string }) {
  const [state, action, pending] = useActionState(createCatalogPage, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="parent_id" value={parentId} />
      <p className="text-xs adim">New page inside <span className="amuted font-semibold">{here}</span></p>
      <Field label="Caption" name="caption" required placeholder="Super Furni" className="w-full" />
      <Field label="Min rank" name="min_rank" type="number" min={1} defaultValue={1} className="w-full" />
      <ABtn type="submit" variant="primary" disabled={pending}>
        <Plus size={14} strokeWidth={2} />
        {pending ? "Creating…" : "Add page"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}

/** Add a furni offer to the page currently being browsed (pageId). */
export function CreateItemForm({ pageId, here }: { pageId: number; here: string }) {
  const [state, action, pending] = useActionState(createCatalogItem, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="page_id" value={pageId} />
      <p className="text-xs adim">New item in <span className="amuted font-semibold">{here}</span></p>
      <Field label="Catalog name" name="catalog_name" required placeholder="dragon_lamp" className="w-full" />
      <Field label="Base item id" name="item_ids" type="number" min={1} required placeholder="1234" className="w-full" />
      <div className="grid grid-cols-3 gap-2">
        <Field label="Credits" name="cost_credits" type="number" min={0} defaultValue={0} />
        <Field label="Points" name="cost_points" type="number" min={0} defaultValue={0} />
        <Field label="Amount" name="amount" type="number" min={1} defaultValue={1} />
      </div>
      <ABtn type="submit" variant="primary" disabled={pending}>
        <Plus size={14} strokeWidth={2} />
        {pending ? "Adding…" : "Add item"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}
