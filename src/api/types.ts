export interface User {
  id: number;
  name: string;
  email: string;
  role: "employee" | "manager";
}

export interface UserSummary extends User {
  managerId: number | null;
}

export interface Contract {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: number;
  userId: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: number;
  userId: number;
  shiftId: number;
  clockIn: string | null;
  clockOut: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Invite {
  id: number;
  email: string;
  token: string;
  status: "pending" | "accepted";
  managerId: number;
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
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}
