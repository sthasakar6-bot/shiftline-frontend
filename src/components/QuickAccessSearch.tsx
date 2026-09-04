import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  X,
  Home,
  CalendarDays,
  Watch,
  Palmtree,
  Bell,
  User as UserIcon,
  Users,
  UserPlus,
  Clock,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

interface QuickAccessItem {
  label: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
  path: string;
  managerOnly?: boolean;
}

export default function QuickAccessSearch() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems: QuickAccessItem[] = [
    { label: t("qa.home"), description: t("qa.homeDesc"), icon: Home, path: "/?tab=home" },
    {
      label: t("qa.roster"),
      description: t("qa.rosterDesc"),
      icon: CalendarDays,
      path: "/?tab=roster",
    },
    {
      label: t("qa.attendance"),
      description: t("qa.attendanceDesc"),
      icon: Watch,
      path: "/?tab=attendance",
    },
    { label: t("qa.leave"), description: t("qa.leaveDesc"), icon: Palmtree, path: "/?tab=leave" },
    {
      label: t("qa.notifications"),
      description: t("qa.notificationsDesc"),
      icon: Bell,
      path: "/?tab=notifications",
    },
    {
      label: t("qa.profile"),
      description: t("qa.profileDesc"),
      icon: UserIcon,
      path: "/profile",
    },
    {
      label: t("qa.admin"),
      description: t("qa.adminDesc"),
      icon: ShieldCheck,
      path: "/admin",
      managerOnly: true,
    },
    {
      label: t("qa.team"),
      description: t("qa.teamDesc"),
      icon: Users,
      path: "/admin?tab=team",
      managerOnly: true,
    },
    {
      label: t("qa.teamRoster"),
      description: t("qa.teamRosterDesc"),
      icon: CalendarDays,
      path: "/admin?tab=roster",
      managerOnly: true,
    },
    {
      label: t("qa.invite"),
      description: t("qa.inviteDesc"),
      icon: UserPlus,
      path: "/admin?tab=invite",
      managerOnly: true,
    },
    {
      label: t("qa.leaveApprovals"),
      description: t("qa.leaveApprovalsDesc"),
      icon: Palmtree,
      path: "/admin?tab=leave",
      managerOnly: true,
    },
    {
      label: t("qa.attendanceTracking"),
      description: t("qa.attendanceTrackingDesc"),
      icon: Clock,
      path: "/admin?tab=attendance",
      managerOnly: true,
    },
    {
      label: t("qa.summary"),
      description: t("qa.summaryDesc"),
      icon: BarChart3,
      path: "/admin?tab=summary",
      managerOnly: true,
    },
    {
      label: t("qa.adminAlerts"),
      description: t("qa.adminAlertsDesc"),
      icon: Bell,
      path: "/admin?tab=alerts",
      managerOnly: true,
    },
  ];

  const items = useMemo(
    () => allItems.filter((i) => !i.managerOnly || user?.role === "manager"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, t],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <>
      <button
        type="button"
        className="quick-access-trigger"
        onClick={() => setOpen(true)}
        title={t("quickAccess.title")}
      >
        <Search size={18} />
      </button>
      {open && (
        <div className="quick-access-overlay" onClick={() => setOpen(false)}>
          <div className="quick-access-panel" onClick={(e) => e.stopPropagation()}>
            <div className="quick-access-input-row">
              <Search size={16} className="quick-access-input-icon" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("quickAccess.placeholder")}
              />
              <button
                type="button"
                className="quick-access-close"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <ul className="quick-access-results">
              {results.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <button type="button" onClick={() => go(item.path)}>
                      <span className="quick-access-icon">
                        <Icon size={17} />
                      </span>
                      <span className="quick-access-text">
                        <span className="quick-access-label">{item.label}</span>
                        <span className="quick-access-desc">{item.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && (
                <li className="quick-access-empty">{t("quickAccess.noResults")}</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
