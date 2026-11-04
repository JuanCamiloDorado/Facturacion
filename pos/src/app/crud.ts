import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ZodType } from "zod";
import { apiFetch, queryString } from "./api";

export type Resource = "categories" | "products" | "customers" | "sedes" | "users";

export interface ListParams {
  q?: string;
  active?: "true" | "false" | "all";
  [key: string]: string | number | undefined;
}

export function useList<T>(resource: Resource, params: ListParams = {}) {
  return useQuery({
    queryKey: ["list", resource, params],
    queryFn: () => apiFetch<T[]>(`/${resource}${queryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useSave<T>(resource: Resource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: unknown }) =>
      apiFetch<T>(id ? `/${resource}/${id}` : `/${resource}`, { method: id ? "PATCH" : "POST", body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["list", resource] }),
  });
}

// Estado de un formulario con errores por campo (de zod en el navegador o de la API).
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof T>(key: K, value: T[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors(({ [key as string]: _removed, ...rest }) => rest);
  }

  function parse<S extends ZodType>(schema: S, data: unknown = values) {
    const result = schema.safeParse(data);
    if (result.success) return result.data;
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) next[issue.path.join(".")] ??= issue.message;
    setErrors(next);
    return null;
  }

  return { values, set, errors, setErrors, parse };
}
