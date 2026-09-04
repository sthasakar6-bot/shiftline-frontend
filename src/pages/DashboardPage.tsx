import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, CalendarDays, Watch, Palmtree, Bell } from "lucide-react";
import UserBox from "../components/UserBox";
import AppLogo from "../components/AppLogo";
import QuickAccessSearch from "../components/QuickAccessSearch";
import LanguageSwitcher from "../components/LanguageSwitcher";
import TabBar, { type Tab } from "../components/TabBar";
import DashboardHome from "../components/DashboardHome";
import ShiftsSection from "../components/ShiftsSection";
import AttendanceSection from "../components/AttendanceSection";
import NotificationsSection from "../components/NotificationsSection";
import LeaveSection from "../components/LeaveSection";
import { api } from "../api/client";
import type { Notification } from "../api/types";
import { updateAppBadge } from "../lib/appBadge";

const tabKeys = ["home", "roster", "attendance", "leave", "notifications"];

export default function DashboardPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [active, setActive] = useState(
    requestedTab && tabKeys.includes(requestedTab) ? requestedTab : "home",
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

  useEffect(() => {
    updateAppBadge(unreadCount);
  }, [unreadCount]);

  const tabs: Tab[] = [
    { key: "home", label: t("nav.home"), icon: Home },
    { key: "roster", label: t("nav.roster"), icon: CalendarDays },
    { key: "attendance", label: t("nav.attendance"), icon: Watch },
    { key: "leave", label: t("nav.leave"), icon: Palmtree },
    { key: "notifications", label: t("nav.alerts"), icon: Bell, badge: unreadCount },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <AppLogo />
        <div className="app-header-actions">
          <QuickAccessSearch />
          <LanguageSwitcher />
          <UserBox />
        </div>
      </header>

      <main className="app-content">
        {active === "home" && <DashboardHome />}
        {active === "roster" && <ShiftsSection />}
        {active === "attendance" && <AttendanceSection />}
        {active === "leave" && <LeaveSection />}
        {active === "notifications" && (
          <NotificationsSection
            notifications={notifications}
            loading={notifLoading}
            onReload={loadNotifications}
          />
        )}
      </main>

      <TabBar tabs={tabs} active={active} onChange={setActive} fabKey="attendance" />
    </div>
  );
}
