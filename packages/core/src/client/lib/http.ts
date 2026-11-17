import { STORAGE_KEYS } from "./storage";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem(STORAGE_KEYS.token);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  return parseResponse<T>(res);
}

export async function requestFormData<T>(path: string, body: FormData): Promise<T> {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  return parseResponse<T>(res, "Error en la solicitud");
}

export async function requestBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      (data as { error?: string })?.error || "Error en la solicitud"
    );
  }
  return res.blob();
}

async function parseResponse<T>(res: Response, fallbackMessage?: string): Promise<T> {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (data as { error?: string })?.error ||
      fallbackMessage ||
      "Error en la solicitud";
    throw new Error(message);
  }

  return data as T;
}