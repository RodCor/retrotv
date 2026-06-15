"use client";

import { useActionState, useState } from "react";
import {
  ACard, ABtn, Field, Select, Textarea, FormMsg, Tag,
  Save, Plus, Pencil, X, Trash2,
} from "@/components/admin-ui";
import { Newspaper, Trophy } from "lucide-react";
import { Modal } from "@/components/modal";
import { createPost, updatePost, deletePost } from "./actions";

export interface PostRow {
  id: number;
  category: "news" | "competition";
  title: string;
  excerpt: string;
  body: string;
  image: string;
  label: string;
  author: string;
  pinned: number;
  visible: number;
  starts_input: string | null;
  starts_display: string | null;
}

function PostFieldset({ defaults }: { defaults?: Partial<PostRow> }) {
  const [category, setCategory] = useState(defaults?.category ?? "news");
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Sección" name="category" defaultValue={category} onChange={(e) => setCategory(e.target.value as "news" | "competition")}>
          <option value="news">Comunidad (noticia)</option>
          <option value="competition">Competiciones</option>
        </Select>
        <Field label="Etiqueta" name="label" maxLength={40} defaultValue={defaults?.label} placeholder="Evento, Torneo, Catálogo…" />
      </div>
      <Field label="Título" name="title" required maxLength={140} defaultValue={defaults?.title} className="w-full" />
      <Field label="Resumen (tarjetas/portada)" name="excerpt" maxLength={300} defaultValue={defaults?.excerpt} className="w-full" />
      <Textarea label="Contenido" name="body" rows={4} required defaultValue={defaults?.body} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="URL de imagen (opcional)" name="image" maxLength={300} defaultValue={defaults?.image} placeholder="https://…" />
        <Field label="Autor" name="author" maxLength={64} defaultValue={defaults?.author} placeholder="Equipo RetroTV" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {category === "competition" && (
          <Field label="Fecha (competición)" name="starts_at" type="datetime-local" defaultValue={defaults?.starts_input ?? ""} />
        )}
        <Select label="Destacar" name="pinned" defaultValue={String(defaults?.pinned ?? 0)}>
          <option value="0">No</option>
          <option value="1">Sí (primero)</option>
        </Select>
        <Select label="Visibilidad" name="visible" defaultValue={String(defaults?.visible ?? 1)}>
          <option value="1">Visible</option>
          <option value="0">Oculto</option>
        </Select>
      </div>
    </div>
  );
}

export function CreatePostModal() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createPost, null);
  return (
    <>
      <ABtn type="button" variant="primary" onClick={() => setOpen(true)}>
        <Plus size={14} strokeWidth={2} /> Nueva publicación
      </ABtn>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva publicación" subtitle="Comunidad o Competiciones" icon={<Newspaper size={18} strokeWidth={2} />} size="lg">
        <form action={action} className="space-y-4">
          <PostFieldset />
          <div className="flex items-center justify-end gap-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
            <FormMsg message={state} />
            <ABtn type="submit" variant="primary" disabled={pending}>
              <Plus size={14} strokeWidth={2} />{pending ? "Publicando…" : "Publicar"}
            </ABtn>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function PostCard({ post }: { post: PostRow }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updatePost, null);
  const isComp = post.category === "competition";
  return (
    <ACard>
      <div>
        <div className="flex flex-wrap items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: isComp ? "rgba(245,130,31,.14)" : "rgba(0,163,224,.14)", color: isComp ? "var(--amber-deep, #f5821f)" : "var(--cyan)" }}>
            {isComp ? <Trophy size={16} strokeWidth={2} /> : <Newspaper size={16} strokeWidth={2} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{post.title}</span>
              <span className="text-xs adim">#{post.id}</span>
              <Tag color={isComp ? "amber" : "cyan"}>{isComp ? "Competición" : "Comunidad"}</Tag>
              {post.pinned ? <Tag color="green">Destacado</Tag> : null}
              {!post.visible ? <Tag color="gray">Oculto</Tag> : null}
            </div>
            {post.excerpt && <p className="mt-1 text-xs adim line-clamp-2">{post.excerpt}</p>}
            <div className="mt-1 text-xs adim">
              {post.starts_display ? `${post.starts_display} · ` : ""}{post.author}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ABtn type="button" variant="default" size="xs" onClick={() => setEditing((v) => !v)} title="Editar"><Pencil size={13} strokeWidth={2} /></ABtn>
            <form action={deletePost.bind(null, post.id)} onSubmit={(e) => { if (!window.confirm(`¿Eliminar "${post.title}"?`)) e.preventDefault(); }}>
              <ABtn type="submit" variant="danger" size="xs" title="Eliminar"><Trash2 size={13} strokeWidth={2} /></ABtn>
            </form>
          </div>
        </div>
        {editing && (
          <form action={action} className="news-edit-panel">
            <input type="hidden" name="id" value={post.id} />
            <PostFieldset defaults={post} />
            <div className="flex items-center gap-2">
              <ABtn type="submit" variant="primary" disabled={pending}><Save size={13} strokeWidth={2} />{pending ? "Guardando…" : "Guardar cambios"}</ABtn>
              <ABtn type="button" variant="default" onClick={() => setEditing(false)}><X size={13} strokeWidth={2} /> Cerrar</ABtn>
              <FormMsg message={state} />
            </div>
          </form>
        )}
      </div>
    </ACard>
  );
}
