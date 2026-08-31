import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Home, CalendarDays, Watch, Palmtree, Bell } from "lucide-react";
import UserBox from "../components/UserBox";
import AppLogo from "../components/AppLogo";
import QuickAccessSearch from "../components/QuickAccessSearch";
import TabBar, { type Tab } from "../components/TabBar";
import DashboardHome from "../components/DashboardHome";
import ShiftsSection from "../components/ShiftsSection";
import AttendanceSection from "../components/AttendanceSection";
import NotificationsSection from "../components/NotificationsSection";
import LeaveSection from "../components/LeaveSection";
import { api } from "../api/client";
import type { Notification } from "../api/types";

const tabKeys = ["home", "roster", "attendance", "leave", "notifications"];

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [active, setActive] = useState(
    requestedTab && tabKeys.includes(requestedTab) ? requestedTab : "home",
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);

  function loadNotifications() {
    api.listNotifications().then(setNotifications).catch(() => {});
  }

  useEffect(loadNotifications, []);

  // Reacts to ?tab= changes made after the initial mount too (e.g. clicking a
  // notification that navigates to /?tab=roster while already on this page),
  // not just the tab picked on first load.
  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested && tabKeys.includes(requested)) {
      setActive(requested);
    }
  }, [searchParams]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const tabs: Tab[] = [
    { key: "home", label: "Home", icon: Home },
    { key: "roster", label: "Roster", icon: CalendarDays },
    { key: "attendance", label: "Attendance", icon: Watch },
    { key: "leave", label: "Leave", icon: Palmtree },
    { key: "notifications", label: "Alerts", icon: Bell, badge: unreadCount },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <AppLogo />
        <div className="app-header-actions">
          <QuickAccessSearch />
          <UserBox />
        </div>
      </header>

      <main className="app-content">
        {active === "home" && <DashboardHome />}
        {active === "roster" && <ShiftsSection />}
        {active === "attendance" && <AttendanceSection />}
        {active === "leave" && <LeaveSection />}
        {active === "notifications" && (
          <NotificationsSection notifications={notifications} onReload={loadNotifications} />
        )}
      </main>

      <TabBar tabs={tabs} active={active} onChange={setActive} fabKey="attendance" />
    </div>
  );
}
