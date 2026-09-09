import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, CalendarDays, Palmtree, Clock, BarChart3, Bell } from "lucide-react";
import UserBox from "../components/UserBox";
import QuickAccessSearch from "../components/QuickAccessSearch";
import LanguageSwitcher from "../components/LanguageSwitcher";
import TabBar, { type Tab } from "../components/TabBar";
import Sidebar from "../components/Sidebar";
import ManagerSection from "../components/ManagerSection";
import AddEmployeeSection from "../components/AddEmployeeSection";
import PasswordResetsSection from "../components/PasswordResetsSection";
import RosterSection from "../components/RosterSection";
import LeaveApprovalsSection from "../components/LeaveApprovalsSection";
import AttendanceTrackingSection from "../components/AttendanceTrackingSection";
import EmployeeSummarySection from "../components/EmployeeSummarySection";
import BackupOverviewSection from "../components/BackupOverviewSection";
import NotificationsSection from "../components/NotificationsSection";
import { api } from "../api/client";
import type { Notification } from "../api/types";
import { updateAppBadge } from "../lib/appBadge";

const tabKeys = ["team", "roster", "invite", "leave", "attendance", "summary", "alerts"];

export default function AdminPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [active, setActive] = useState(
    requestedTab && tabKeys.includes(requestedTab) ? requestedTab : "team",
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);

  function loadNotifications() {
    api
      .listNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  }

  useEffect(loadNotifications, []);

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested && tabKeys.includes(requested)) {
      setActive(requested);
    }
  }, [searchParams]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  // Leave requests notify the manager with this exact url (see leave/service.ts),
  // so it doubles as a reliable filter for "new leave request" badges/dots.
  const unreadLeaveNotifications = notifications.filter(
    (n) => !n.read && n.url === "/admin?tab=leave",
  );

  useEffect(() => {
    updateAppBadge(unreadCount);
  }, [unreadCount]);

  // Looking at the Leave tab counts as having seen those requests -- clear
  // their badge the same way opening a notification would.
  useEffect(() => {
    if (active !== "leave") return;
    const unread = notifications.filter((n) => !n.read && n.url === "/admin?tab=leave");
    if (unread.length === 0) return;
    Promise.all(unread.map((n) => api.markNotificationRead(n.id))).then(loadNotifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, notifications]);

  const tabs: Tab[] = [
    { key: "team", label: t("nav.team"), icon: Users },
    { key: "roster", label: t("nav.roster"), icon: CalendarDays },
    { key: "invite", label: t("nav.invite"), icon: UserPlus },
    { key: "leave", label: t("nav.leave"), icon: Palmtree, badge: unreadLeaveNotifications.length },
    { key: "attendance", label: t("nav.attendance"), icon: Clock },
    { key: "summary", label: t("nav.summary"), icon: BarChart3 },
    { key: "alerts", label: t("nav.alerts"), icon: Bell, badge: unreadCount },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{t("nav.administration")}</h1>
        <div className="app-header-actions">
          <QuickAccessSearch />
          <LanguageSwitcher />
          <UserBox />
        </div>
      </header>

      <div className="app-body">
        <Sidebar tabs={tabs} active={active} onChange={setActive} />

        <main className={active === "roster" ? "app-content wide" : "app-content"}>
          {active === "team" && <ManagerSection />}
          {active === "roster" && <RosterSection />}
          {active === "invite" && (
            <>
              <AddEmployeeSection />
              <PasswordResetsSection />
            </>
          )}
          {active === "leave" && <LeaveApprovalsSection />}
          {active === "attendance" && <AttendanceTrackingSection />}
          {active === "summary" && (
            <>
              <EmployeeSummarySection />
              <BackupOverviewSection />
            </>
          )}
          {active === "alerts" && (
            <NotificationsSection
              notifications={notifications}
              loading={notifLoading}
              onReload={loadNotifications}
            />
          )}
        </main>
      </div>

      <TabBar tabs={tabs} active={active} onChange={setActive} />
    </div>
  );
}
