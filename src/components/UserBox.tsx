import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  Bell,
  BellOff,
  User as UserIcon,
  Menu,
  X,
  CreditCard,
  UserPlus,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import Avatar from "./Avatar";
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushSupported,
} from "../lib/push";

export default function UserBox() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushEnabled(Boolean(sub)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleTogglePush() {
    setPushError(null);
    try {
      if (pushEnabled) {
        await disablePushNotifications();
        setPushEnabled(false);
      } else {
        await enablePushNotifications();
        setPushEnabled(true);
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : t("userBox.notificationsUpdateFailed"));
    }
  }

  if (!user) return null;

  const onAdmin = location.pathname === "/admin";
  const isManager = user.role === "manager";

  function goTo(path: string) {
    navigate(path);
    setOpen(false);
  }

  return (
    <>
      <button className="user-box-trigger" onClick={() => setOpen(true)} title={t("userBox.menu")}>
        <Menu size={20} />
      </button>
      {open && (
        <div className="side-drawer-overlay" onClick={() => setOpen(false)}>
          <div className="side-drawer-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
            <div className="side-drawer-header">
              <Avatar userId={user.id} name={user.name} hasAvatar={user.hasAvatar} size={40} />
              <div className="side-drawer-header-text">
                <span className="side-drawer-name">{user.name}</span>
                <span className="side-drawer-role">{t(`userBox.role.${user.role}`)}</span>
              </div>
              <button className="side-drawer-close" onClick={() => setOpen(false)} aria-label={t("common.close")}>
                <X size={18} />
              </button>
            </div>

            <div className="side-drawer-body">
              {user.role !== "bookkeeper" && (
                <button onClick={() => goTo("/profile")}>
                  <UserIcon size={16} />
                  {t("userBox.myProfile")}
                </button>
              )}
              {isManager && (
                <button onClick={() => goTo(onAdmin ? "/" : "/admin")}>
                  {onAdmin ? <LayoutDashboard size={16} /> : <ShieldCheck size={16} />}
                  {onAdmin ? t("userBox.backToDashboard") : t("userBox.switchToAdmin")}
                </button>
              )}
              {isManager && (
                <>
                  <div className="side-drawer-divider" />
                  <button onClick={() => goTo("/admin?tab=billing")}>
                    <CreditCard size={16} />
                    {t("nav.billing")}
                  </button>
                  <button onClick={() => goTo("/admin?tab=invite")}>
                    <UserPlus size={16} />
                    {t("nav.invite")}
                  </button>
                  <button onClick={() => goTo("/admin?tab=summary")}>
                    <BarChart3 size={16} />
                    {t("nav.summary")}
                  </button>
                  <div className="side-drawer-divider" />
                </>
              )}
              {isPushSupported() && (
                <button onClick={handleTogglePush}>
                  {pushEnabled ? <BellOff size={16} /> : <Bell size={16} />}
                  {pushEnabled ? t("userBox.disableNotifications") : t("userBox.enableNotifications")}
                </button>
              )}
              {pushError && <div className="error" style={{ padding: "0 14px 8px" }}>{pushError}</div>}
              <button onClick={logout}>
                <LogOut size={16} />
                {t("userBox.logOut")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
