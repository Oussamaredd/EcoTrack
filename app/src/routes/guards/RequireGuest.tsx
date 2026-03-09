import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useAuth";

export default function RequireGuest() {
  const { user, isAuthenticated, isLoading, authState } = useCurrentUser();
  const isLoggedIn = Boolean(user) || Boolean(isAuthenticated);
  const resolvedAuthState = authState ?? (isLoading ? "unknown" : isLoggedIn ? "authenticated" : "anonymous");

  if (resolvedAuthState === "authenticated" || (resolvedAuthState !== "unknown" && isLoggedIn)) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
