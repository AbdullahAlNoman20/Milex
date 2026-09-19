import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import { RouterProvider } from "react-router-dom";
import Router from "./Router";
import { AuthProvider } from "./Components/context/AuthContext";
import { ToastProvider } from "./Components/context/ToastContext";
import { ConfirmProvider } from "./Components/context/ConfirmContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <RouterProvider router={Router} />
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>
);