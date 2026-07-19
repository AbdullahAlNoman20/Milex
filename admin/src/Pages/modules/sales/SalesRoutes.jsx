// src/Pages/modules/sales/SalesRoutes.jsx
import RoleRoute from '../../../Components/Shared/RoleRoute';
import Unauthorized from '../../../Components/Shared/Unauthorized';
import { ROLES } from '../../../Components/constants/roles';
import { PERMISSIONS } from '../../../Components/constants/permissions';

import SalesDashboard from './pages/SalesDashboard';
import TaskQueue from './pages/TaskQueue';
import CustomersList from './pages/CustomersList';
import CustomerDetail from './pages/CustomerDetail';
import NewRecommendationWizard from './roles/KAM/NewRecommendationWizard';
import WeeklySalesPlan from './roles/KAM/WeeklySalesPlan';
import DailyVisitingReport from './roles/KAM/DailyVisitingReport';
import WeeklyPlanReviewList from './roles/LineManager/WeeklyPlanReviewList';
import FollowUpReminderPanel from './roles/LineManager/FollowUpReminderPanel';
import TeamReportsPage from './pages/TeamReportsPage';
import MyActivityPage from './pages/MyActivityPage';
import TeamActivityPage from './pages/TeamActivityPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminOverview from './roles/Admin/AdminOverview';
import SuperAdminOverview from './roles/SuperAdmin/SuperAdminOverview';

const SalesRoutes = [
  { index: true, element: <SalesDashboard /> },
  { path: 'tasks', element: <TaskQueue /> },
  { path: 'customers', element: <CustomersList /> },
  { path: 'customers/:barcode', element: <CustomerDetail /> },
  {
    path: 'recommendations/new',
    element: (
      <RoleRoute allowedRoles={[ROLES.KAM]} requiredPermissions={[PERMISSIONS.CREATE_RECOMMENDATION]}>
        <NewRecommendationWizard />
      </RoleRoute>
    ),
  },
  {
    path: 'weekly-plans',
    element: (
      <RoleRoute allowedRoles={[ROLES.KAM]}>
        <WeeklySalesPlan />
      </RoleRoute>
    ),
  },
  {
    path: 'weekly-plans/review',
    element: (
      <RoleRoute allowedRoles={[ROLES.LINE_MANAGER]}>
        <WeeklyPlanReviewList />
      </RoleRoute>
    ),
  },
  {
    path: 'daily-reports',
    element: (
      <RoleRoute allowedRoles={[ROLES.KAM]}>
        <DailyVisitingReport />
      </RoleRoute>
    ),
  },
  {
    path: 'follow-ups',
    element: (
      <RoleRoute allowedRoles={[ROLES.LINE_MANAGER]}>
        <FollowUpReminderPanel />
      </RoleRoute>
    ),
  },
  {
    path: 'team-reports',
    element: (
      <RoleRoute allowedRoles={[ROLES.LINE_MANAGER, ROLES.SUPER_ADMIN]}>
        <TeamReportsPage />
      </RoleRoute>
    ),
  },
  { path: 'my-activity', element: <MyActivityPage /> },
  { path: 'notifications', element: <NotificationsPage /> },
  {
    path: 'team-activity',
    element: (
      <RoleRoute allowedRoles={[ROLES.LINE_MANAGER, ROLES.SUPER_ADMIN]}>
        <TeamActivityPage />
      </RoleRoute>
    ),
  },
  {
    path: 'admin',
    element: (
      <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
        <AdminOverview />
      </RoleRoute>
    ),
  },
  {
    path: 'admin/super',
    element: (
      <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
        <SuperAdminOverview />
      </RoleRoute>
    ),
  },
  { path: 'unauthorized', element: <Unauthorized /> },
];

export default SalesRoutes;