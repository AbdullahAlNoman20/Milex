import { createBrowserRouter } from "react-router-dom";
import Root from "./Root";
import Home from "./Pages/Home/Home";
import Login from "./Pages/Login/Login";
import ScrollToTop from "./Components/ScrollToTop";
import ProtectedRoute from "./Components/Shared/ProtectedRoute";
import SalesLayout from "./Pages/modules/sales/layout/SalesLayout";
import SalesRoutes from "./Pages/modules/sales/SalesRoutes";

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
]);

export default Router;