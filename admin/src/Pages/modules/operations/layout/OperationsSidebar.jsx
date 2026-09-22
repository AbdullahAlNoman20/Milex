// src/Pages/modules/operations/layout/OperationsSidebar.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Menu,
  X,
  FileText,
  MapPinned,
  History,
  FileUp,
  PackageSearch,
  FileBox,
  Route,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Users,
  CreditCard,
  Undo2,
  Truck,
} from "lucide-react";
import { useOperationsAuth } from "../hooks/useOperationsAuth";
import { OPERATIONS_ROLES } from "../constants/operationsRoles";

const NAV_ITEMS = [
  // Client
  {
    to: "/operations/client",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: [OPERATIONS_ROLES.CLIENT],
  },
  {
    to: "/operations/client/bookings",
    label: "Booking Summary",
    icon: FileText,
    roles: [OPERATIONS_ROLES.CLIENT],
  },
  {
    to: "/operations/client/tracking",
    label: "Track Shipment",
    icon: MapPinned,
    roles: [OPERATIONS_ROLES.CLIENT],
  },
  {
    to: "/operations/client/documents",
    label: "Documents Upload",
    icon: FileUp,
    roles: [OPERATIONS_ROLES.CLIENT],
  },
  {
    to: "/operations/client/import-request",
    label: "Import Request",
    icon: PackageSearch,
    roles: [OPERATIONS_ROLES.CLIENT],
  },
  {
    to: "/operations/client/export-request",
    label: "Export Request",
    icon: PackageSearch,
    roles: [OPERATIONS_ROLES.CLIENT],
  },
  {
    to: "/operations/client/my-requests",
    label: "My Requests",
    icon: FileText,
    roles: [OPERATIONS_ROLES.CLIENT],
  },

  // Operations Head
  {
    to: "/operations/head",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/manifest",
    label: "Manifest Generate",
    icon: FileBox,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/route-planning",
    label: "Route Planning",
    icon: Route,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/claims",
    label: "Delay / Claim Mgmt",
    icon: AlertTriangle,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/bookings",
    label: "Booking Summary",
    icon: FileText,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/delivery-performance",
    label: "Delivery Performance",
    icon: BarChart3,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/customer-performance",
    label: "Customer Performance",
    icon: BarChart3,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/tracking",
    label: "Track Shipment",
    icon: MapPinned,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/status-log",
    label: "Status Update Log",
    icon: ClipboardList,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/customers",
    label: "Customer Profile",
    icon: Users,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/credit-limit",
    label: "Credit Limit Setup",
    icon: CreditCard,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/returns",
    label: "Return Shipment",
    icon: Undo2,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/tasks",
    label: "My Tasks",
    icon: ClipboardList,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/import-requests",
    label: "Import Approvals",
    icon: PackageSearch,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/export-requests",
    label: "Export Approvals",
    icon: PackageSearch,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },
  {
    to: "/operations/head/pickup-request",
    label: "Request Pickup",
    icon: PackageSearch,
    roles: [OPERATIONS_ROLES.OPERATIONS_HEAD],
  },

  // Domestic Admin
  {
    to: "/operations/domestic",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: [OPERATIONS_ROLES.DOMESTIC_ADMIN],
  },
  {
    to: "/operations/domestic/awb",
    label: "AWB / CN Generate",
    icon: FileBox,
    roles: [OPERATIONS_ROLES.DOMESTIC_ADMIN],
  },
  {
    to: "/operations/domestic/invoice",
    label: "Commercial Invoice",
    icon: FileText,
    roles: [OPERATIONS_ROLES.DOMESTIC_ADMIN],
  },
  {
    to: "/operations/domestic/pickups",
    label: "Pickup Requests",
    icon: PackageSearch,
    roles: [OPERATIONS_ROLES.DOMESTIC_ADMIN],
  },
  {
    to: "/operations/domestic/delivery-status",
    label: "Delivery Status",
    icon: Truck,
    roles: [OPERATIONS_ROLES.DOMESTIC_ADMIN],
  },
  {
    to: "/operations/domestic/pod",
    label: "POD Update",
    icon: FileText,
    roles: [OPERATIONS_ROLES.DOMESTIC_ADMIN],
  },
  {
    to: "/operations/domestic/returns",
    label: "Return Shipment",
    icon: Undo2,
    roles: [OPERATIONS_ROLES.DOMESTIC_ADMIN],
  },
  {
    to: "/operations/domestic/tracking",
    label: "Track Shipment",
    icon: MapPinned,
    roles: [OPERATIONS_ROLES.DOMESTIC_ADMIN],
  },
  {
    to: "/operations/domestic/shipment-history",
    label: "Shipment History",
    icon: History,
    roles: [OPERATIONS_ROLES.DOMESTIC_ADMIN],
  },
  {
    to: "/operations/domestic/tasks",
    label: "My Tasks",
    icon: ClipboardList,
    roles: [OPERATIONS_ROLES.DOMESTIC_ADMIN],
  },

  // Foreign Admin
  {
    to: "/operations/foreign",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/awb",
    label: "AWB / CN Generate",
    icon: FileBox,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/invoice",
    label: "Commercial Invoice",
    icon: FileText,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/pickups",
    label: "Pickup Requests",
    icon: PackageSearch,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/delivery-status",
    label: "Delivery Status",
    icon: Truck,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/pod",
    label: "POD Update",
    icon: FileText,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/returns",
    label: "Return Shipment",
    icon: Undo2,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/tracking",
    label: "Track Shipment",
    icon: MapPinned,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/shipment-history",
    label: "Shipment History",
    icon: History,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/tasks",
    label: "My Tasks",
    icon: ClipboardList,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/import-requests",
    label: "Import Requests",
    icon: PackageSearch,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
  {
    to: "/operations/foreign/export-requests",
    label: "Export Requests",
    icon: PackageSearch,
    roles: [OPERATIONS_ROLES.FOREIGN_ADMIN],
  },
];

const isDesktopViewport = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(min-width: 1024px)").matches;

const OperationsSidebar = () => {
  const { currentUser } = useOperationsAuth();
  const [isExpanded, setIsExpanded] = useState(isDesktopViewport);
  const navRef = useRef(null);

  const visibleItems = useMemo(() => {
    if (!currentUser?.role) return [];
    return NAV_ITEMS.filter(
      (item) => !item.roles || item.roles.includes(currentUser.role),
    );
  }, [currentUser]);

  const collapse = useCallback(() => setIsExpanded(false), []);
  const toggle = useCallback(() => setIsExpanded((prev) => !prev), []);

  useEffect(() => {
    if (!isExpanded || isDesktopViewport()) return undefined;
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) collapse();
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") collapse();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isExpanded, collapse]);

  const handleNavClick = useCallback(() => {
    if (!isDesktopViewport()) collapse();
  }, [collapse]);

  return (
    <>
      {!isExpanded && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Open navigation menu"
          aria-expanded={isExpanded}
          className="lg:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition"
        >
          <Menu size={20} />
        </button>
      )}

      {isExpanded && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden"
          onClick={collapse}
          aria-hidden="true"
        />
      )}

      <nav
        ref={navRef}
        aria-label="Operations navigation"
        className={`relative fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col shadow-xl lg:shadow-sm z-50 lg:z-30 transition-all duration-300 ease-in-out shrink-0 ${
          isExpanded
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full lg:w-[68px] lg:translate-x-0"
        } overflow-hidden`}
      >
        {/* Watermark background — faint image over a white theme, sits behind all nav content */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-center bg-cover bg-no-repeat opacity-20 pointer-events-none"
          style={{ backgroundImage: "url('/bg.jpg')" }}
        />
        <div className="absolute inset-0 z-0 bg-white/60 pointer-events-none" />

        <div className="relative z-10 h-20 flex items-center justify-between px-3 lg:px-3 border-b border-slate-100 shrink-0">
          <div
            className={`flex items-center overflow-hidden transition-opacity duration-200 ${isExpanded ? "opacity-100" : "opacity-0 w-0 lg:w-0"}`}
          >
            <img
              src="/log.jpeg"
              alt="MILEX"
              className="h-12 w-auto object-contain"
            />
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isExpanded}
            className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition"
          >
            {isExpanded ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div
          className="relative z-10 flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleNavClick}
              title={!isExpanded ? label : undefined}
              className={({ isActive }) =>
                `w-full flex items-center px-6 py-3 text-left text-sm font-semibold border-l-4 transition whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-50/50 text-emerald-700 border-emerald-600"
                    : "text-slate-500 hover:bg-slate-50 border-transparent"
                }`
              }
            >
              <Icon size={20} className="mr-3 shrink-0" />
              <span
                className={`transition-opacity duration-200 ${isExpanded ? "opacity-100" : "opacity-0"}`}
              >
                {label}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
};

export default OperationsSidebar;
