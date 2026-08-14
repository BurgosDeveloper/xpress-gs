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

async function parseErrorData(res: Response): Promise<{ message: string; data?: ApiErrorLike }> {
  try {
    const text = await res.text();
    if (text) {
      try {
        const data = JSON.parse(text) as ApiErrorLike;
        if (data?.message && typeof data.message === "string") return { message: data.message, data };
      } catch {
        if (text.includes("Application not found") || res.status === 404 || res.status === 502) {
          return { message: "No se pudo establecer conexión con el servidor. Por favor, reintenta." };
        }
      }
    }
  } catch {
    // ignore
  }

  const rawMsg = res.statusText || "";
  if (rawMsg.includes("Application not found") || res.status === 404 || res.status === 502) {
    return { message: "No se pudo establecer conexión con el servidor. Por favor, reintenta." };
  }

  return { message: rawMsg || "No se pudo completar la solicitud. Reintenta." };
}

export async function apiRequest<T>(params: {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  token?: string;
  timeoutMs?: number;
}): Promise<T> {
  const url = `${getApiBaseUrl()}${params.path.startsWith("/") ? "" : "/"}${params.path}`;
  const timeoutMs = typeof params.timeoutMs === "number" && params.timeoutMs > 0 ? params.timeoutMs : 20000;

  let attempt = 0;
  while (attempt < 2) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

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

      clearTimeout(timeout);

      if (!res.ok) {
        if ((res.status === 502 || res.status === 503) && attempt < 2) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        const parsed = await parseErrorData(res);
        throw ApiError.from({ message: parsed.message, status: res.status, data: parsed.data });
      }

      return (await res.json()) as T;
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof ApiError) throw e;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 600));
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
