import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getMeCached } from "../utils/me";

type ProtectedRouteProps = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [panelPermission, setPanelPermission] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      const storedToken = sessionStorage.getItem("token");
      setToken(storedToken);

      if (!storedToken) {
        setLoading(false);
        return;
      }

      const storedRole = sessionStorage.getItem("role_id");
      const storedPanelPermission = sessionStorage.getItem("panel_permission");

      // If we already have role/permission cached locally, use it.
      if (storedRole && storedPanelPermission) {
        setRoleId(parseInt(storedRole, 10));
        setPanelPermission(parseInt(storedPanelPermission, 10));
        setLoading(false);
        return;
      }

      // Otherwise, fetch a fresh /me to avoid "token exists but no role_id" issues on refresh/deep-links.
      try {
        const me = await getMeCached({ force: true });
        const role = me.role_id;
        const permission = me.panel_permission ? 1 : 0;

        sessionStorage.setItem("role_id", role.toString());
        sessionStorage.setItem("panel_permission", permission.toString());

        setRoleId(role);
        setPanelPermission(permission);
      } catch {
        sessionStorage.clear();
        setToken(null);
        setRoleId(null);
        setPanelPermission(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) return null;

  // 🔒 Not logged in
  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  const path = location.pathname;

  const isAdminRoute = path.startsWith("/dashboard");
  const isChooseDashboard = path === "/choose-dashboard";
  const isUserDashboard = path.startsWith("/user-dashboard");
  const isProfileRoute = path.startsWith("/profile");

  // =============================
  // ✅ ROLE 1 → FULL ACCESS
  // =============================
  if (roleId === 1) {
    return <>{children}</>;
  }

  // =============================
  // ✅ ROLE 2 & 3
  // =============================
  if (roleId === 2 || roleId === 3) {

    // panel_permission = 1 → full access like admin
    if (panelPermission === 1) {
      return <>{children}</>;
    }

    // panel_permission = 0 → only user dashboard
    if (isUserDashboard || isProfileRoute) {
      return <>{children}</>;
    }

    return <Navigate to="/user-dashboard" replace />;
  }

  // =============================
  // ✅ ROLE 4 → ONLY USER DASHBOARD
  // =============================
  if (roleId === 4) {

    if (isUserDashboard || isProfileRoute) {
      return <>{children}</>;
    }

    return <Navigate to="/user-dashboard" replace />;
  }

  // Fallback safety
  return <Navigate to="/signin" replace />;
};

export default ProtectedRoute;
