import { createBrowserRouter } from "react-router-dom";
import Root from "./Root";
import Home from "./Pages/Home/Home";
import Login from "./Pages/Login/Login";
import ScrollToTop from "./Components/ScrollToTop";
import ProtectedRoute from "./Components/Shared/ProtectedRoute";
import SalesLayout from "./Pages/modules/sales/layout/SalesLayout";
import SalesRoutes from "./Pages/modules/sales/SalesRoutes";
import OperationsRoot from "./Pages/modules/operations/OperationsRoot";
import OperationsLogin from "./Pages/modules/operations/pages/OperationsLogin";
import OperationsProtectedRoute from "./Pages/modules/operations/components/OperationsProtectedRoute";
import OperationsLayout from "./Pages/modules/operations/layout/OperationsLayout";
import OperationsRoutes from "./Pages/modules/operations/OperationsRoutes";
import OperationsDocumentRoutes from "./Pages/modules/operations/OperationsDocumentRoutes";

const Router = createBrowserRouter([
  {
    path: "/",
    element: (<><ScrollToTop /><Root /></>),
    children: [{ path: "/", element: <Home /> }],
  },
  { path: "/login", element: <Login /> },
  {
    path: "/app",
    element: <ProtectedRoute><SalesLayout /></ProtectedRoute>,
    children: SalesRoutes,
  },
  {
    path: "/operations",
    element: <OperationsRoot />,
    children: [
      { path: "login", element: <OperationsLogin /> },
      {
        path: "documents",
        element: <OperationsProtectedRoute />,
        children: OperationsDocumentRoutes,
      },
      {
        path: "",
        element: (
          <OperationsProtectedRoute>
            <OperationsLayout />
          </OperationsProtectedRoute>
        ),
        children: OperationsRoutes,
      },
    ],
  },
]);

export default Router;