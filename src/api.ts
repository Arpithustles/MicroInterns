const API_BASE =
  (import.meta.env?.VITE_API_URL as string | undefined) ||
  "http://127.0.0.1:8000";

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  date_of_birth?: string | null;
  skills?: string[];
  created_at?: string;
};

export function getToken(): string | null {
  try { return localStorage.getItem("microintern.token"); } catch { return null; }
}

export function setSession(token: string, user: ApiUser): void {
  localStorage.setItem("microintern.token", token);
  localStorage.setItem("microintern.user", JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem("microintern.token");
  localStorage.removeItem("microintern.user");
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.auth) {
    const token = getToken();
    if (!token) throw new Error("Please log in to continue.");
    headers.set("Authorization", `Bearer ${token}`);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the backend. Make sure FastAPI is running at " + API_BASE);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = (body as { detail?: unknown }).detail;
    throw new Error(typeof detail === "string" ? detail : `Request failed (${response.status}).`);
  }
  return body as T;
}
