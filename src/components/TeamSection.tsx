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
      <p className="hint">{t("myTeam.hint")}</p>
      <ul className="list">
        {loading && <SkeletonRows count={5} />}
        {!loading &&
          team.map((m) => (
            <li key={m.id}>
              <span className="list-row-identity">
                <Avatar userId={m.id} name={m.name} hasAvatar={m.hasAvatar} size={32} />
                {m.name}
                {m.online && <span className="presence-dot inline" title={t("team.online")} />}
              </span>
              <span className="role-badge">
                {m.role === "manager" ? t("common.roleManager") : t("common.roleEmployee")}
              </span>
            </li>
          ))}
        {!loading && team.length === 0 && <li className="empty">{t("myTeam.empty")}</li>}
      </ul>
    </section>
  );
}
