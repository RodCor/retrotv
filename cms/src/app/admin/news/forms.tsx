"use client";

import { useActionState, useState } from "react";
import {
  ACard, ABtn, Field, Select, Textarea, FormMsg, Tag,
  Save, Plus, Pencil, X, Trash2, ImageIcon, Megaphone,
} from "@/components/admin-ui";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/modal";
import { createNews, updateNews, deleteNews } from "./actions";

export interface NewsRow {
  id: number;
  title: string;
  text: string;
  button_text: string;
  button_type: "web" | "client";
  button_link: string;
  image: string;
}

/** Live preview of a hotelview_news billboard image, with graceful fallback. */
function NewsImagePreview({ promoBase, image }: { promoBase: string; image: string }) {
  const [broken, setBroken] = useState(false);
  const src = image ? `${promoBase}/${image}` : "";
  if (!src || broken) {
    return (
      <div className="news-img-ph">
        <ImageIcon size={18} strokeWidth={2} />
        <span>Sin imagen</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="news-img-preview" onError={() => setBroken(true)} />;
}

/** Shared field set for create/edit. `image` is controlled so the preview is live. */
function NewsFieldset({
  promoBase,
  defaults,
}: {
  promoBase: string;
  defaults?: Partial<NewsRow>;
}) {
  const [image, setImage] = useState(defaults?.image ?? "");
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <Field label="Título" name="title" required maxLength={100}
          defaultValue={defaults?.title} placeholder="¡Abre tu calendario de verano!" className="w-full" />
        <Textarea label="Texto" name="text" rows={3}
          defaultValue={defaults?.text} maxLength={500}
          placeholder="Cada día recibirás un regalo gratis…" />
        <Field label="Ruta de imagen" name="image" required value={image}
          onChange={(e) => setImage(e.target.value)} maxLength={200}
          placeholder="web_promo_small/spromo_h20_calrew.png" className="w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Texto del botón" name="button_text" maxLength={50}
            defaultValue={defaults?.button_text} placeholder="¡Ábrelo!" />
          <Select label="Tipo de botón" name="button_type" defaultValue={defaults?.button_type ?? "web"}>
            <option value="web">Web (abre un enlace)</option>
            <option value="client">Cliente (acción interna)</option>
          </Select>
        </div>
        <Field label="Enlace / acción del botón" name="button_link" maxLength={200}
          defaultValue={defaults?.button_link}
          placeholder="https://… o openView/calendar" className="w-full" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="alabel">Vista previa</span>
        <NewsImagePreview promoBase={promoBase} image={image} />
      </div>
    </div>
  );
}

/** Button + modal to publish a new news billboard. */
export function CreateNewsModal({ promoBase }: { promoBase: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ABtn type="button" variant="primary" onClick={() => setOpen(true)}>
        <Plus size={14} strokeWidth={2} /> Publicar noticia
      </ABtn>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Publicar noticia"
        subtitle="Aparece en la portada del hotel"
        icon={<Megaphone size={18} strokeWidth={2} />}
        size="lg"
      >
        <CreateNewsForm promoBase={promoBase} />
      </Modal>
    </>
  );
}

/** Create a new news billboard. */
export function CreateNewsForm({ promoBase }: { promoBase: string }) {
  const [state, action, pending] = useActionState(createNews, null);
  return (
    <form action={action} className="space-y-4">
      <NewsFieldset promoBase={promoBase} />
      <div className="flex items-center justify-end gap-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
        <FormMsg message={state} />
        <ABtn type="submit" variant="primary" disabled={pending}>
          <Plus size={14} strokeWidth={2} />
          {pending ? "Publicando…" : "Publicar"}
        </ABtn>
      </div>
    </form>
  );
}

/** One news billboard: preview + meta + edit/delete, with an inline editor. */
export function NewsCard({ news, promoBase }: { news: NewsRow; promoBase: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateNews, null);

  return (
    <ACard>
      <div>
        <div className="flex flex-wrap items-start gap-4">
          <div className="news-card-thumb">
            <NewsImagePreview promoBase={promoBase} image={news.image} />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{news.title}</span>
              <span className="text-xs adim">#{news.id}</span>
            </div>
            {news.text && <p className="text-xs adim line-clamp-3">{news.text}</p>}
            {news.button_text && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <Tag color={news.button_type === "client" ? "cyan" : "amber"}>
                  {news.button_type === "client" ? "Cliente" : "Web"}
                </Tag>
                <span className="idchip" title={news.button_link}>
                  {news.button_text}
                  {news.button_link && (
                    <ExternalLink size={11} strokeWidth={2} className="ml-1 inline opacity-60" />
                  )}
                </span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ABtn type="button" variant="default" size="xs" onClick={() => setEditing((v) => !v)} title="Editar">
              <Pencil size={13} strokeWidth={2} />
            </ABtn>
            <form
              action={deleteNews.bind(null, news.id)}
              onSubmit={(e) => {
                if (!window.confirm(`¿Eliminar la noticia "${news.title}"?`)) e.preventDefault();
              }}
            >
              <ABtn type="submit" variant="danger" size="xs" title="Eliminar">
                <Trash2 size={13} strokeWidth={2} />
              </ABtn>
            </form>
          </div>
        </div>

        {editing && (
          <form action={action} className="news-edit-panel">
            <input type="hidden" name="id" value={news.id} />
            <NewsFieldset promoBase={promoBase} defaults={news} />
            <div className="flex items-center gap-2">
              <ABtn type="submit" variant="primary" disabled={pending}>
                <Save size={13} strokeWidth={2} />
                {pending ? "Guardando…" : "Guardar cambios"}
              </ABtn>
              <ABtn type="button" variant="default" onClick={() => setEditing(false)}>
                <X size={13} strokeWidth={2} /> Cerrar
              </ABtn>
              <FormMsg message={state} />
            </div>
          </form>
        )}
      </div>
    </ACard>
  );
}
