import type {
  Attendance,
  Contract,
  LoginResponse,
  Notification,
  Shift,
  User,
  UserSummary,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL as string;
const TOKEN_KEY = "shiftline_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, body.error || `Request failed with status ${res.status}`);
  }

  return body as T;
}

export const api = {
  register: (name: string, email: string, password: string, managerId?: number) =>
    request<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, managerId }),
    }),

  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>("/api/auth/me"),

  listUsers: () => request<User[]>("/api/users"),
  listReports: () => request<UserSummary[]>("/api/users/reports"),
  promoteUser: (id: number) => request<UserSummary>(`/api/users/${id}/promote`, { method: "POST" }),

  listContracts: () => request<Contract[]>("/api/contracts"),
  createContract: (data: {
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    status?: string;
  }) => request<Contract>("/api/contracts", { method: "POST", body: JSON.stringify(data) }),
  updateContract: (id: number, data: Partial<{ title: string; status: string }>) =>
    request<Contract>(`/api/contracts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteContract: (id: number) => request<void>(`/api/contracts/${id}`, { method: "DELETE" }),

  listShifts: () => request<Shift[]>("/api/shifts"),
  createShift: (data: { startsAt: string; endsAt: string }) =>
    request<Shift>("/api/shifts", { method: "POST", body: JSON.stringify(data) }),
  deleteShift: (id: number) => request<void>(`/api/shifts/${id}`, { method: "DELETE" }),

  createShiftForReport: (userId: number, data: { startsAt: string; endsAt: string }) =>
    request<Shift>(`/api/users/${userId}/shifts`, { method: "POST", body: JSON.stringify(data) }),
  listShiftsForReport: (userId: number) => request<Shift[]>(`/api/users/${userId}/shifts`),

  listAttendance: () => request<Attendance[]>("/api/attendance"),
  clockIn: (shiftId: number) =>
    request<Attendance>("/api/attendance/clock-in", {
      method: "POST",
      body: JSON.stringify({ shiftId }),
    }),
  clockOut: (id: number) =>
    request<Attendance>(`/api/attendance/${id}/clock-out`, { method: "POST" }),

  listNotifications: () => request<Notification[]>("/api/notifications"),
  markNotificationRead: (id: number) =>
    request<Notification>(`/api/notifications/${id}/read`, { method: "PATCH" }),
};
