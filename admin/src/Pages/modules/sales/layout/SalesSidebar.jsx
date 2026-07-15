// src/Pages/modules/sales/layout/SalesSidebar.jsx
import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileBox, FileText, Users, ShieldCheck, CalendarDays, ClipboardList, BellRing, Eye, History, Users2 } from 'lucide-react';
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
    to: '/app/weekly-plans/review',
    label: 'Weekly Plan Review',
    icon: CalendarDays,
    roles: [ROLES.LINE_MANAGER],
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

  const visibleItems = useMemo(() => {
    if (!currentUser?.role) return [];
    return NAV_ITEMS.filter((item) => {
      const roleOk = !item.roles || item.roles.includes(currentUser.role);
      const permOk = !item.permissions || hasAnyPermission(currentUser.role, item.permissions);
      return roleOk && permOk;
    });
  }, [currentUser]);

  return (
    <nav className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
       <div className="h-20 flex items-center px-6 border-b border-slate-100">
        <img src="/log.jpeg" alt="MILEX" className="h-12 w-auto object-contain" />
      </div>
      <div className="flex-1 py-6 space-y-1">
        {visibleItems.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `w-full flex items-center px-6 py-3 text-left text-sm font-semibold border-l-4 transition ${
                isActive
                  ? 'bg-emerald-50/50 text-emerald-700 border-emerald-600'
                  : 'text-slate-500 hover:bg-slate-50 border-transparent'
              }`
            }
          >
            <Icon size={20} className="mr-3" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default SalesSidebar;