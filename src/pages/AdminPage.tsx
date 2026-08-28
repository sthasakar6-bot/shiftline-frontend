import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ManagerSection from "../components/ManagerSection";
import LeaveApprovalsSection from "../components/LeaveApprovalsSection";

export default function AdminPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Administration</h1>
          <p>
            {user?.name} · <span className="role-badge">{user?.role}</span>
          </p>
        </div>
        <span className="actions">
          <Link to="/">
            <button>Back to Dashboard</button>
          </Link>
          <button onClick={logout}>Log out</button>
        </span>
      </header>

      <div className="dashboard-grid">
        <ManagerSection />
        <LeaveApprovalsSection />
      </div>
    </div>
  );
}
