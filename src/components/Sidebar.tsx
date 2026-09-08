import type { Tab } from "./TabBar";

// Desktop-only navigation (hidden below the desktop breakpoint via CSS,
// see .app-sidebar in App.css) -- mirrors TabBar's tabs/active/onChange so
// both pages just render both components and let CSS pick which shows.
export default function Sidebar({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <nav className="app-sidebar">
      {tabs.map(({ key, label, icon: Icon, badge }) => (
        <button
          key={key}
          className={key === active ? "active" : ""}
          onClick={() => onChange(key)}
        >
          <span className="sidebar-icon">
            <Icon size={19} />
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
