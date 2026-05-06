import { Suspense, lazy, type ReactElement } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import FeatureReadinessLoading from "../components/FeatureReadinessLoading";
import RouteScrollToTop from "../components/RouteScrollToTop";
import { loadAppRuntimeConfig } from "../config/runtimeFeatures";
import { useApiReady } from "../hooks/useApiReady";
import { useCurrentUser } from "../hooks/useAuth";
import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";
import PublicLayout from "../layouts/PublicLayout";
import Dashboard from "../pages/Dashboard";
import LandingPage from "../pages/landing/LandingPage";
import LoginPage from "../pages/auth/LoginPage";
import { MARKETING_PAGE_LIST } from "../pages/landing/marketingPages";
import {
  hasAdminAccess,
  hasAgentAccess,
  hasCitizenAccess,
  hasManagerAccess,
  hasSupportWorkspaceAccess,
} from "../utils/authz";
import { API_BASE } from "../services/api";
import RequireAuth from "./guards/RequireAuth";
import RequireGuest from "./guards/RequireGuest";

const AppHomePage = lazy(() => import("../pages/AppHomePage"));
const AgentTourPage = lazy(() => import("../pages/AgentTourPage"));
const ManagerPlanningPage = lazy(() => import("../pages/ManagerPlanningPage"));
const ManagerToursPage = lazy(() => import("../pages/ManagerToursPage"));
const ManagerReportsPage = lazy(() => import("../pages/ManagerReportsPage"));
const CitizenChallengesPage = lazy(() => import("../pages/CitizenChallengesPage"));
const CitizenProfilePage = lazy(() => import("../pages/CitizenProfilePage"));
const CitizenReportPage = lazy(() => import("../pages/CitizenReportPage"));
const SupportPage = lazy(() => import("../pages/SupportPage"));
const TicketDetails = lazy(() => import("../pages/TicketDetails"));
const TreatTicketPage = lazy(() => import("../pages/TreatTicketPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const AdminDashboard = lazy(() =>
  import("../pages/AdminDashboard").then((module) => ({
    default: module.AdminDashboard,
  })),
);
const AuthCallbackPage = lazy(() => import("../pages/auth/AuthCallbackPage"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage"));
const MarketingInfoPage = lazy(() => import("../pages/landing/MarketingInfoPage"));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage"));
const SignupPage = lazy(() => import("../pages/auth/SignupPage"));

const withRouteSuspense = (element: ReactElement) => (
  <Suspense fallback={<FeatureReadinessLoading />}>{element}</Suspense>
);

function ProductUseCaseGate({ children }: { children: ReactElement }) {
  const { isApiReady } = useApiReady(API_BASE);

  if (!isApiReady) {
    return <FeatureReadinessLoading />;
  }

  return children;
}

// Keep this gate scoped to API-backed product/data routes only. Public pages,
// auth pages, `/app`, and `/app/settings` must stay Supabase-only so they do
// not wake the product API before the user enters a product surface.
const withProductReadiness = (element: ReactElement) => (
  <ProductUseCaseGate>{element}</ProductUseCaseGate>
);

function RootLandingRoute() {
  return withRouteSuspense(<LandingPage />);
}

function AdminRoute() {
  const { user } = useCurrentUser();
  const { adminWorkspaceEnabled } = loadAppRuntimeConfig();

  if (!adminWorkspaceEnabled) {
    return <Navigate to="/app" replace />;
  }

  if (!hasAdminAccess(user)) {
    return (
      <div className="app-access-denied">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to access the admin dashboard.</p>
      </div>
    );
  }

  return withProductReadiness(withRouteSuspense(<AdminDashboard />));
}

function DashboardRoute() {
  const { user } = useCurrentUser();

  if (!hasManagerAccess(user)) {
    return <Navigate to="/app" replace />;
  }

  return withProductReadiness(withRouteSuspense(<Dashboard />));
}

function ManagerRoute() {
  const { user } = useCurrentUser();

  if (!hasManagerAccess(user)) {
    return (
      <div className="app-access-denied">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to access manager planning.</p>
      </div>
    );
  }

  return withProductReadiness(withRouteSuspense(<ManagerPlanningPage />));
}

function ManagerReportsRoute() {
  const { user } = useCurrentUser();
  const { managerReportsEnabled } = loadAppRuntimeConfig();

  if (!managerReportsEnabled) {
    return <Navigate to="/app" replace />;
  }

  if (!hasManagerAccess(user)) {
    return (
      <div className="app-access-denied">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to access manager reports.</p>
      </div>
    );
  }

  return withProductReadiness(withRouteSuspense(<ManagerReportsPage />));
}

function ManagerToursRoute() {
  const { user } = useCurrentUser();

  if (!hasManagerAccess(user)) {
    return (
      <div className="app-access-denied">
        <h2>Access Denied</h2>
        <p>You don&apos;t have permission to access manager tour operations.</p>
      </div>
    );
  }

  return withProductReadiness(withRouteSuspense(<ManagerToursPage />));
}

function CitizenChallengesRoute() {
  const { user } = useCurrentUser();
  const { citizenChallengesEnabled } = loadAppRuntimeConfig();

  if (!citizenChallengesEnabled) {
    return <Navigate to="/app" replace />;
  }

  if (!hasCitizenAccess(user)) {
    return (
      <AccessDeniedMessage message="You don't have permission to access citizen tools." />
    );
  }

  return withProductReadiness(withRouteSuspense(<CitizenChallengesPage />));
}

function AccessDeniedMessage({ message }: { message: string }) {
  return (
    <div className="app-access-denied">
      <h2>Access Denied</h2>
      <p>{message}</p>
    </div>
  );
}

function AgentRouteGuard() {
  const { user } = useCurrentUser();

  if (!hasAgentAccess(user)) {
    return (
      <AccessDeniedMessage message="You don't have permission to access the agent workspace." />
    );
  }

  return <Outlet />;
}

function CitizenRouteGuard() {
  const { user } = useCurrentUser();

  if (!hasCitizenAccess(user)) {
    return (
      <AccessDeniedMessage message="You don't have permission to access citizen tools." />
    );
  }

  return <Outlet />;
}

function SupportWorkspaceRouteGuard() {
  const { user } = useCurrentUser();

  if (!hasSupportWorkspaceAccess(user)) {
    return <Navigate to="/support" replace />;
  }

  return <Outlet />;
}

export default function AppRouter() {
  return (
    <>
      <RouteScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<RootLandingRoute />} />
          {MARKETING_PAGE_LIST.map((page) => (
            <Route
              key={page.key}
              path={`/${page.path}`}
              element={withRouteSuspense(<MarketingInfoPage pageKey={page.key} />)}
            />
          ))}
          <Route path="/faq" element={<Navigate to="/support" replace />} />
        </Route>

        <Route element={<RequireGuest />}>
          <Route element={withRouteSuspense(<AuthLayout />)}>
            <Route path="/login" element={withRouteSuspense(<LoginPage />)} />
            <Route path="/signup" element={withRouteSuspense(<SignupPage />)} />
            <Route path="/forgot-password" element={withRouteSuspense(<ForgotPasswordPage />)} />
            <Route path="/reset-password" element={withRouteSuspense(<ResetPasswordPage />)} />
          </Route>
        </Route>

        <Route element={withRouteSuspense(<AuthLayout />)}>
          <Route path="/auth/callback" element={withRouteSuspense(<AuthCallbackPage />)} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/app" element={withRouteSuspense(<AppLayout />)}>
            <Route index element={withRouteSuspense(<AppHomePage />)} />
            <Route path="dashboard" element={<DashboardRoute />} />
            <Route path="agent" element={<AgentRouteGuard />}>
              <Route path="tour" element={withProductReadiness(withRouteSuspense(<AgentTourPage />))} />
            </Route>
            <Route path="manager/planning" element={<ManagerRoute />} />
            <Route path="manager/tours" element={<ManagerToursRoute />} />
            <Route path="manager/reports" element={<ManagerReportsRoute />} />
            <Route path="citizen" element={<CitizenRouteGuard />}>
              <Route path="report" element={withProductReadiness(withRouteSuspense(<CitizenReportPage />))} />
              <Route path="profile" element={withProductReadiness(withRouteSuspense(<CitizenProfilePage />))} />
              <Route path="challenges" element={<CitizenChallengesRoute />} />
            </Route>
            <Route element={<SupportWorkspaceRouteGuard />}>
              <Route path="support" element={withProductReadiness(withRouteSuspense(<SupportPage />))} />
              <Route path="tickets/advanced" element={<Navigate to="/app/support#advanced" replace />} />
              <Route path="tickets" element={<Navigate to="/app/support#simple" replace />} />
              <Route path="tickets/create" element={<Navigate to="/app/support#create" replace />} />
              <Route path="tickets/:id/details" element={withProductReadiness(withRouteSuspense(<TicketDetails />))} />
              <Route path="tickets/:id/treat" element={withProductReadiness(withRouteSuspense(<TreatTicketPage />))} />
            </Route>
            <Route path="settings" element={withRouteSuspense(<SettingsPage />)} />
            <Route path="admin" element={<AdminRoute />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
        </Route>

        <Route path="/landing" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
