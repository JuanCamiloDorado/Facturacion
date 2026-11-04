import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import type { MeResponse } from "../shared/api-types";
import type { Role } from "../shared/constants";
import { ApiError, apiFetch } from "./api";

export const ME_KEY = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await apiFetch<MeResponse>("/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// La sesión se lee del contexto que pone RequireAuth y no directo de la query:
// así toda la pantalla ve el mismo usuario mientras se dibuja, incluso al cerrar sesión.
const SessionContext = createContext<MeResponse | null>(null);

export function useCurrentUser() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useCurrentUser solo se usa dentro de RequireAuth");
  return session;
}

export function useHasRole(...roles: Role[]) {
  const session = useContext(SessionContext);
  return !!session && roles.includes(session.user.role);
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/auth/logout", { method: "POST" }),
    onSettled: () => {
      queryClient.setQueryData(ME_KEY, null);
      // Borra los datos del negocio que quedaron en memoria, menos la sesión (ya vacía).
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] });
    },
  });
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isPending, error } = useMe();
  const location = useLocation();
  if (isPending) return <p className="p-8 text-slate-500">Cargando…</p>;
  if (error) return <p className="p-8 text-red-700">{error.message}</p>;
  if (!data) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <SessionContext.Provider value={data}>
      <SedeProvider sedes={data.sedes}>{children}</SedeProvider>
    </SessionContext.Provider>
  );
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  return useHasRole(...roles) ? children : <Navigate to="/" replace />;
}

// Sede con la que trabaja este equipo. Se recuerda en el navegador.
const SEDE_KEY = "pos.sede";

interface SedeContextValue {
  sedeId: string | null;
  setSedeId: (id: string) => void;
}

const SedeContext = createContext<SedeContextValue>({ sedeId: null, setSedeId: () => {} });

function readStoredSede(): string | null {
  try {
    return localStorage.getItem(SEDE_KEY);
  } catch {
    return null;
  }
}

function SedeProvider({ sedes, children }: { sedes: MeResponse["sedes"]; children: ReactNode }) {
  const [sedeId, setSedeIdState] = useState<string | null>(readStoredSede);
  const valid = sedes.some((s) => s.id === sedeId) ? sedeId : (sedes[0]?.id ?? null);

  useEffect(() => {
    if (valid !== sedeId) setSedeIdState(valid);
  }, [valid, sedeId]);

  const setSedeId = (id: string) => {
    setSedeIdState(id);
    try {
      localStorage.setItem(SEDE_KEY, id);
    } catch {
      // Sin almacenamiento disponible: la sede se elige de nuevo al recargar.
    }
  };

  return <SedeContext.Provider value={{ sedeId: valid, setSedeId }}>{children}</SedeContext.Provider>;
}

export const useSede = () => useContext(SedeContext);
