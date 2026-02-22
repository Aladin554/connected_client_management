import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.ts";
import { ArrowLeft } from "lucide-react";
import { getMeCached } from "../../utils/me";

interface Role {
  id: number;
  name: string;
}

interface CurrentUser {
  role_id: number;
  can_create_users: number;
}

const isLikelyIp = (value: string): boolean => {
  const ipv4 =
    /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
  const ipv6 = /^[0-9A-Fa-f:]+$/;
  return ipv4.test(value) || (value.includes(":") && ipv6.test(value));
};

export default function AdminUserForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    roleId: isEdit ? "" : "3",
    password: "",
    max_cards: "10",
    allowed_ips: [] as string[],
  });

  const [errors, setErrors] = useState({
    first_name: "",
    last_name: "",
    email: "",
    roleId: "",
    password: "",
    max_cards: "",
    allowed_ips: "",
  });
  const [ipInput, setIpInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  // ---------- FETCH CURRENT USER ----------
  useEffect(() => {
    getMeCached()
      .then((me) => {
        setCurrentUser(me as any);
      })
      .catch(() => {
        navigate("/dashboard/admin-users", {
          state: { message: "Failed to get current user", type: "error" },
        });
      });
  }, [navigate]);

  // ---------- ACCESS CONTROL ----------
  useEffect(() => {
    if (!currentUser) return;

    const roleId = currentUser.role_id;
    const canCreate = currentUser.can_create_users === 1;

    // Super Admin always allowed
    if (roleId === 1) return;

    // Admin role:
    // - can always edit existing users
    // - can create new users only when can_create_users is enabled
    if (roleId === 2) {
      if (isEdit || canCreate) return;
    }

    // Otherwise redirect
    navigate("/dashboard/admin-users", {
      state: { message: "You do not have access to this page.", type: "error" },
    });
  }, [currentUser, isEdit, navigate]);

  // ---------- FETCH ROLES ----------
  useEffect(() => {
    api.get("/roles")
      .then((res) => setRoles(Array.isArray(res.data) ? res.data : []))
      .catch(() =>
        navigate("/dashboard/admin-users", { state: { message: "Failed to fetch roles", type: "error" } })
      );
  }, [navigate]);

  // ---------- LOAD USER IF EDITING ----------
  useEffect(() => {
    if (isEdit && id) {
      api.get(`/users/${id}`)
        .then((res) => {
          setForm({
            first_name: res.data.first_name || "",
            last_name: res.data.last_name || "",
            email: res.data.email || "",
            roleId: res.data.role_id?.toString() || res.data.role?.id?.toString() || "",
            password: "",
            max_cards: res.data.max_cards?.toString() || "10",
            allowed_ips: Array.isArray(res.data.allowed_ips) ? res.data.allowed_ips : [],
          });
        })
        .catch(() =>
          navigate("/dashboard/admin-users", { state: { message: "Failed to load user", type: "error" } })
        );
    }
  }, [id, isEdit, navigate]);

  // ---------- VALIDATE FORM ----------
  const validateForm = () => {
    const newErrors = { first_name: "", last_name: "", email: "", roleId: "", password: "", max_cards: "", allowed_ips: "" };
    let valid = true;

    if (!form.first_name.trim()) { newErrors.first_name = "First name is required."; valid = false; }
    if (!form.last_name.trim()) { newErrors.last_name = "Last name is required."; valid = false; }
    if (!form.email.trim()) { newErrors.email = "Email is required."; valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { newErrors.email = "Invalid email address."; valid = false; }
    if (!form.roleId) { newErrors.roleId = "Role is required."; valid = false; }
    if (!isEdit && !form.password.trim()) { newErrors.password = "Password is required."; valid = false; }

    if (currentUser?.role_id === 1) {
      const num = parseInt(form.max_cards);
      if (isNaN(num) || num < 1 || num > 1000) {
        newErrors.max_cards = "Max cards must be between 1 and 1000";
        valid = false;
      }

      if (form.allowed_ips.some((ip) => !isLikelyIp(ip))) {
        newErrors.allowed_ips = "One or more IPs are invalid.";
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  };

  const addAllowedIp = () => {
    const raw = ipInput.trim();
    if (!raw) return;

    const values = raw.split(/[,\s]+/).map((v) => v.trim()).filter(Boolean);
    if (values.length === 0) return;

    const invalid = values.find((value) => !isLikelyIp(value));
    if (invalid) {
      setErrors((prev) => ({ ...prev, allowed_ips: `Invalid IP: ${invalid}` }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      allowed_ips: Array.from(new Set([...prev.allowed_ips, ...values])),
    }));
    setErrors((prev) => ({ ...prev, allowed_ips: "" }));
    setIpInput("");
  };

  const removeAllowedIp = (ip: string) => {
    setForm((prev) => ({
      ...prev,
      allowed_ips: prev.allowed_ips.filter((value) => value !== ip),
    }));
  };

  // ---------- SUBMIT FORM ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const payload: any = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role_id: Number(form.roleId),
      };

      if (form.password) payload.password = form.password;
      if (currentUser?.role_id === 1) payload.max_cards = Number(form.max_cards);
      if (currentUser?.role_id === 1) payload.allowed_ips = form.allowed_ips;

      if (isEdit) {
        await api.put(`/users/${id}`, payload);
        navigate("/dashboard/admin-users", { state: { message: "User updated successfully!", type: "success" } });
      } else {
        await api.post("/users", payload);
        navigate("/dashboard/admin-users", { state: { message: "User added successfully!", type: "success" } });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Error saving user";
      navigate("/dashboard/admin-users", { state: { message: msg, type: "error" } });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- RENDER ----------
  return (
    <div className="p-16 border border-gray-200 rounded-2xl dark:border-gray-700 dark:bg-gray-900 shadow-sm max-w-5xl mx-auto w-full">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 px-3 py-2 mb-6 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200 shadow-sm">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      <h1 className="text-2xl font-semibold mb-6 dark:text-gray-200">{isEdit ? "Edit User" : "Add New User"}</h1>

      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* First Name */}
          <div>
            <label className="block mb-1 text-sm font-medium dark:text-gray-300">First Name</label>
            <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${errors.first_name ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"}`} />
            {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
          </div>

          {/* Last Name */}
          <div>
            <label className="block mb-1 text-sm font-medium dark:text-gray-300">Last Name</label>
            <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${errors.last_name ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"}`} />
            {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block mb-1 text-sm font-medium dark:text-gray-300">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${errors.email ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"}`} />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block mb-1 text-sm font-medium dark:text-gray-300">Password {isEdit && "(leave blank to keep unchanged)"}</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${errors.password ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"}`} />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block mb-1 text-sm font-medium dark:text-gray-300">Role</label>
            <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${errors.roleId ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"}`}>
              <option value="">Select role</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            {errors.roleId && <p className="text-red-500 text-sm mt-1">{errors.roleId}</p>}
          </div>

          {currentUser?.role_id === 1 && (
            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium dark:text-gray-300">Allowed IPs (User-wise security)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.allowed_ips.map((ip) => (
                  <span key={ip} className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800">
                    {ip}
                    <button
                      type="button"
                      onClick={() => removeAllowedIp(ip)}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAllowedIp();
                    }
                  }}
                  placeholder="Add IP (e.g. 203.0.113.10)"
                  className="w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addAllowedIp}
                  className="px-4 py-2 rounded-lg border dark:border-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Add
                </button>
              </div>
              {errors.allowed_ips && <p className="text-red-500 text-sm mt-1">{errors.allowed_ips}</p>}
            </div>
          )}

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-8">
          <button type="button" onClick={() => navigate("/dashboard/admin-users")} className="px-5 py-2 rounded-lg border dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
          <button type="submit" disabled={submitting} className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-lg disabled:opacity-50">{submitting ? "Saving..." : "Save User"}</button>
        </div>
      </form>
    </div>
  );
}
