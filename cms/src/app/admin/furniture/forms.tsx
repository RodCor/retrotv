"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  ACard, ABtn, Field, Select, FormMsg, Tag,
  Search, Plus, Trash2, ImageIcon, Check,
} from "@/components/admin-ui";
import { UploadCloud, FileBox } from "lucide-react";
import { Modal } from "@/components/modal";
import { searchFurni, createFurniOffer, deleteFurniOffer, createFurni, type FurniHit } from "./actions";

/** Button + modal for the "create furni" SWF upload flow. */
export function CreateFurniModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ABtn type="button" variant="primary" onClick={() => setOpen(true)}>
        <UploadCloud size={14} strokeWidth={2} /> Crear mueble nuevo
      </ABtn>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Crear mueble nuevo"
        subtitle="Sube un .swf y se instala en el hotel"
        icon={<UploadCloud size={18} strokeWidth={2} />}
        size="lg"
      >
        <CreateFurniForm />
      </Modal>
    </>
  );
}

/** Pretty .swf picker that shows the chosen filename. */
function SwfFileInput() {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <label className={`swf-drop ${fileName ? "has-file" : ""}`}>
      <input
        type="file" name="swf" accept=".swf" required
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      <span className="swf-drop__ic"><FileBox size={18} strokeWidth={2} /></span>
      <span className="min-w-0">
        <span className="swf-drop__main block truncate">{fileName ?? "Selecciona el archivo .swf del mueble"}</span>
        <span className="swf-drop__sub">{fileName ? "Listo para convertir" : "Haz clic para elegir un archivo"}</span>
      </span>
    </label>
  );
}

/** Upload a brand-new furni SWF and register it into the hotel. */
export function CreateFurniForm() {
  const [state, action, pending] = useActionState(createFurni, null);

  return (
    <form action={action} className="space-y-4">
      <SwfFileInput />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Clase (única)" name="class" required maxLength={64}
          placeholder="retrotv_silla" pattern="[a-zA-Z0-9_]+" />
        <Field label="Nombre" name="name" required maxLength={56} placeholder="Silla RetroTV" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Tipo" name="type" defaultValue="floor">
          <option value="floor">Suelo</option>
          <option value="wall">Pared</option>
        </Select>
        <Field label="Categoría" name="category" placeholder="chair, table…" maxLength={32} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Ancho" name="x" type="number" min={1} max={64} defaultValue={1} />
        <Field label="Largo" name="y" type="number" min={1} max={64} defaultValue={1} />
        <Field label="Altura" name="z" type="number" min={0} step={0.01} defaultValue={0} />
        <Field label="Revisión" name="revision" type="number" min={0} defaultValue={1} />
      </div>

      <div>
        <span className="alabel">Comportamiento</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="chip-check"><input type="checkbox" name="siton" value="1" /> Sentarse</label>
          <label className="chip-check"><input type="checkbox" name="layon" value="1" /> Tumbarse</label>
          <label className="chip-check"><input type="checkbox" name="standon" value="1" /> Caminar encima</label>
        </div>
      </div>

      <Field label="Descripción (opcional)" name="description" maxLength={128} className="w-full" />

      <div className="flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
        <p className="text-xs adim max-w-[60%]">
          El SWF debe estar creado con su clase interna correcta para verse bien.
        </p>
        <ABtn type="submit" variant="primary" disabled={pending}>
          <UploadCloud size={14} strokeWidth={2} />
          {pending ? "Instalando… (~20s)" : "Crear e instalar"}
        </ABtn>
      </div>
      <FormMsg message={state} />
    </form>
  );
}

export interface CatalogPageOption {
  id: number;
  caption: string;
}

export interface RecentOffer {
  id: number;
  catalog_name: string;
  item_id: string;
  item_name: string | null;
  page_caption: string | null;
  cost_credits: number;
  cost_points: number;
  points_type: number;
  amount: number;
}

/** Furni icon by classname, with graceful fallback when no icon exists. */
function FurniIcon({ base, name, size = 40 }: { base: string; name: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (!name || broken) {
    return (
      <span className="furni-ic furni-ic--empty" style={{ width: size, height: size }}>
        <ImageIcon size={16} strokeWidth={2} />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      className="furni-ic"
      style={{ width: size, height: size }}
      src={`${base}/${encodeURIComponent(name)}_icon.png`}
      alt={name}
      onError={() => setBroken(true)}
    />
  );
}

export function FurnitureStudio({
  pages,
  furniIconBase,
  recent,
}: {
  pages: CatalogPageOption[];
  furniIconBase: string;
  recent: RecentOffer[];
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<FurniHit[]>([]);
  const [selected, setSelected] = useState<FurniHit | null>(null);
  const [searching, startSearch] = useTransition();
  const [state, action, pending] = useActionState(createFurniOffer, null);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => startSearch(async () => setHits(await searchFurni(q))), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Library search */}
      <ACard title="Biblioteca de muebles" icon={<Search size={16} strokeWidth={2} />}>
        <div className="space-y-3">
          <Field
            label="Buscar por nombre o clase"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="throne, sofá, hc, dragon…"
            autoComplete="off"
          />
          {q.trim().length < 2 ? (
            <p className="text-xs adim">Escribe al menos 2 caracteres para buscar entre los muebles.</p>
          ) : searching && hits.length === 0 ? (
            <p className="text-xs adim">Buscando…</p>
          ) : hits.length === 0 ? (
            <p className="text-xs adim">Sin resultados para “{q}”.</p>
          ) : (
            <div className="furni-grid">
              {hits.map((h) => (
                <button
                  type="button"
                  key={h.id}
                  className={`furni-pick ${selected?.id === h.id ? "is-selected" : ""}`}
                  onClick={() => setSelected(h)}
                  title={`${h.item_name} · ${h.width}x${h.length}`}
                >
                  <FurniIcon base={furniIconBase} name={h.item_name} />
                  <span className="furni-pick__name">{h.public_name || h.item_name}</span>
                  <span className="furni-pick__cls">{h.item_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </ACard>

      {/* Offer builder */}
      <ACard title="Crear oferta" icon={<Plus size={16} strokeWidth={2} />}>
        {!selected ? (
          <p className="text-sm adim">Selecciona un mueble de la biblioteca para crear su oferta de catálogo.</p>
        ) : (
          <form action={action} className="space-y-3" key={selected.id}>
            <input type="hidden" name="base_id" value={selected.id} />
            <div className="flex items-center gap-3 rounded-lg p-2" style={{ background: "rgba(124,152,230,0.07)" }}>
              <FurniIcon base={furniIconBase} name={selected.item_name} size={44} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{selected.public_name || selected.item_name}</div>
                <div className="truncate text-xs adim">{selected.item_name} · {selected.width}×{selected.length} · #{selected.id}</div>
              </div>
            </div>

            <Field label="Nombre en el catálogo" name="catalog_name" required maxLength={100}
              defaultValue={selected.public_name || selected.item_name} className="w-full" />
            <Select label="Página del catálogo" name="page_id" defaultValue={pages[0]?.id ?? ""}>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>{p.caption || `Página #${p.id}`}</option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Créditos" name="cost_credits" type="number" min={0} defaultValue={0} />
              <Field label="Cantidad" name="amount" type="number" min={1} defaultValue={1} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Puntos" name="cost_points" type="number" min={0} defaultValue={0} />
              <Select label="Tipo de moneda" name="points_type" defaultValue="0">
                <option value="0">Duckets / Píxeles</option>
                <option value="5">Diamantes</option>
              </Select>
            </div>
            <Select label="Acceso" name="club_only" defaultValue="0">
              <option value="0">Para todos</option>
              <option value="1">Solo HC</option>
            </Select>
            <ABtn type="submit" variant="primary" disabled={pending}>
              <Check size={14} strokeWidth={2} />
              {pending ? "Añadiendo…" : "Añadir al catálogo"}
            </ABtn>
            <FormMsg message={state} />
          </form>
        )}
      </ACard>

      {/* Recently added */}
      <ACard title="Añadidos recientemente" icon={<Plus size={16} strokeWidth={2} />} className="lg:col-span-2">
        {recent.length === 0 ? (
          <p className="text-sm adim">Todavía no has añadido muebles desde aquí.</p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg p-1.5" style={{ background: "rgba(124,152,230,0.05)" }}>
                <FurniIcon base={furniIconBase} name={r.item_name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.catalog_name}</div>
                  <div className="truncate text-xs adim">
                    {r.page_caption ?? `Página #${r.id}`} · {r.item_name ?? `#${r.item_id}`}
                    {r.amount > 1 ? ` · x${r.amount}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.cost_credits > 0 && <Tag color="amber">{r.cost_credits} c</Tag>}
                  {r.cost_points > 0 && <Tag color="cyan">{r.cost_points} {r.points_type === 5 ? "💎" : "px"}</Tag>}
                  {r.cost_credits === 0 && r.cost_points === 0 && <Tag color="green">Gratis</Tag>}
                  <form action={deleteFurniOffer.bind(null, r.id)}>
                    <ABtn type="submit" variant="danger" size="xs" title="Quitar del catálogo">
                      <Trash2 size={12} strokeWidth={2} />
                    </ABtn>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </ACard>
    </div>
  );
}
