import { getApiBaseUrl } from "./apiBase";

type ApiErrorLike = {
  message?: string;
  code?: string;
  details?: unknown;
  ok?: boolean;
};

export class ApiError extends Error {
  status: number;
  data?: ApiErrorLike;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }

  static from(params: { message: string; status: number; data?: ApiErrorLike }) {
    const err = new ApiError(params.message, params.status);
    err.data = params.data;
    return err;
  }
}

/**
 * Sanitiza el mensaje de error que se muestra al usuario.
 * NUNCA muestra textos crudos del proxy (como "Application not found").
 */
function sanitizeUserMessage(raw: string): string {
  if (!raw) return "No se pudo completar la solicitud. Reintenta.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("application not found") ||
    lower.includes("<!doctype") ||
    lower.includes("<html") ||
    lower.includes("bad gateway") ||
    lower.includes("service unavailable") ||
    lower.includes("internal server error") ||
    lower.includes("request failed")
  ) {
    return "No se pudo conectar con el servidor. Por favor, reintenta.";
  }
  return raw;
}

async function parseErrorData(res: Response): Promise<{ message: string; data?: ApiErrorLike }> {
  try {
    const text = await res.text();
    if (text) {
      try {
        const data = JSON.parse(text) as ApiErrorLike;
        if (data?.message && typeof data.message === "string") {
          return { message: sanitizeUserMessage(data.message), data };
        }
      } catch {
        // No es JSON – probablemente HTML del proxy de Railway
      }
    }
  } catch {
    // ignore
  }

  return { message: sanitizeUserMessage(res.statusText || "") };
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 800;

export async function apiRequest<T>(params: {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  token?: string;
  timeoutMs?: number;
}): Promise<T> {
  const url = `${getApiBaseUrl()}${params.path.startsWith("/") ? "" : "/"}${params.path}`;
  const timeoutMs = typeof params.timeoutMs === "number" && params.timeoutMs > 0 ? params.timeoutMs : 25000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: params.method,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(params.token ? { Authorization: `Bearer ${params.token}` } : null),
        },
        body: params.body ? JSON.stringify(params.body) : undefined,
      });

      clearTimeout(timer);

      // Reintentar automáticamente si el proxy de Railway devuelve 502/503
      if ((res.status === 502 || res.status === 503) && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }

      // Detectar respuesta HTML del proxy (no JSON) → reintentar
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && !contentType.includes("application/json")) {
        // El servidor respondió 200 pero con HTML → probablemente página proxy
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          continue;
        }
        throw new ApiError("No se pudo conectar con el servidor. Por favor, reintenta.", 0);
      }

      if (!res.ok) {
        const parsed = await parseErrorData(res);
        throw ApiError.from({ message: parsed.message, status: res.status, data: parsed.data });
      }

      return (await res.json()) as T;
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof ApiError) throw e;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }
      if (e && typeof e === "object" && (e as any).name === "AbortError") {
        throw new ApiError("Tiempo de espera agotado. Por favor, reintenta.", 408);
      }
      throw new ApiError("No se pudo conectar con el servidor. Por favor, reintenta.", 0);
    }
  }

  throw new ApiError("No se pudo conectar con el servidor. Por favor, reintenta.", 0);
}
