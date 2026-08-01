// src/Pages/modules/sales/layout/SalesSidebar.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileBox, FileText, Users, ShieldCheck, CalendarDays, ClipboardList, BellRing, Eye, History, Users2, Menu, X } from 'lucide-react';
import { useAuth } from '../../../../Components/hooks/useAuth';
import { ROLES } from '../../../../Components/constants/roles';
import { hasAnyPermission, PERMISSIONS } from '../../../../Components/constants/permissions';

const NAV_ITEMS = [
  { to: '/app', end: true, label: 'Dashboard', icon: LayoutDashboard, roles: null, permissions: null },
  {
    to: '/app/recommendations/new',
    label: 'New Recommendation',
    icon: FileBox,
    roles: [ROLES.KAM],
    permissions: [PERMISSIONS.CREATE_RECOMMENDATION],
  },
  { to: '/app/tasks', label: 'Task Queue', icon: FileText, roles: null, permissions: null },
  { to: '/app/customers', label: 'Customers', icon: Users, roles: null, permissions: null },
  {
    to: '/app/weekly-plans',
    label: 'Weekly Sales Planning',
    icon: CalendarDays,
    roles: [ROLES.KAM],
    permissions: null,
  },
  {
    to: '/app/daily-reports',
    label: 'Daily Visiting Report',
    icon: ClipboardList,
    roles: [ROLES.KAM],
    permissions: null,
  },

  {
    to: '/app/follow-ups',
    label: 'Follow-up Reminders',
    icon: BellRing,
    roles: [ROLES.LINE_MANAGER],
    permissions: null,
  },
  {
    to: '/app/team-reports',
    label: 'Team Reports',
    icon: Eye,
    roles: [ROLES.LINE_MANAGER, ROLES.SUPER_ADMIN],
    permissions: null,
  },
  {
    to: '/app/my-activity',
    label: 'My Activity',
    icon: History,
    roles: null,
    permissions: null,
  },
  {
    to: '/app/notifications',
    label: 'Notifications',
    icon: Eye,
    roles: null,
    permissions: null,
  },
  {
    to: '/app/team-activity',
    label: 'Team Activity',
    icon: Users2,
    roles: [ROLES.LINE_MANAGER, ROLES.SUPER_ADMIN],
    permissions: null,
  },
  {
    to: '/app/admin',
    label: 'Admin Console',
    icon: ShieldCheck,
    roles: [ROLES.SUPER_ADMIN],
    permissions: null,
  },
];

const SalesSidebar = () => {
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef(null);

  const visibleItems = useMemo(() => {
    if (!currentUser?.role) return [];
    return NAV_ITEMS.filter((item) => {
      const roleOk = !item.roles || item.roles.includes(currentUser.role);
      const permOk = !item.permissions || hasAnyPermission(currentUser.role, item.permissions);
      return roleOk && permOk;
    });
  }, [currentUser]);

  const collapse = useCallback(() => setIsExpanded(false), []);
  const toggle = useCallback(() => setIsExpanded((prev) => !prev), []);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) collapse();
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') collapse();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isExpanded, collapse]);

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden"
          onClick={collapse}
          aria-hidden="true"
        />
      )}

      <nav
        ref={navRef}
        aria-label="Sales navigation"
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col shadow-sm z-40 transition-[width] duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'w-64' : 'w-[68px]'
        }`}
      >
        <div className="h-20 flex items-center justify-between px-3 border-b border-slate-100 shrink-0">
          <div className={`flex items-center overflow-hidden transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>
            <img src="/log.jpeg" alt="MILEX" className="h-12 w-auto object-contain" />
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={isExpanded}
            className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition"
          >
            {isExpanded ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
          {visibleItems.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={collapse}
              title={!isExpanded ? label : undefined}
              className={({ isActive }) =>
                `w-full flex items-center px-6 py-3 text-left text-sm font-semibold border-l-4 transition whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-50/50 text-emerald-700 border-emerald-600'
                    : 'text-slate-500 hover:bg-slate-50 border-transparent'
                }`
              }
            >
              <Icon size={20} className="mr-3 shrink-0" />
              <span className={`transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};

export default SalesSidebar;