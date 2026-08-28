import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, ShieldCheck, LayoutDashboard } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function UserBox() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
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

  if (!user) return null;

  const initial = user.name.charAt(0).toUpperCase();
  const onAdmin = location.pathname === "/admin";

  return (
    <div className="user-box" ref={ref}>
      <button className="user-box-trigger" onClick={() => setOpen(!open)}>
        <span className="user-avatar">{initial}</span>
        <span className="user-box-info">
          <span className="user-name">{user.name}</span>
          <span className="role-badge">{user.role}</span>
        </span>
      </button>
      {open && (
        <div className="user-box-menu">
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
          <button onClick={logout}>
            <LogOut size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
