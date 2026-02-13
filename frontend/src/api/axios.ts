import axios from "axios";

// Create an axios instance
const api = axios.create({
  baseURL: "/api", // all requests will be prefixed with /api
});

// Attach token automatically
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle forced logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const forceLogout = Boolean(error.response?.data?.force_logout);

    if (status === 401 || (status === 403 && forceLogout)) {
      // Clear auth-related storage
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role_id");
      sessionStorage.removeItem("panel_permission");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("auth");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Redirect to login page
      window.location.href = "/signin";
    }

    return Promise.reject(error);
  }
);

export default api;
