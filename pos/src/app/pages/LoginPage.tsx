import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate } from "react-router";
import type { MeResponse } from "../../shared/api-types";
import { loginSchema } from "../../shared/schemas";
import { ApiError, apiFetch } from "../api";
import { ME_KEY, useMe } from "../auth";
import { useForm } from "../crud";
import { Alert, Button, TextField } from "../ui";

export function LoginPage() {
  const me = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const form = useForm({ email: "", password: "" });

  const login = useMutation({
    mutationFn: (data: unknown) => apiFetch<MeResponse>("/auth/login", { body: data }),
    onSuccess: (data) => {
      queryClient.setQueryData(ME_KEY, data);
      navigate(from, { replace: true });
    },
  });

  if (me.data) return <Navigate to={from} replace />;

  function submit() {
    const data = form.parse(loginSchema);
    if (data) login.mutate(data);
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs font-semibold tracking-wide text-emerald-700 uppercase">POS Restaurantes</p>
        <h1 className="mt-1 text-center text-2xl font-semibold">Inicia sesión</h1>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          {login.error && (
            <Alert>{login.error instanceof ApiError ? login.error.message : "No se pudo iniciar sesión"}</Alert>
          )}
          <TextField
            label="Correo"
            type="email"
            autoComplete="username"
            autoFocus
            value={form.values.email}
            onChange={(e) => form.set("email", e.target.value)}
            error={form.errors.email}
          />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={form.values.password}
            onChange={(e) => form.set("password", e.target.value)}
            error={form.errors.password}
          />
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
