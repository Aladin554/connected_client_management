import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios"; // your axios instance

interface User {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
}

interface Errors {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
}

export default function EditProfile() {
  const [form, setForm] = useState<User>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile");
        setForm({
          first_name: res.data.first_name || "",
          last_name: res.data.last_name || "",
          email: res.data.email || "",
          password: "",
        });
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        alert("Failed to load profile");
      }
    };
    fetchProfile();
  }, []);

  // Live validation
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "first_name":
        if (!value.trim()) return "First name is required";
        break;
      case "last_name":
        if (!value.trim()) return "Last name is required";
        break;
      case "email":
        if (!value.trim()) return "Email is required";
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        if (!emailRegex.test(value)) return "Invalid email address";
        break;
      case "password":
        if (value && value.length < 6) return "Password must be at least 6 characters";
        break;
    }
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Live validate
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields before submit
    const newErrors: Errors = {};
    Object.entries(form).forEach(([key, value]) => {
      const errMsg = validateField(key, value || "");
      if (errMsg) newErrors[key as keyof Errors] = errMsg;
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);

    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password; // do not send empty password
      await api.put("/profile", payload);
      alert("Profile updated successfully!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b3d] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white/10 p-8 rounded-3xl shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Edit Profile</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/** First Name */}
          <div>
            <label className="block mb-1 text-sm">First Name</label>
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg bg-white/20 focus:bg-white/30 outline-none ${
                errors.first_name ? "border-red-500 border" : ""
              }`}
              required
            />
            {errors.first_name && <p className="text-red-400 text-sm mt-1">{errors.first_name}</p>}
          </div>

          {/** Last Name */}
          <div>
            <label className="block mb-1 text-sm">Last Name</label>
            <input
              type="text"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg bg-white/20 focus:bg-white/30 outline-none ${
                errors.last_name ? "border-red-500 border" : ""
              }`}
              required
            />
            {errors.last_name && <p className="text-red-400 text-sm mt-1">{errors.last_name}</p>}
          </div>

          {/** Email */}
          <div>
            <label className="block mb-1 text-sm">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg bg-white/20 focus:bg-white/30 outline-none ${
                errors.email ? "border-red-500 border" : ""
              }`}
              required
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
          </div>

          {/** Password */}
          <div>
            <label className="block mb-1 text-sm">New Password (optional)</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg bg-white/20 focus:bg-white/30 outline-none ${
                errors.password ? "border-red-500 border" : ""
              }`}
              placeholder="Leave blank to keep current"
            />
            {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
          </div>

          {/** Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 transition py-2 rounded-lg font-semibold shadow-md"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 w-full border border-white/40 py-2 rounded-lg font-medium hover:bg-white/20 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
