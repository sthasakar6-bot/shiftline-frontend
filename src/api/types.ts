export interface User {
  id: number;
  name: string;
  email: string;
  role: "employee" | "manager" | "bookkeeper";
  hasAvatar: boolean;
  phone: string | null;
  address: string | null;
  location: string | null;
  departmentId: number | null;
  needsOnboarding: boolean;
  companyId: number;
  companyName: string;
  companySlug: string;
  companyPlan: string;
  companyTrialEndsAt: string | null;
}

export interface ChatMessage {
  id: number;
  userId: number;
  userName: string;
  hasAvatar: boolean;
  body: string;
  createdAt: string;
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
  shiftTypeId: number | null;
  openShiftId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RosterShift extends Shift {
  userName: string;
  userLocation: string | null;
  userDepartmentId: number | null;
}

export interface TeamMember {
  id: number;
  name: string;
  role: "employee" | "manager" | "bookkeeper";
  hasAvatar: boolean;
  location: string | null;
  departmentId: number | null;
}

export interface Department {
  id: number;
  name: string;
  color: string;
  order: number;
}

export interface ShiftType {
  id: number;
  name: string;
  color: string;
  order: number;
}

export interface OpenShiftAssignment {
  shiftId: number;
  userId: number;
  userName: string;
}

export interface OpenShiftRequestSummary {
  id: number;
  userId: number;
  userName: string;
  status: "pending" | "approved" | "rejected";
}

export interface OpenShift {
  id: number;
  departmentId: number | null;
  shiftTypeId: number | null;
  startsAt: string;
  endsAt: string;
  breakMinutes: number | null;
  requiredCount: number;
  notes: string | null;
  filledShifts: OpenShiftAssignment[];
  filledCount: number;
  remaining: number;
  requests: OpenShiftRequestSummary[];
  myRequestId: number | null;
  myRequestStatus: "pending" | "approved" | "rejected" | null;
}

export interface RosterEvent {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string | null;
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
