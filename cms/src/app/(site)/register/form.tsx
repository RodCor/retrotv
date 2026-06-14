"use client";

import { useActionState } from "react";
import { registerAction } from "./actions";
import { Button, Input, Label, FormMessage } from "@/components/ui";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage message={state} />

      <div className="flex flex-col gap-1">
        <Label htmlFor="username">Nombre de usuario</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="usuario_99"
          minLength={3}
          maxLength={20}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@ejemplo.com"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={4}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="confirm">Confirmar contraseña</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={4}
          required
        />
      </div>

      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
