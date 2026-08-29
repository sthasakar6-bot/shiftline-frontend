import type { ComponentType } from "react";

export interface Tab {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  badge?: number;
}

export default function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <nav className="tab-bar">
      {tabs.map(({ key, label, icon: Icon, badge }) => (
        <button
          key={key}
          className={key === active ? "active" : ""}
          onClick={() => onChange(key)}
        >
          <span className="tab-icon">
            <Icon size={22} />
            {Boolean(badge) && (
              <span className="tab-badge">{badge && badge > 99 ? "99+" : badge}</span>
            )}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
