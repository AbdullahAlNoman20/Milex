
import { createBrowserRouter } from "react-router-dom";
import Root from "./Root";
import Home from "./Pages/Home/Home";
import ScrollToTop from "./Components/ScrollToTop";

const Router = createBrowserRouter([
  {
    path: "/",
    element: (
      <>
        <ScrollToTop />
        <Root />
      </>
    ),
    children: [
      { path: "/", element: <Home /> },
    ],
  },
]);

export default Router;