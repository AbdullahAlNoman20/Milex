// src/Pages/modules/operations/OperationsRoutes.jsx
import OperationsRoleRoute from './components/OperationsRoleRoute';
import OperationsUnauthorized from './components/OperationsUnauthorized';
import { OPERATIONS_ROLES } from './constants/operationsRoles';

import OperationsIndex from './pages/OperationsIndex';

import ClientDashboard from './pages/Client/ClientDashboard';
import ClientBookingSummary from './pages/Client/BookingSummary';
import ClientTrackShipment from './pages/Client/TrackShipment';
import ClientDocumentsUpload from './pages/Client/DocumentsUpload';
import ClientImportRequest from './pages/Client/ImportRequest';
import ClientExportRequest from './pages/Client/ExportRequest';

import OperationsHeadDashboard from './pages/OperationsHead/OperationsHeadDashboard';
import HeadManifestGenerate from './pages/OperationsHead/ManifestGenerate';
import HeadRoutePlanning from './pages/OperationsHead/RoutePlanning';
import HeadDelayClaimManagement from './pages/OperationsHead/DelayClaimManagement';
import HeadBookingSummaryOverview from './pages/OperationsHead/BookingSummaryOverview';
import HeadDeliveryPerformance from './pages/OperationsHead/DeliveryPerformance';
import HeadCustomerPerformance from './pages/OperationsHead/CustomerPerformance';
import HeadTrackShipment from './pages/OperationsHead/TrackShipment';
import HeadStatusUpdateLog from './pages/OperationsHead/StatusUpdateLog';
import HeadCustomerProfileManagement from './pages/OperationsHead/CustomerProfileManagement';
import HeadCreditLimitSetup from './pages/OperationsHead/CreditLimitSetup';
import HeadReturnShipmentHandling from './pages/OperationsHead/ReturnShipmentHandling';

import DomesticAdminDashboard from './pages/DomesticAdmin/DomesticAdminDashboard';
import DomesticAwbGenerate from './pages/DomesticAdmin/AwbGenerate';
import DomesticInvoiceGenerate from './pages/DomesticAdmin/CommercialInvoiceGenerate';
import DomesticPickupRequestManagement from './pages/DomesticAdmin/PickupRequestManagement';
import DomesticDeliveryStatusUpdate from './pages/DomesticAdmin/DeliveryStatusUpdate';
import DomesticPodUpdate from './pages/DomesticAdmin/PodUpdate';
import DomesticReturnShipmentHandling from './pages/DomesticAdmin/ReturnShipmentHandling';
import DomesticTrackShipment from './pages/DomesticAdmin/TrackShipment';
import DomesticShipmentHistory from './pages/DomesticAdmin/ShipmentHistory';

import ForeignAdminDashboard from './pages/ForeignAdmin/ForeignAdminDashboard';
import ForeignAwbGenerate from './pages/ForeignAdmin/AwbGenerate';
import ForeignInvoiceGenerate from './pages/ForeignAdmin/CommercialInvoiceGenerate';
import ForeignPickupRequestManagement from './pages/ForeignAdmin/PickupRequestManagement';
import ForeignDeliveryStatusUpdate from './pages/ForeignAdmin/DeliveryStatusUpdate';
import ForeignPodUpdate from './pages/ForeignAdmin/PodUpdate';
import ForeignReturnShipmentHandling from './pages/ForeignAdmin/ReturnShipmentHandling';
import ForeignTrackShipment from './pages/ForeignAdmin/TrackShipment';
import ForeignShipmentHistory from './pages/ForeignAdmin/ShipmentHistory';
import ForeignImportRequestManagement from './pages/ForeignAdmin/ImportRequestManagement';
import ForeignExportRequestManagement from './pages/ForeignAdmin/ExportRequestManagement';
import MyTasksPage from './pages/Shared/MyTasksPage';
import NotificationsPage from './pages/Shared/NotificationsPage';import HeadPickupRequest from './pages/OperationsHead/HeadPickupRequest';
import ClientMyRequests from './pages/Client/MyRequests';

const withRole = (role, Component) => (
  <OperationsRoleRoute allowedRoles={[role]}>
    <Component />
  </OperationsRoleRoute>
);

const OperationsRoutes = [
  { index: true, element: <OperationsIndex /> },

  { path: 'client', element: withRole(OPERATIONS_ROLES.CLIENT, ClientDashboard) },
  { path: 'client/bookings', element: withRole(OPERATIONS_ROLES.CLIENT, ClientBookingSummary) },
  { path: 'client/tracking', element: withRole(OPERATIONS_ROLES.CLIENT, ClientTrackShipment) },
  { path: 'client/documents', element: withRole(OPERATIONS_ROLES.CLIENT, ClientDocumentsUpload) },
  { path: 'client/import-request', element: withRole(OPERATIONS_ROLES.CLIENT, ClientImportRequest) },
  { path: 'client/export-request', element: withRole(OPERATIONS_ROLES.CLIENT, ClientExportRequest) },
  { path: 'client/my-requests', element: withRole(OPERATIONS_ROLES.CLIENT, ClientMyRequests) },
  { path: 'client/notifications', element: withRole(OPERATIONS_ROLES.CLIENT, NotificationsPage) },
  { path: 'head', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, OperationsHeadDashboard) },
  { path: 'head/manifest', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadManifestGenerate) },
  { path: 'head/route-planning', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadRoutePlanning) },
  { path: 'head/claims', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadDelayClaimManagement) },
  { path: 'head/bookings', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadBookingSummaryOverview) },
  { path: 'head/delivery-performance', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadDeliveryPerformance) },
  { path: 'head/customer-performance', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadCustomerPerformance) },
  { path: 'head/tracking', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadTrackShipment) },
  { path: 'head/status-log', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadStatusUpdateLog) },
  { path: 'head/customers', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadCustomerProfileManagement) },
  { path: 'head/credit-limit', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadCreditLimitSetup) },
  { path: 'head/returns', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadReturnShipmentHandling) },
  { path: 'head/tasks', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, MyTasksPage) },
  { path: 'head/import-requests', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, ForeignImportRequestManagement) },
  { path: 'head/export-requests', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, ForeignExportRequestManagement) },
  { path: 'head/pickup-request', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, HeadPickupRequest) },
  { path: 'head/notifications', element: withRole(OPERATIONS_ROLES.OPERATIONS_HEAD, NotificationsPage) },
  { path: 'domestic', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, DomesticAdminDashboard) },
  { path: 'domestic/awb', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, DomesticAwbGenerate) },
  { path: 'domestic/invoice', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, DomesticInvoiceGenerate) },
  { path: 'domestic/pickups', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, DomesticPickupRequestManagement) },
  { path: 'domestic/delivery-status', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, DomesticDeliveryStatusUpdate) },
  { path: 'domestic/pod', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, DomesticPodUpdate) },
  { path: 'domestic/returns', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, DomesticReturnShipmentHandling) },
  { path: 'domestic/tracking', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, DomesticTrackShipment) },
  { path: 'domestic/shipment-history', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, DomesticShipmentHistory) },
{ path: 'domestic/tasks', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, MyTasksPage) },
  { path: 'domestic/notifications', element: withRole(OPERATIONS_ROLES.DOMESTIC_ADMIN, NotificationsPage) },
  { path: 'foreign', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignAdminDashboard) },
  { path: 'foreign/awb', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignAwbGenerate) },
  { path: 'foreign/invoice', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignInvoiceGenerate) },
  { path: 'foreign/pickups', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignPickupRequestManagement) },
  { path: 'foreign/delivery-status', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignDeliveryStatusUpdate) },
  { path: 'foreign/pod', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignPodUpdate) },
  { path: 'foreign/returns', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignReturnShipmentHandling) },
  { path: 'foreign/tracking', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignTrackShipment) },
  { path: 'foreign/shipment-history', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignShipmentHistory) },
  { path: 'foreign/tasks', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, MyTasksPage) },
  { path: 'foreign/notifications', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, NotificationsPage) },
  { path: 'foreign/import-requests', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignImportRequestManagement) },
  { path: 'foreign/export-requests', element: withRole(OPERATIONS_ROLES.FOREIGN_ADMIN, ForeignExportRequestManagement) },

  { path: 'unauthorized', element: <OperationsUnauthorized /> },
];

export default OperationsRoutes;