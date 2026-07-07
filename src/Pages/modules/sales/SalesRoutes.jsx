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
    path: 'admin',
    element: (
      <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
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