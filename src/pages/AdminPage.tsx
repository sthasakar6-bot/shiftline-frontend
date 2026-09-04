import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, UserPlus, CalendarDays, Palmtree, Clock, BarChart3, Bell } from "lucide-react";
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
import NotificationsSection from "../components/NotificationsSection";
import { api } from "../api/client";
import type { Notification } from "../api/types";
import { updateAppBadge } from "../lib/appBadge";

const baseTabs: Tab[] = [
  { key: "team", label: "Team", icon: Users },
  { key: "roster", label: "Roster", icon: CalendarDays },
  { key: "invite", label: "Invite", icon: UserPlus },
  { key: "leave", label: "Leave", icon: Palmtree },
  { key: "attendance", label: "Attendance", icon: Clock },
  { key: "summary", label: "Summary", icon: BarChart3 },
  { key: "alerts", label: "Alerts", icon: Bell },
];

const tabKeys = baseTabs.map((t) => t.key);

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [active, setActive] = useState(
    requestedTab && tabKeys.includes(requestedTab) ? requestedTab : "team",
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);

  function loadNotifications() {
    api.listNotifications().then(setNotifications).catch(() => {});
  }

  useEffect(loadNotifications, []);

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested && tabKeys.includes(requested)) {
      setActive(requested);
    }
  }, [searchParams]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    updateAppBadge(unreadCount);
  }, [unreadCount]);

  const tabs = baseTabs.map((t) => (t.key === "alerts" ? { ...t, badge: unreadCount } : t));

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
        {active === "alerts" && (
          <NotificationsSection notifications={notifications} onReload={loadNotifications} />
        )}
      </main>

      <TabBar tabs={tabs} active={active} onChange={setActive} />
    </div>
  );
}
