import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import { RouterProvider } from "react-router-dom";
import Router from "./Router";
import { AuthProvider } from "./Components/context/AuthContext";
import { ToastProvider } from "./Components/context/ToastContext";
import { NotificationProvider } from "./Components/context/NotificationContext";


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <RouterProvider router={Router} />
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>
);