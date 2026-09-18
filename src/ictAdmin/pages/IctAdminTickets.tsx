import { type FormEvent, useEffect, useState } from "react";
import { ictAdminApi, type IctAdminTicket } from "../client";

const STATUSES = ["open", "in_progress", "resolved", "closed"];

export default function IctAdminTickets() {
  const [tickets, setTickets] = useState<IctAdminTicket[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    ictAdminApi
      .listTickets()
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await ictAdminApi.createTicket(title, description, priority);
      setTitle("");
      setDescription("");
      setPriority("normal");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: number, status: string) {
    await ictAdminApi.updateTicketStatus(id, status);
    load();
  }

  return (
    <div>
      <h1 className="ict-page-title">Ticketing System</h1>
      <p className="ict-page-sub">Internal ops tickets. Not visible to any customer or company.</p>

      {error && <div className="ict-error">{error}</div>}

      <form className="ict-ticket-form" onSubmit={handleCreate}>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <div className="ict-ticket-form-row">
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create ticket"}
          </button>
        </div>
      </form>

      <ul className="ict-ticket-list">
        {tickets.map((t) => (
          <li key={t.id} className="ict-ticket-row">
            <div className="ict-ticket-info">
              <span className={`ict-ticket-priority ${t.priority}`}>{t.priority}</span>
              <strong>{t.title}</strong>
              <p>{t.description}</p>
            </div>
            <select value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </li>
        ))}
        {tickets.length === 0 && <p className="ict-page-sub">No tickets yet.</p>}
      </ul>
    </div>
  );
}
