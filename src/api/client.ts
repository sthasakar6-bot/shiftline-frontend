import type {
  Attendance,
  BackupSnapshotMeta,
  BackupTokenInfo,
  BookkeeperEmployee,
  Company,
  Contract,
  LeaveRequest,
  LoginResponse,
  Notification,
  PasswordResetRequest,
  Payslip,
  RosterShift,
  Shift,
  TeamMember,
  User,
  UserSummary,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL as string;
const TOKEN_KEY = "shiftline_token";
const COMPANY_KEY = "shiftline_selected_company";

export { API_URL };

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Remembered across visits, like a language or region picker -- chosen once
// on the company-select screen and reused for every login/password-reset
// attempt until the user explicitly switches companies.
export interface SelectedCompany {
  id: number;
  name: string;
}

export function getSelectedCompany(): SelectedCompany | null {
  const raw = localStorage.getItem(COMPANY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SelectedCompany;
  } catch {
    return null;
  }
}

export function setSelectedCompany(company: SelectedCompany): void {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
}

export function clearSelectedCompany(): void {
  localStorage.removeItem(COMPANY_KEY);
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
  login: (email: string, password: string, companyId: number) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, companyId }),
    }),

  me: () => request<User>("/api/auth/me"),

  listCompanies: () => request<Company[]>("/api/companies"),

  listUsers: () => request<User[]>("/api/users"),
  createEmployee: (data: { firstName: string; lastName: string; email: string; password: string }) =>
    request<{ id: number; name: string; email: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createManager: (data: { firstName: string; lastName: string; email: string; password: string }) =>
    request<{ id: number; name: string; email: string }>("/api/users/managers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createBookkeeper: (data: { firstName: string; lastName: string; email: string; password: string }) =>
    request<{ id: number; name: string; email: string }>("/api/users/bookkeepers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listReports: () => request<UserSummary[]>("/api/users/reports"),
  listEmployees: () => request<UserSummary[]>("/api/users/employees"),
  promoteUser: (id: number) => request<UserSummary>(`/api/users/${id}/promote`, { method: "POST" }),
  assignManager: (id: number) =>
    request<UserSummary>(`/api/users/${id}/manager`, { method: "PATCH" }),
  removeFromTeam: (id: number) =>
    request<UserSummary>(`/api/users/${id}/manager`, { method: "DELETE" }),
  listFormerEmployees: () => request<UserSummary[]>("/api/users/former-employees"),
  deactivateEmployee: (id: number) =>
    request<UserSummary>(`/api/users/${id}/deactivate`, { method: "POST" }),
  reactivateEmployee: (id: number) =>
    request<UserSummary>(`/api/users/${id}/reactivate`, { method: "POST" }),
  setEmployeeLocation: (id: number, location: string | null) =>
    request<UserSummary>(`/api/users/${id}/location`, {
      method: "PATCH",
      body: JSON.stringify({ location }),
    }),
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

  listBookkeeperEmployees: () => request<BookkeeperEmployee[]>("/api/bookkeeper/employees"),
  createBookkeeperContract: (employeeId: number, data: { role: string }) =>
    request<Contract>(`/api/bookkeeper/employees/${employeeId}/contracts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  uploadBookkeeperContractPdf: (employeeId: number, contractId: number, file: File) => {
    const formData = new FormData();
    formData.append("pdf", file);
    return request<Contract>(`/api/bookkeeper/employees/${employeeId}/contracts/${contractId}/pdf`, {
      method: "POST",
      body: formData,
    });
  },
  getBookkeeperContractPdf: (employeeId: number, contractId: number) =>
    requestBlob(`/api/bookkeeper/employees/${employeeId}/contracts/${contractId}/pdf`),
  createBookkeeperPayslip: (employeeId: number, data: { period: string }) =>
    request<Payslip>(`/api/bookkeeper/employees/${employeeId}/payslips`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  uploadBookkeeperPayslipPdf: (employeeId: number, payslipId: number, file: File) => {
    const formData = new FormData();
    formData.append("pdf", file);
    return request<Payslip>(`/api/bookkeeper/employees/${employeeId}/payslips/${payslipId}/pdf`, {
      method: "POST",
      body: formData,
    });
  },
  getBookkeeperPayslipPdf: (employeeId: number, payslipId: number) =>
    requestBlob(`/api/bookkeeper/employees/${employeeId}/payslips/${payslipId}/pdf`),

  listShifts: () => request<Shift[]>("/api/shifts"),
  listCompanyRoster: () => request<RosterShift[]>("/api/shifts/roster"),
  listTeam: () => request<TeamMember[]>("/api/users/team"),

  createShiftForReport: (
    userId: number,
    data: { startsAt: string; endsAt: string; breakMinutes?: number },
  ) =>
    request<Shift>(`/api/users/${userId}/shifts`, { method: "POST", body: JSON.stringify(data) }),
  listShiftsForReport: (userId: number) => request<Shift[]>(`/api/users/${userId}/shifts`),
  updateShiftForReport: (
    userId: number,
    shiftId: number,
    data: Partial<{ startsAt: string; endsAt: string; breakMinutes: number }>,
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
  createManualAttendance: (
    userId: number,
    data: { shiftId: number; clockIn: string; clockOut?: string },
  ) =>
    request<Attendance>(`/api/users/${userId}/attendance`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  editManualAttendance: (
    userId: number,
    attendanceId: number,
    data: { clockIn: string; clockOut?: string },
  ) =>
    request<Attendance>(`/api/users/${userId}/attendance/${attendanceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getBackupToken: () => request<BackupTokenInfo | null>("/api/backup-token"),
  createBackupToken: () => request<BackupTokenInfo>("/api/backup-token", { method: "POST" }),
  deleteBackupToken: () => request<void>("/api/backup-token", { method: "DELETE" }),

  listBackupHistory: () => request<BackupSnapshotMeta[]>("/api/backup-history"),
  getBackupHistoryCsv: (id: number) => requestBlob(`/api/backup-history/${id}`),

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

  subscribeToPush: (subscription: PushSubscriptionJSON) =>
    request<void>("/api/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }),
  unsubscribeFromPush: (endpoint: string) =>
    request<void>("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),

  requestPasswordReset: (email: string, companyId: number) =>
    request<{ ok: true }>("/api/password-reset-requests", {
      method: "POST",
      body: JSON.stringify({ email, companyId }),
    }),
  listPasswordResetRequests: () => request<PasswordResetRequest[]>("/api/password-reset-requests"),
  getPasswordResetToken: (token: string) =>
    request<{ email: string }>(`/api/password-reset-requests/${token}`),
  completePasswordReset: (token: string, password: string) =>
    request<void>(`/api/password-reset-requests/${token}/complete`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  resolvePasswordResetRequest: (id: number, password: string) =>
    request<void>(`/api/password-reset-requests/${id}/resolve`, {
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
  completeOnboarding: (data: { password: string; phone?: string; address?: string }) =>
    request<void>("/api/auth/complete-onboarding", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
