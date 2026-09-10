import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { TeamMember } from "../api/types";
import Avatar from "./Avatar";
import { SkeletonRows } from "./Skeleton";

export default function TeamSection() {
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeamMember | null>(null);

  useEffect(() => {
    api
      .listTeam()
      .then(setTeam)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="panel">
      <h2>{t("myTeam.title")}</h2>
      {loading ? (
        <SkeletonRows count={5} />
      ) : team.length === 0 ? (
        <p className="empty">{t("myTeam.empty")}</p>
      ) : (
        <div className="team-grid">
          {team.map((m) => (
            <button
              type="button"
              key={m.id}
              className="team-card"
              onClick={() => setSelected(m)}
            >
              <Avatar userId={m.id} name={m.name} hasAvatar={m.hasAvatar} size={64} />
              <span className="team-card-name">{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal team-profile-modal" onClick={(e) => e.stopPropagation()}>
            <Avatar
              userId={selected.id}
              name={selected.name}
              hasAvatar={selected.hasAvatar}
              size={140}
            />
            <h3>{selected.name}</h3>
            <div className="modal-actions">
              <button onClick={() => setSelected(null)}>{t("common.close")}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
