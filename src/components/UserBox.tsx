import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut, ShieldCheck, LayoutDashboard, Bell, BellOff, User as UserIcon } from "lucide-react";
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!isPushSupported()) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushEnabled(Boolean(sub)))
      .catch(() => {});
  }, []);

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

  return (
    <div className="user-box" ref={ref}>
      <button className="user-box-trigger" onClick={() => setOpen(!open)} title={t("userBox.account")}>
        <Avatar userId={user.id} name={user.name} hasAvatar={user.hasAvatar} size={36} />
      </button>
      {open && (
        <div className="user-box-menu">
          <button
            onClick={() => {
              navigate("/profile");
              setOpen(false);
            }}
          >
            <UserIcon size={16} />
            {t("userBox.myProfile")}
          </button>
          {user.role === "manager" && (
            <button
              onClick={() => {
                navigate(onAdmin ? "/" : "/admin");
                setOpen(false);
              }}
            >
              {onAdmin ? <LayoutDashboard size={16} /> : <ShieldCheck size={16} />}
              {onAdmin ? t("userBox.backToDashboard") : t("userBox.switchToAdmin")}
            </button>
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
      )}
    </div>
  );
}
