import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, UserPlus, CalendarDays, Palmtree, Clock, BarChart3 } from "lucide-react";
import UserBox from "../components/UserBox";
import QuickAccessSearch from "../components/QuickAccessSearch";
import TabBar, { type Tab } from "../components/TabBar";
import ManagerSection from "../components/ManagerSection";
import InvitesSection from "../components/InvitesSection";
import PasswordResetsSection from "../components/PasswordResetsSection";
import RosterSection from "../components/RosterSection";
import LeaveApprovalsSection from "../components/LeaveApprovalsSection";
import AttendanceTrackingSection from "../components/AttendanceTrackingSection";
import EmployeeSummarySection from "../components/EmployeeSummarySection";

const tabs: Tab[] = [
  { key: "team", label: "Team", icon: Users },
  { key: "roster", label: "Roster", icon: CalendarDays },
  { key: "invite", label: "Invite", icon: UserPlus },
  { key: "leave", label: "Leave", icon: Palmtree },
  { key: "attendance", label: "Attendance", icon: Clock },
  { key: "summary", label: "Summary", icon: BarChart3 },
];

const tabKeys = tabs.map((t) => t.key);

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [active, setActive] = useState(
    requestedTab && tabKeys.includes(requestedTab) ? requestedTab : "team",
  );

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested && tabKeys.includes(requested)) {
      setActive(requested);
    }
  }, [searchParams]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Administration</h1>
        <div className="app-header-actions">
          <QuickAccessSearch />
          <UserBox />
        </div>
      </header>

      <main className="app-content">
        {active === "team" && <ManagerSection />}
        {active === "roster" && <RosterSection />}
        {active === "invite" && (
          <>
            <InvitesSection />
            <PasswordResetsSection />
          </>
        )}
        {active === "leave" && <LeaveApprovalsSection />}
        {active === "attendance" && <AttendanceTrackingSection />}
        {active === "summary" && <EmployeeSummarySection />}
      </main>

      <TabBar tabs={tabs} active={active} onChange={setActive} />
    </div>
  );
}
