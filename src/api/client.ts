import type {
  Attendance,
  Contract,
  Invite,
  LeaveRequest,
  LoginResponse,
  Notification,
  PasswordResetRequest,
  Payslip,
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
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

async function requestBlob(path: string): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || `Request failed with status ${res.status}`);
  }

  return res.blob();
}

export const api = {
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    token: string;
    phone?: string;
    address?: string;
  }) =>
    request<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>("/api/auth/me"),

  listUsers: () => request<User[]>("/api/users"),
  listReports: () => request<UserSummary[]>("/api/users/reports"),
  listEmployees: () => request<UserSummary[]>("/api/users/employees"),
  promoteUser: (id: number) => request<UserSummary>(`/api/users/${id}/promote`, { method: "POST" }),
  assignManager: (id: number) =>
    request<UserSummary>(`/api/users/${id}/manager`, { method: "PATCH" }),
  removeFromTeam: (id: number) =>
    request<UserSummary>(`/api/users/${id}/manager`, { method: "DELETE" }),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return request<void>("/api/users/me/avatar", { method: "POST", body: formData });
  },
  getAvatarBlob: (id: number) => requestBlob(`/api/users/${id}/avatar`),

  listContracts: () => request<Contract[]>("/api/contracts"),
  getContractPdf: (contractId: number) => requestBlob(`/api/contracts/${contractId}/pdf`),

  listContractsForReport: (userId: number) => request<Contract[]>(`/api/users/${userId}/contracts`),
  createContractForReport: (userId: number, data: { role: string }) =>
    request<Contract>(`/api/users/${userId}/contracts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateContractForReport: (userId: number, contractId: number, data: { role: string }) =>
    request<Contract>(`/api/users/${userId}/contracts/${contractId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  uploadContractPdfForReport: (userId: number, contractId: number, file: File) => {
    const formData = new FormData();
    formData.append("pdf", file);
    return request<Contract>(`/api/users/${userId}/contracts/${contractId}/pdf`, {
      method: "POST",
      body: formData,
    });
  },
  getContractPdfForReport: (userId: number, contractId: number) =>
    requestBlob(`/api/users/${userId}/contracts/${contractId}/pdf`),
  deleteContractForReport: (userId: number, contractId: number) =>
    request<void>(`/api/users/${userId}/contracts/${contractId}`, { method: "DELETE" }),

  listPayslips: () => request<Payslip[]>("/api/payslips"),
  getPayslipPdf: (payslipId: number) => requestBlob(`/api/payslips/${payslipId}/pdf`),

  listPayslipsForReport: (userId: number) => request<Payslip[]>(`/api/users/${userId}/payslips`),
  createPayslipForReport: (userId: number, data: { period: string }) =>
    request<Payslip>(`/api/users/${userId}/payslips`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  uploadPayslipPdfForReport: (userId: number, payslipId: number, file: File) => {
    const formData = new FormData();
    formData.append("pdf", file);
    return request<Payslip>(`/api/users/${userId}/payslips/${payslipId}/pdf`, {
      method: "POST",
      body: formData,
    });
  },
  getPayslipPdfForReport: (userId: number, payslipId: number) =>
    requestBlob(`/api/users/${userId}/payslips/${payslipId}/pdf`),
  deletePayslipForReport: (userId: number, payslipId: number) =>
    request<void>(`/api/users/${userId}/payslips/${payslipId}`, { method: "DELETE" }),

  listShifts: () => request<Shift[]>("/api/shifts"),

  createShiftForReport: (
    userId: number,
    data: { startsAt: string; endsAt: string; breakMinutes?: number },
  ) =>
    request<Shift>(`/api/users/${userId}/shifts`, { method: "POST", body: JSON.stringify(data) }),
  listShiftsForReport: (userId: number) => request<Shift[]>(`/api/users/${userId}/shifts`),
  updateShiftForReport: (
    userId: number,
    shiftId: number,
    data: Partial<{ startsAt: string; endsAt: string }>,
  ) =>
    request<Shift>(`/api/users/${userId}/shifts/${shiftId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteShiftForReport: (userId: number, shiftId: number) =>
    request<void>(`/api/users/${userId}/shifts/${shiftId}`, { method: "DELETE" }),

  listAttendance: () => request<Attendance[]>("/api/attendance"),
  clockIn: (shiftId: number, coords?: { lat: number; lng: number }, clockedAt?: string) =>
    request<Attendance>("/api/attendance/clock-in", {
      method: "POST",
      body: JSON.stringify({ shiftId, ...coords, clockedAt }),
    }),
  clockOut: (id: number, coords?: { lat: number; lng: number }, clockedAt?: string) =>
    request<Attendance>(`/api/attendance/${id}/clock-out`, {
      method: "POST",
      body: JSON.stringify({ ...coords, clockedAt }),
    }),
  listAttendanceForReport: (userId: number) =>
    request<Attendance[]>(`/api/users/${userId}/attendance`),

  listNotifications: () => request<Notification[]>("/api/notifications"),
  markNotificationRead: (id: number) =>
    request<Notification>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    request<void>("/api/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id: number) =>
    request<void>(`/api/notifications/${id}`, { method: "DELETE" }),

  listLeaveRequests: () => request<LeaveRequest[]>("/api/leave-requests"),
  createLeaveRequest: (data: {
    type: "vacation" | "sick";
    startDate: string;
    endDate: string;
    reason?: string;
  }) => request<LeaveRequest>("/api/leave-requests", { method: "POST", body: JSON.stringify(data) }),
  cancelLeaveRequest: (id: number) =>
    request<void>(`/api/leave-requests/${id}`, { method: "DELETE" }),

  listLeaveRequestsForReport: (userId: number) =>
    request<LeaveRequest[]>(`/api/users/${userId}/leave-requests`),
  decideLeaveRequest: (userId: number, requestId: number, status: "approved" | "rejected") =>
    request<LeaveRequest>(`/api/users/${userId}/leave-requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  revokeApprovedLeave: (userId: number, requestId: number) =>
    request<LeaveRequest>(`/api/users/${userId}/leave-requests/${requestId}`, {
      method: "DELETE",
    }),

  createInvite: (email: string) =>
    request<Invite>("/api/invites", { method: "POST", body: JSON.stringify({ email }) }),
  listInvites: () => request<Invite[]>("/api/invites"),
  getInviteByToken: (token: string) => request<{ email: string }>(`/api/invites/${token}`),

  subscribeToPush: (subscription: PushSubscriptionJSON) =>
    request<void>("/api/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }),
  unsubscribeFromPush: (endpoint: string) =>
    request<void>("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),

  requestPasswordReset: (email: string) =>
    request<{ ok: true }>("/api/password-reset-requests", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  listPasswordResetRequests: () => request<PasswordResetRequest[]>("/api/password-reset-requests"),
  getPasswordResetToken: (token: string) =>
    request<{ email: string }>(`/api/password-reset-requests/${token}`),
  completePasswordReset: (token: string, password: string) =>
    request<void>(`/api/password-reset-requests/${token}/complete`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  updatePhone: (phone: string) =>
    request<void>("/api/auth/phone", { method: "PATCH", body: JSON.stringify({ phone }) }),
};
