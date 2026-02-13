import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const RootRedirect = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    // ✅ NO TOKEN → SIGN IN
    if (!token) {
      navigate("/signin", { replace: true });
      return;
    }

    // 🔄 Fetch latest user info
    api.get("/me")
      .then((res) => {
        const user = res.data;
        const role = user.role_id;
        const permission = user.panel_permission ? 1 : 0;

        sessionStorage.setItem("role_id", role.toString());
        sessionStorage.setItem("panel_permission", permission.toString());
        sessionStorage.setItem("user", JSON.stringify(user));

        // 🚦 Redirect logic
        if (role === 1) {
          navigate("/choose-dashboard", { replace: true });
          return;
        }

        if ((role === 2 || role === 3) && permission === 1) {
          navigate("/choose-dashboard", { replace: true });
          return;
        }

        navigate("/user-dashboard", { replace: true });
      })
      .catch(() => {
        // ❌ Invalid token
        sessionStorage.clear();
        navigate("/signin", { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return null;
  return null;
};

export default RootRedirect;
