"use client";

import { useActionState } from "react";
import {
  Field,
  Select,
  Textarea,
  ABtn,
  FormMsg,
  Coins,
  Gem,
  Diamond,
  Save,
  Crown,
  Pencil,
  KeyRound,
  Ban,
  Trash2,
} from "@/components/admin-ui";
import {
  updateUserCurrency,
  updateUserRank,
  updateUserProfile,
  resetUserPassword,
  banUser,
  deleteUser,
} from "../actions";

interface RankOption {
  level: number;
  rank_name: string;
}

/* ----------------------------- currency ---------------------------- */

export function CurrencyForm({
  userId,
  credits,
  duckets,
  diamonds,
  points,
}: {
  userId: number;
  credits: number;
  duckets: number;
  diamonds: number;
  points: number;
}) {
  const [state, action, pending] = useActionState(updateUserCurrency, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Créditos"
          name="credits"
          type="number"
          min={0}
          defaultValue={credits}
        />
        <Field
          label="Duckets"
          name="duckets"
          type="number"
          min={0}
          defaultValue={duckets}
        />
        <Field
          label="Diamantes"
          name="diamonds"
          type="number"
          min={0}
          defaultValue={diamonds}
        />
        <Field
          label="Puntos"
          name="points"
          type="number"
          min={0}
          defaultValue={points}
        />
      </div>
      <div className="flex items-center gap-3">
        <ABtn variant="primary" type="submit" disabled={pending}>
          <Save size={14} strokeWidth={2} />
          {pending ? "Guardando…" : "Guardar"}
        </ABtn>
        <span className="flex items-center gap-3 text-xs opacity-50">
          <Coins size={13} strokeWidth={2} />
          <Gem size={13} strokeWidth={2} />
          <Diamond size={13} strokeWidth={2} />
        </span>
      </div>
      <FormMsg message={state} />
    </form>
  );
}

/* ------------------------------ rank ------------------------------ */

export function RankForm({
  userId,
  rank,
  ranks,
}: {
  userId: number;
  rank: number;
  ranks: RankOption[];
}) {
  const [state, action, pending] = useActionState(updateUserRank, null);
  const options =
    ranks.length > 0
      ? ranks
      : [1, 2, 3, 4, 5, 6, 7].map((l) => ({ level: l, rank_name: `Rango ${l}` }));
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <Select label="Rango de permisos" name="rank" defaultValue={rank}>
        {options.map((o) => (
          <option key={o.level} value={o.level}>
            {o.level} — {o.rank_name}
          </option>
        ))}
      </Select>
      <ABtn variant="solid" type="submit" disabled={pending}>
        <Crown size={14} strokeWidth={2} />
        {pending ? "Guardando…" : "Actualizar rango"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}

/* ----------------------------- profile ---------------------------- */

export function ProfileForm({
  userId,
  motto,
  look,
  mail,
}: {
  userId: number;
  motto: string;
  look: string;
  mail: string | null;
}) {
  const [state, action, pending] = useActionState(updateUserProfile, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <Textarea label="Misión" name="motto" defaultValue={motto} rows={2} />
      <Field label="Figura (cadena de figura)" name="look" defaultValue={look} />
      <Field
        label="Correo"
        name="mail"
        type="email"
        defaultValue={mail ?? ""}
      />
      <ABtn variant="primary" type="submit" disabled={pending}>
        <Pencil size={14} strokeWidth={2} />
        {pending ? "Guardando…" : "Actualizar perfil"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}

/* -------------------------- reset password ------------------------ */

export function PasswordForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(resetUserPassword, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <Field
        label="Nueva contraseña"
        name="newPass"
        type="password"
        placeholder="Al menos 6 caracteres"
        autoComplete="new-password"
      />
      <ABtn variant="solid" type="submit" disabled={pending}>
        <KeyRound size={14} strokeWidth={2} />
        {pending ? "Guardando…" : "Restablecer contraseña"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}

/* ------------------------------- ban ------------------------------ */

export function BanForm({
  userId,
  staffId,
}: {
  userId: number;
  staffId: number;
}) {
  const [state, action, pending] = useActionState(banUser, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="staffId" value={staffId} />
      <Field label="Motivo" name="reason" placeholder="Motivo del baneo…" />
      <Field
        label="Duración (horas)"
        name="hours"
        type="number"
        min={1}
        defaultValue={24}
      />
      <ABtn variant="danger" type="submit" disabled={pending}>
        <Ban size={14} strokeWidth={2} />
        {pending ? "Baneando…" : "Banear usuario"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}

/* ------------------------------ delete ---------------------------- */

export function DeleteForm({ userId }: { userId: number }) {
  const [state, action, pending] = useActionState(deleteUser, null);
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        if (
          !window.confirm(
            "¿Eliminar permanentemente a este usuario? Esto no se puede deshacer.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs opacity-60">
        Esto elimina permanentemente la cuenta de la base de datos.
      </p>
      <ABtn variant="danger" type="submit" disabled={pending}>
        <Trash2 size={14} strokeWidth={2} />
        {pending ? "Eliminando…" : "Eliminar usuario"}
      </ABtn>
      <FormMsg message={state} />
    </form>
  );
}
