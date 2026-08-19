"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { createSupabaseBrowserClient } from "./supabase-browser";

/** Manually provisioned administrators sign in with email and password; no self-service signup or membership controls exist here. */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);
    if (signInError) {
      setError("Correo electrónico o contraseña inválidos.");
      return;
    }

    router.push("/business");
    router.refresh();
  }

  const inputClass =
    "rounded-xl border-[1.5px] border-transparent bg-surface px-4 py-2.5 text-base text-onSurface outline-none focus-visible:border-primary";

  return (
    <form onSubmit={handleSubmit} aria-label="Inicio de sesión de administrador" className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-onSurfaceMuted">
        Correo electrónico
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-onSurfaceMuted">
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-onPrimary outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:bg-buttonDisabledBackground disabled:text-onSurfaceMuted"
      >
        {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
