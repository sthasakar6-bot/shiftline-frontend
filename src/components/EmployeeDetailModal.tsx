import { useState } from "react";
import { Copy, Check, Mail, Phone, MapPin } from "lucide-react";
import Avatar from "./Avatar";
import type { UserSummary } from "../api/types";

export default function EmployeeDetailModal({
  employee,
  onClose,
}: {
  employee: UserSummary;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"email" | "phone" | "address" | null>(null);

  function handleCopy(field: "email" | "phone" | "address", value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field);
      setTimeout(() => setCopied((c) => (c === field ? null : c)), 1500);
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal employee-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="employee-detail-header">
          <Avatar userId={employee.id} name={employee.name} hasAvatar={employee.hasAvatar} size={64} />
          <h3>{employee.name}</h3>
          <span className={`presence-badge${employee.online ? " online" : ""}`}>
            <span className="presence-dot" />
            {employee.online ? "Online now" : "Offline"}
          </span>
        </div>

        <div className="employee-detail-rows">
          <div className="employee-detail-row">
            <Mail size={16} className="employee-detail-icon" />
            <span className="employee-detail-value">{employee.email}</span>
            <button
              type="button"
              className="employee-detail-copy"
              onClick={() => handleCopy("email", employee.email)}
              title="Copy email"
            >
              {copied === "email" ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div className="employee-detail-row">
            <Phone size={16} className="employee-detail-icon" />
            {employee.phone ? (
              <>
                <span className="employee-detail-value">{employee.phone}</span>
                <button
                  type="button"
                  className="employee-detail-copy"
                  onClick={() => handleCopy("phone", employee.phone as string)}
                  title="Copy phone number"
                >
                  {copied === "phone" ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </>
            ) : (
              <span className="employee-detail-value muted">No phone number on file</span>
            )}
          </div>
          <div className="employee-detail-row">
            <MapPin size={16} className="employee-detail-icon" />
            {employee.address ? (
              <>
                <span className="employee-detail-value">{employee.address}</span>
                <button
                  type="button"
                  className="employee-detail-copy"
                  onClick={() => handleCopy("address", employee.address as string)}
                  title="Copy address"
                >
                  {copied === "address" ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </>
            ) : (
              <span className="employee-detail-value muted">No address on file</span>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
