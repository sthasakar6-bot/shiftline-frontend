import { API_URL } from "../api/client";

const TOKEN_KEY = "ict-admin-token";

export function getIctAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setIctAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearIctAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class IctAdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getIctAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) clearIctAdminToken();
    throw new IctAdminApiError(res.status, body.message || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface IctAdminMonitoring {
  timestamp: string;
  uptimeSeconds: number;
  nodeVersion: string;
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
  database: { ok: boolean; latencyMs: number | null };
}

export interface IctAdminTicket {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export const ictAdminApi = {
  login: (email: string, password: string) =>
    request<{ token: string }>("/api/ict-admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  monitoring: () => request<IctAdminMonitoring>("/api/ict-admin/monitoring"),
  listTickets: () => request<IctAdminTicket[]>("/api/ict-admin/tickets"),
  createTicket: (title: string, description: string, priority: string) =>
    request<IctAdminTicket>("/api/ict-admin/tickets", {
      method: "POST",
      body: JSON.stringify({ title, description, priority }),
    }),
  updateTicketStatus: (id: number, status: string) =>
    request<IctAdminTicket>(`/api/ict-admin/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
