import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Contract } from "../api/types";

export default function ContractsSection() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.listContracts().then(setContracts).catch(() => {});
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createContract({ title, startDate });
      setTitle("");
      setStartDate("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create contract");
    }
  }

  async function handleDelete(id: number) {
    await api.deleteContract(id);
    load();
  }

  async function toggleStatus(c: Contract) {
    const next = c.status === "active" ? "terminated" : "active";
    await api.updateContract(c.id, { status: next });
    load();
  }

  return (
    <section className="panel">
      <h2>Contracts</h2>
      <form className="inline-form" onSubmit={handleCreate}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        <button type="submit">Add</button>
      </form>
      {error && <div className="error">{error}</div>}
      <ul className="list">
        {contracts.map((c) => (
          <li key={c.id}>
            <span>
              <strong>{c.title}</strong> — {c.status} ({c.startDate.slice(0, 10)})
            </span>
            <span className="actions">
              <button onClick={() => toggleStatus(c)}>Toggle status</button>
              <button onClick={() => handleDelete(c.id)}>Delete</button>
            </span>
          </li>
        ))}
        {contracts.length === 0 && <li className="empty">No contracts yet.</li>}
      </ul>
    </section>
  );
}
