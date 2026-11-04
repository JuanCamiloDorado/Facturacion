import type { ApiErrorBody } from "../shared/api-types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.error);
  }

  // Primer mensaje por campo, para mostrarlo debajo de cada input.
  fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const issue of this.body.issues ?? []) errors[issue.path] ??= issue.message;
    return errors;
  }
}

export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? (hasBody ? "POST" : "GET"),
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, { error: "No hay conexión con el servidor. Revisa el internet" });
  }
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    throw new ApiError(res.status, (data as ApiErrorBody | null) ?? { error: `Error ${res.status}` });
  }
  return data as T;
}

export function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
