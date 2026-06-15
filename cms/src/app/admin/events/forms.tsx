"use client";

import { useActionState, useState } from "react";
import {
  ACard, ABtn, Field, Select, Textarea, FormMsg, Tag,
  Save, Plus, Pencil, X, Trash2, ImageIcon,
} from "@/components/admin-ui";
import { MapPin, Calendar } from "lucide-react";
import { Modal } from "@/components/modal";
import { createEvent, updateEvent, deleteEvent } from "./actions";

export interface EventRow {
  id: number;
  title: string;
  description: string;
  image: string;
  location: string;
  visible: number;
  event_input: string | null;   // "YYYY-MM-DDTHH:MM" for <input type=datetime-local>
  event_display: string | null; // human-readable
}

/** Live preview of an event image (a full URL), with graceful fallback. */
function EventImagePreview({ image }: { image: string }) {
  const [broken, setBroken] = useState(false);
  if (!image || broken) {
    return (
      <div className="news-img-ph">
        <ImageIcon size={18} strokeWidth={2} />
        <span>Sin imagen</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image} alt="" className="news-img-preview" onError={() => setBroken(true)} />;
}

function EventFieldset({ defaults }: { defaults?: Partial<EventRow> }) {
  const [image, setImage] = useState(defaults?.image ?? "");
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <Field label="Título" name="title" required maxLength={100}
          defaultValue={defaults?.title} placeholder="Fiesta de inauguración" className="w-full" />
        <Textarea label="Descripción" name="description" rows={3}
          defaultValue={defaults?.description} maxLength={800}
          placeholder="¡Únete a la gran fiesta de apertura con premios y sorpresas!" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha y hora" name="event_date" type="datetime-local"
            defaultValue={defaults?.event_input ?? ""} />
          <Field label="Lugar" name="location" maxLength={120}
            defaultValue={defaults?.location} placeholder="Sala: La Plaza" />
        </div>
        <Field label="URL de imagen" name="image" value={image}
          onChange={(e) => setImage(e.target.value)} maxLength={300}
          placeholder="https://…/evento.png" className="w-full" />
        <Select label="Visibilidad" name="visible" defaultValue={String(defaults?.visible ?? 1)}>
          <option value="1">Visible en la comunidad</option>
          <option value="0">Oculto (borrador)</option>
        </Select>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="alabel">Vista previa</span>
        <EventImagePreview image={image} />
      </div>
    </div>
  );
}

/** Button + modal to create a new event. */
export function CreateEventModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ABtn type="button" variant="primary" onClick={() => setOpen(true)}>
        <Plus size={14} strokeWidth={2} /> Crear evento
      </ABtn>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Crear evento"
        subtitle="Se muestra en la comunidad"
        icon={<Calendar size={18} strokeWidth={2} />}
        size="lg"
      >
        <CreateEventForm />
      </Modal>
    </>
  );
}

export function CreateEventForm() {
  const [state, action, pending] = useActionState(createEvent, null);
  return (
    <form action={action} className="space-y-4">
      <EventFieldset />
      <div className="flex items-center justify-end gap-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
        <FormMsg message={state} />
        <ABtn type="submit" variant="primary" disabled={pending}>
          <Plus size={14} strokeWidth={2} />
          {pending ? "Creando…" : "Crear evento"}
        </ABtn>
      </div>
    </form>
  );
}

export function EventCard({ event }: { event: EventRow }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateEvent, null);

  return (
    <ACard>
      <div>
        <div className="flex flex-wrap items-start gap-4">
          <div className="news-card-thumb">
            <EventImagePreview image={event.image} />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{event.title}</span>
              <span className="text-xs adim">#{event.id}</span>
              {event.visible ? (
                <Tag color="green">Visible</Tag>
              ) : (
                <Tag color="gray">Oculto</Tag>
              )}
            </div>
            {event.description && <p className="text-xs adim line-clamp-2">{event.description}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs adim">
              {event.event_display && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} strokeWidth={2} /> {event.event_display}
                </span>
              )}
              {event.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} strokeWidth={2} /> {event.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ABtn type="button" variant="default" size="xs" onClick={() => setEditing((v) => !v)} title="Editar">
              <Pencil size={13} strokeWidth={2} />
            </ABtn>
            <form
              action={deleteEvent.bind(null, event.id)}
              onSubmit={(e) => {
                if (!window.confirm(`¿Eliminar el evento "${event.title}"?`)) e.preventDefault();
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
            <input type="hidden" name="id" value={event.id} />
            <EventFieldset defaults={event} />
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
