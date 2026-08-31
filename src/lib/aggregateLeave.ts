import { api } from "../api/client";
import type { LeaveRequest } from "../api/types";

export interface LeaveEntry extends LeaveRequest {
  employeeName: string;
  employeeHasAvatar: boolean;
}

export async function fetchApprovedLeave(
  people: { id: number; name: string; hasAvatar?: boolean }[],
): Promise<LeaveEntry[]> {
  const all = await fetchAllLeave(people);
  return all.filter((r) => r.status === "approved");
}

export async function fetchAllLeave(
  people: { id: number; name: string; hasAvatar?: boolean }[],
): Promise<LeaveEntry[]> {
  const lists = await Promise.all(
    people.map((p) =>
      api
        .listLeaveRequestsForReport(p.id)
        .then((reqs) =>
          reqs.map((r) => ({
            ...r,
            employeeName: p.name,
            employeeHasAvatar: p.hasAvatar ?? false,
          })),
        )
        .catch(() => []),
    ),
  );
  return lists.flat();
}
