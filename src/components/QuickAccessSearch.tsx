import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
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

const ITEMS: QuickAccessItem[] = [
  { label: "Home", description: "Greeting and today's shift", icon: Home, path: "/?tab=home" },
  {
    label: "My Roster",
    description: "Your monthly schedule",
    icon: CalendarDays,
    path: "/?tab=roster",
  },
  {
    label: "Attendance",
    description: "Clock in/out and history",
    icon: Watch,
    path: "/?tab=attendance",
  },
  { label: "Leave Requests", description: "Request time off", icon: Palmtree, path: "/?tab=leave" },
  {
    label: "Notifications",
    description: "Alerts and updates",
    icon: Bell,
    path: "/?tab=notifications",
  },
  { label: "My Profile", description: "Photo, stats, contracts", icon: UserIcon, path: "/profile" },
  {
    label: "Administration",
    description: "Manager dashboard",
    icon: ShieldCheck,
    path: "/admin",
    managerOnly: true,
  },
  {
    label: "Manage Team",
    description: "Add/remove employees, contracts",
    icon: Users,
    path: "/admin?tab=team",
    managerOnly: true,
  },
  {
    label: "Team Roster",
    description: "Assign and view shifts",
    icon: CalendarDays,
    path: "/admin?tab=roster",
    managerOnly: true,
  },
  {
    label: "Invite Employee",
    description: "Send an invite link",
    icon: UserPlus,
    path: "/admin?tab=invite",
    managerOnly: true,
  },
  {
    label: "Leave Approvals",
    description: "Approve or reject requests",
    icon: Palmtree,
    path: "/admin?tab=leave",
    managerOnly: true,
  },
  {
    label: "Attendance Tracking",
    description: "Clock records per employee",
    icon: Clock,
    path: "/admin?tab=attendance",
    managerOnly: true,
  },
  {
    label: "Employee Summary",
    description: "Hours worked and CSV export",
    icon: BarChart3,
    path: "/admin?tab=summary",
    managerOnly: true,
  },
];

export default function QuickAccessSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(
    () => ITEMS.filter((i) => !i.managerOnly || user?.role === "manager"),
    [user],
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
        title="Quick access"
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
                placeholder="Search everything..."
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
              {results.length === 0 && <li className="quick-access-empty">No matches.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
