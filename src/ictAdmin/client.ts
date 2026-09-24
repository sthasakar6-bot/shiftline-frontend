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

export interface IctAdminCompany {
  id: number;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  userCount: number;
}

export const COMPANY_PROFILE_FIELDS = [
  "kvkNumber",
  "vatNumber",
  "legalAddress",
  "businessType",
  "countryOfRegistration",
  "contactPersonName",
  "contactPersonRole",
  "billingEmail",
  "billingAddress",
  "customPricingNotes",
  "industry",
  "payrollCycle",
  "schedulingFormat",
  "shiftRulesNotes",
  "supportEmail",
  "phoneNumber",
  "preferredLanguage",
  "emergencyContact",
  "preferredCommunicationChannel",
  "companyEmail",
  "companyPhone",
  "addressStreet",
  "addressNumber",
  "addressPostcode",
  "addressCity",
] as const;

export type CompanyProfileField = (typeof COMPANY_PROFILE_FIELDS)[number];

export type CompanyProfileFields = Partial<Record<CompanyProfileField, string | null>> & {
  estimatedEmployeeCount?: number | null;
};

export interface IctAdminCompanyFull extends CompanyProfileFields {
  id: number;
  name: string;
  slug: string;
  plan: string;
  trialEndsAt: string | null;
  billingProvider: string | null;
  billingCustomerId: string | null;
  billingSubscriptionId: string | null;
  billingInterval: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
}

export interface IctAdminBillingPayment {
  id: string;
  amount: { currency: string; value: string };
  status: string;
  method: string | null;
  description: string;
  createdAt: string;
  paidAt: string | null;
}

export interface IctAdminCompanyProfile {
  company: IctAdminCompanyFull;
  stats: {
    employeeCount: number;
    activeEmployeeCount: number;
    rolesBreakdown: { role: string; count: number }[];
    workLocations: string[];
  };
  billing: {
    payments: IctAdminBillingPayment[];
    nextPaymentDate: string | null;
    subscriptionStatus: string | null;
  } | null;
}

async function requestForm<T>(path: string, formData: FormData, method: string): Promise<T> {
  const token = getIctAdminToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) clearIctAdminToken();
    throw new IctAdminApiError(res.status, body.message || "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
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
  listCompanies: () => request<IctAdminCompany[]>("/api/ict-admin/companies"),
  createCompany: (data: {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    logo: File;
  }) => {
    const form = new FormData();
    form.append("companyName", data.companyName);
    form.append("firstName", data.firstName);
    form.append("lastName", data.lastName);
    form.append("email", data.email);
    form.append("password", data.password);
    form.append("logo", data.logo);
    return requestForm("/api/ict-admin/companies", form, "POST");
  },
  deleteCompany: (id: number) => request<void>(`/api/ict-admin/companies/${id}`, { method: "DELETE" }),
  getCompanyProfile: (id: number) =>
    request<IctAdminCompanyProfile>(`/api/ict-admin/companies/${id}`),
  updateCompanyProfile: (id: number, fields: CompanyProfileFields) =>
    request<IctAdminCompanyProfile>(`/api/ict-admin/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    }),
};
