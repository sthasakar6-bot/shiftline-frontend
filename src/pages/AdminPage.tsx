import { useState } from "react";
import { Users, UserPlus, Palmtree, Clock } from "lucide-react";
import UserBox from "../components/UserBox";
import TabBar, { type Tab } from "../components/TabBar";
import ManagerSection from "../components/ManagerSection";
import InvitesSection from "../components/InvitesSection";
import LeaveApprovalsSection from "../components/LeaveApprovalsSection";
import AttendanceTrackingSection from "../components/AttendanceTrackingSection";

const tabs: Tab[] = [
  { key: "team", label: "Team", icon: Users },
  { key: "invite", label: "Invite", icon: UserPlus },
  { key: "leave", label: "Leave", icon: Palmtree },
  { key: "attendance", label: "Attendance", icon: Clock },
];

export default function AdminPage() {
  const [active, setActive] = useState("team");

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Administration</h1>
        <UserBox />
      </header>

      <main className="app-content">
        {active === "team" && <ManagerSection />}
        {active === "invite" && <InvitesSection />}
        {active === "leave" && <LeaveApprovalsSection />}
        {active === "attendance" && <AttendanceTrackingSection />}
      </main>

      <TabBar tabs={tabs} active={active} onChange={setActive} />
    </div>
  );
}
