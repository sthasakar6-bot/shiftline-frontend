import { useAuth } from "../auth/AuthContext";
import ContractsSection from "../components/ContractsSection";
import ShiftsSection from "../components/ShiftsSection";
import AttendanceSection from "../components/AttendanceSection";
import NotificationsSection from "../components/NotificationsSection";
import ManagerSection from "../components/ManagerSection";

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
        <button onClick={logout}>Log out</button>
      </header>

      <div className="dashboard-grid">
        <ContractsSection />
        <ShiftsSection />
        <AttendanceSection />
        <NotificationsSection />
        {user?.role === "manager" && <ManagerSection />}
      </div>
    </div>
  );
}
