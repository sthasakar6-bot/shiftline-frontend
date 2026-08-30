import { api } from "../api/client";
import type { LeaveRequest } from "../api/types";

export interface LeaveEntry extends LeaveRequest {
  employeeName: string;
}

export async function fetchApprovedLeave(
  people: { id: number; name: string }[],
): Promise<LeaveEntry[]> {
  const lists = await Promise.all(
    people.map((p) =>
      api
        .listLeaveRequestsForReport(p.id)
        .then((reqs) =>
          reqs
            .filter((r) => r.status === "approved")
            .map((r) => ({ ...r, employeeName: p.name })),
        )
        .catch(() => []),
    ),
  );
  return lists.flat();
}
