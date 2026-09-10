export interface User {
  id: number;
  name: string;
  email: string;
  role: "employee" | "manager" | "bookkeeper";
  hasAvatar: boolean;
  phone: string | null;
  address: string | null;
  needsOnboarding: boolean;
  companyId: number;
  companyName: string;
  companySlug: string;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
}

export interface UserSummary extends User {
  managerId: number | null;
  active: boolean;
  online: boolean;
}

export interface Contract {
  id: number;
  role: string;
  pdfFilename: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payslip {
  id: number;
  period: string;
  pdfFilename: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookkeeperEmployee {
  id: number;
  name: string;
  email: string;
  hoursThisMonth: number;
  contracts: Contract[];
  payslips: Payslip[];
}

export interface BackupTokenInfo {
  id: number;
  userId: number;
  token: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface BackupSnapshotMeta {
  id: number;
  userId: number;
  createdAt: string;
}

export interface Shift {
  id: number;
  userId: number;
  startsAt: string;
  endsAt: string;
  breakMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RosterShift extends Shift {
  userName: string;
}

export interface TeamMember {
  id: number;
  name: string;
  role: "employee" | "manager" | "bookkeeper";
  hasAvatar: boolean;
  online: boolean;
}

export interface Attendance {
  id: number;
  userId: number;
  shiftId: number;
  clockIn: string | null;
  clockOut: string | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
  manualEntry: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  url: string | null;
  read: boolean;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}


export interface PasswordResetRequest {
  id: number;
  userId: number;
  employeeName: string;
  token: string;
  status: "pending" | "completed";
  expiresAt: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: number;
  userId: number;
  type: "vacation" | "sick";
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  createdAt: string;
  updatedAt: string;
}
