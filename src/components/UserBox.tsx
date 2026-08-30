import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, ShieldCheck, LayoutDashboard, Bell, BellOff, User as UserIcon } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import Avatar from "./Avatar";
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushSupported,
} from "../lib/push";

export default function UserBox() {
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
      setPushError(err instanceof Error ? err.message : "Failed to update notifications");
    }
  }

  if (!user) return null;

  const onAdmin = location.pathname === "/admin";

  return (
    <div className="user-box" ref={ref}>
      <button className="user-box-trigger" onClick={() => setOpen(!open)}>
        <Avatar userId={user.id} name={user.name} hasAvatar={user.hasAvatar} size={32} />
        <span className="user-box-info">
          <span className="user-name">{user.name}</span>
          <span className="role-badge">{user.role}</span>
        </span>
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
            My Profile
          </button>
          {user.role === "manager" && (
            <button
              onClick={() => {
                navigate(onAdmin ? "/" : "/admin");
                setOpen(false);
              }}
            >
              {onAdmin ? <LayoutDashboard size={16} /> : <ShieldCheck size={16} />}
              {onAdmin ? "Back to Dashboard" : "Switch to Administration"}
            </button>
          )}
          {isPushSupported() && (
            <button onClick={handleTogglePush}>
              {pushEnabled ? <BellOff size={16} /> : <Bell size={16} />}
              {pushEnabled ? "Disable notifications" : "Enable notifications"}
            </button>
          )}
          {pushError && <div className="error" style={{ padding: "0 14px 8px" }}>{pushError}</div>}
          <button onClick={logout}>
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
