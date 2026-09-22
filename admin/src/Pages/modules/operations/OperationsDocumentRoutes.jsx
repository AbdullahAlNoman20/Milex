// src/Pages/modules/operations/OperationsDocumentRoutes.jsx
// Standalone printable-document routes — deliberately outside OperationsLayout
// so the sidebar/header never appear on a page meant to be printed.
import AwbPrintView from './pages/Documents/AwbPrintView';
import InvoicePrintView from './pages/Documents/InvoicePrintView';
import ManifestPrintView from './pages/Documents/ManifestPrintView';
import LabelPrintView from './pages/Documents/LabelPrintView';
import PodPrintView from './pages/Documents/PodPrintView';

const OperationsDocumentRoutes = [
  { path: 'awb/:awbNumber', element: <AwbPrintView /> },
  { path: 'invoice/:awbNumber', element: <InvoicePrintView /> },
  { path: 'manifest/:manifestId', element: <ManifestPrintView /> },
  { path: 'label/:awbNumber', element: <LabelPrintView /> },
  { path: 'pod/:awbNumber', element: <PodPrintView /> },
];

export default OperationsDocumentRoutes;