import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ContractsSection from "../components/ContractsSection";
import ShiftsSection from "../components/ShiftsSection";
import AttendanceSection from "../components/AttendanceSection";
import NotificationsSection from "../components/NotificationsSection";
import LeaveSection from "../components/LeaveSection";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Shiftline</h1>
          <p>
            {user?.name} · {user?.email} · <span className="role-badge">{user?.role}</span>
          </p>
        </div>
        <span className="actions">
          {user?.role === "manager" && (
            <Link to="/admin">
              <button>Switch to Administration</button>
            </Link>
          )}
          <button onClick={logout}>Log out</button>
        </span>
      </header>

      <div className="dashboard-grid">
        <ContractsSection />
        <ShiftsSection />
        <AttendanceSection />
        <LeaveSection />
        <NotificationsSection />
      </div>
    </div>
  );
}
