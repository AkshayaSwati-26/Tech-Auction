import { useEffect, useState } from "react";
import { NavLink, Outlet, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  Gavel,
  Users,
  Package,
  History as HistoryIcon,
  Settings as SettingsIcon,
  MonitorPlay,
  Menu,
  X,
  Users2,
} from "lucide-react";
import ConnectionBadge from "../../components/shared/ConnectionBadge";
import { useEventStore } from "../../store/eventStore";
import { getAdminToken } from "../../lib/api";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/control", label: "Auction Control", icon: Gavel },
  { to: "/admin/teams", label: "Team Wallets", icon: Users },
  { to: "/admin/lots", label: "Lot Inventory", icon: Package },
  { to: "/admin/history", label: "Sale History", icon: HistoryIcon },
  { to: "/admin/settings", label: "Event Settings", icon: SettingsIcon },
];

export default function AdminLayout() {
  const init = useEventStore((s) => s.init);
  const settings = useEventStore((s) => s.state?.settings);
  const unauthorized = useEventStore((s) => s.unauthorized);
  const adminCount = useEventStore((s) => s.adminCount);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    init("admin");
  }, [init]);

  if (!getAdminToken() || unauthorized) {
    return <Navigate to="/admin/login" replace />;
  }

  const sidebar = (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-white/[0.08] bg-panel">
      <div className="flex items-center gap-2 px-5 py-5">
        <Gavel size={20} className="text-live" />
        <div>
          <p className="text-[10px] font-normal uppercase tracking-[0.3em] text-slate-muted">Tech Auction</p>
          <h1 className="font-display text-lg font-bold text-chrome-gradient">Command Center</h1>
        </div>
        <button onClick={() => setNavOpen(false)} className="ml-auto text-slate-muted md:hidden">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setNavOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition md:py-2.5 ${
                isActive ? "bg-live/10 text-live" : "text-slate-muted hover:bg-white/5 hover:text-ink"
              }`
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <a
          href="/display"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-slate-muted hover:border-live/40 hover:text-live"
        >
          <MonitorPlay size={14} />
          Open Audience Display
        </a>
        {adminCount !== null && adminCount > 1 && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-muted">
            <Users2 size={13} />
            {adminCount} admins connected
          </div>
        )}
        <div className="mt-3 flex items-center justify-between px-1">
          <ConnectionBadge />
          {settings && (
            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-muted">
              {settings.status}
            </span>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="admin flex h-screen bg-midnight text-ink">
      <div className="hidden md:block">{sidebar}</div>

      {navOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setNavOpen(false)} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3 md:hidden">
          <button onClick={() => setNavOpen(true)} className="rounded-lg p-2 text-slate-muted hover:bg-white/5" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="font-display text-sm font-bold text-chrome-gradient">Command Center</span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
