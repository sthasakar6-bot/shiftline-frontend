import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, CalendarDays, Palmtree, Clock, BarChart3, Bell } from "lucide-react";
import UserBox from "../components/UserBox";
import QuickAccessSearch from "../components/QuickAccessSearch";
import LanguageSwitcher from "../components/LanguageSwitcher";
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

const tabKeys = ["team", "roster", "invite", "leave", "attendance", "summary", "alerts"];

export default function AdminPage() {
  const { t } = useTranslation();
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

  const tabs: Tab[] = [
    { key: "team", label: t("nav.team"), icon: Users },
    { key: "roster", label: t("nav.roster"), icon: CalendarDays },
    { key: "invite", label: t("nav.invite"), icon: UserPlus },
    { key: "leave", label: t("nav.leave"), icon: Palmtree },
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
