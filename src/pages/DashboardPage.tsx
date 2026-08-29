import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, CalendarDays, Clock, Palmtree, Bell } from "lucide-react";
import UserBox from "../components/UserBox";
import TabBar, { type Tab } from "../components/TabBar";
import ContractsSection from "../components/ContractsSection";
import ShiftsSection from "../components/ShiftsSection";
import AttendanceSection from "../components/AttendanceSection";
import NotificationsSection from "../components/NotificationsSection";
import LeaveSection from "../components/LeaveSection";

const tabs: Tab[] = [
  { key: "contracts", label: "Contracts", icon: FileText },
  { key: "roster", label: "Roster", icon: CalendarDays },
  { key: "attendance", label: "Attendance", icon: Clock },
  { key: "leave", label: "Leave", icon: Palmtree },
  { key: "notifications", label: "Alerts", icon: Bell },
];
const tabKeys = tabs.map((t) => t.key);

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [active, setActive] = useState(
    requestedTab && tabKeys.includes(requestedTab) ? requestedTab : "contracts",
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Shiftline</h1>
        <UserBox />
      </header>

      <main className="app-content">
        {active === "contracts" && <ContractsSection />}
        {active === "roster" && <ShiftsSection />}
        {active === "attendance" && <AttendanceSection />}
        {active === "leave" && <LeaveSection />}
        {active === "notifications" && <NotificationsSection />}
      </main>

      <TabBar tabs={tabs} active={active} onChange={setActive} />
    </div>
  );
}
