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
  fabKey,
}: {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  fabKey?: string;
}) {
  function renderTab({ key, label, icon: Icon, badge }: Tab) {
    return (
      <button key={key} className={key === active ? "active" : ""} onClick={() => onChange(key)}>
        <span className="tab-icon">
          <Icon size={22} />
          {Boolean(badge) && (
            <span className="tab-badge">{badge && badge > 99 ? "99+" : badge}</span>
          )}
        </span>
        <span>{label}</span>
      </button>
    );
  }

  const fabTab = fabKey ? tabs.find((t) => t.key === fabKey) : undefined;

  if (!fabTab) {
    return <nav className="tab-bar">{tabs.map(renderTab)}</nav>;
  }

  const otherTabs = tabs.filter((t) => t.key !== fabKey);
  const mid = Math.ceil(otherTabs.length / 2);
  const leftTabs = otherTabs.slice(0, mid);
  const rightTabs = otherTabs.slice(mid);
  const FabIcon = fabTab.icon;

  return (
    <nav className="tab-bar tab-bar-arched">
      <div className="tab-bar-group">{leftTabs.map(renderTab)}</div>
      <div className="tab-fab-wrap">
        <span className="tab-fab-halo" />
        <button
          type="button"
          className={`tab-fab${fabTab.key === active ? " active" : ""}`}
          onClick={() => onChange(fabTab.key)}
        >
          <FabIcon size={26} />
        </button>
        <span className="tab-fab-label">{fabTab.label}</span>
      </div>
      <div className="tab-bar-group">{rightTabs.map(renderTab)}</div>
    </nav>
  );
}
