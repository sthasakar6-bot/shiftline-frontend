import { CalendarClock } from "lucide-react";

export default function AuthBrand() {
  return (
    <div className="auth-brand">
      <span className="auth-brand-icon">
        <CalendarClock size={22} />
      </span>
      <span className="auth-brand-name">Shiftline</span>
    </div>
  );
}
