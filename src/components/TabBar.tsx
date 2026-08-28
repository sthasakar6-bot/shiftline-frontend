import type { ComponentType } from "react";

export interface Tab {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
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
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          className={key === active ? "active" : ""}
          onClick={() => onChange(key)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
