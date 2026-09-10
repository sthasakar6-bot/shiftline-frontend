import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { TeamMember } from "../api/types";
import Avatar from "./Avatar";
import { SkeletonRows } from "./Skeleton";

const UNASSIGNED = Symbol("unassigned");

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

  // Only worth grouping once there's more than one location in play --
  // otherwise everyone lands under one heading, which is just noise.
  const groups = useMemo(() => {
    const map = new Map<string | typeof UNASSIGNED, TeamMember[]>();
    for (const m of team) {
      const key = m.location?.trim() || UNASSIGNED;
      const existing = map.get(key) ?? [];
      existing.push(m);
      map.set(key, existing);
    }
    const entries = [...map.entries()].sort(([a], [b]) => {
      if (a === UNASSIGNED) return 1;
      if (b === UNASSIGNED) return -1;
      return (a as string).localeCompare(b as string);
    });
    return entries;
  }, [team]);

  const showGroupHeadings = groups.length > 1;

  function renderCard(m: TeamMember) {
    return (
      <button type="button" key={m.id} className="team-card" onClick={() => setSelected(m)}>
        <Avatar userId={m.id} name={m.name} hasAvatar={m.hasAvatar} size={64} />
        <span className="team-card-name">{m.name}</span>
      </button>
    );
  }

  return (
    <section className="panel">
      <h2>{t("myTeam.title")}</h2>
      {loading ? (
        <SkeletonRows count={5} />
      ) : team.length === 0 ? (
        <p className="empty">{t("myTeam.empty")}</p>
      ) : showGroupHeadings ? (
        groups.map(([key, members]) => (
          <div key={typeof key === "string" ? key : "unassigned"} className="team-location-group">
            <h3 className="team-location-title">
              {key === UNASSIGNED ? t("myTeam.unassigned") : key}
            </h3>
            <div className="team-grid">{members.map(renderCard)}</div>
          </div>
        ))
      ) : (
        <div className="team-grid">{team.map(renderCard)}</div>
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
            {selected.location && <p className="hint">{selected.location}</p>}
            <div className="modal-actions">
              <button onClick={() => setSelected(null)}>{t("common.close")}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
