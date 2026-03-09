import { Navigate, Outlet, useLocation } from "react-router-dom";
import AppStatusScreen from "../../components/AppStatusScreen";
import { useCurrentUser } from "../../hooks/useAuth";

const buildNextParam = (path: string, search: string, hash: string) => {
  const fullPath = `${path}${search}${hash}`;
  return encodeURIComponent(fullPath);
};

export default function RequireAuth() {
  const { user, isAuthenticated, isLoading, authState } = useCurrentUser();
  const location = useLocation();
  const isLoggedIn = Boolean(user) || Boolean(isAuthenticated);
  const resolvedAuthState = authState ?? (isLoading ? "unknown" : isLoggedIn ? "authenticated" : "anonymous");

  if (resolvedAuthState === "unknown") {
    return (
      <AppStatusScreen
        title="Checking your session"
        message="EcoTrack is confirming your access before opening the workspace."
      />
    );
  }

  if (resolvedAuthState !== "authenticated" && !isLoggedIn) {
    const next = buildNextParam(location.pathname, location.search, location.hash);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
