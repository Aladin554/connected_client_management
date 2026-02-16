import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, Save, User } from "lucide-react";
import api from "../../api/axios";

interface UserProfileForm {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
}

export default function EditProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState<UserProfileForm>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
        setFeedback("Could not load profile. Please try again.");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const initials = useMemo(() => {
    const first = form.first_name?.trim().charAt(0) || "";
    const last = form.last_name?.trim().charAt(0) || "";
    return `${first}${last}`.toUpperCase() || "U";
  }, [form.first_name, form.last_name]);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "first_name":
        if (!value.trim()) return "First name is required";
        return "";
      case "last_name":
        if (!value.trim()) return "Last name is required";
        return "";
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
          return "Invalid email address";
        }
        return "";
      case "password":
        if (value && value.length < 6) return "Password must be at least 6 characters";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    if (feedback) setFeedback(null);
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    const firstNameError = validateField("first_name", form.first_name || "");
    const lastNameError = validateField("last_name", form.last_name || "");
    const emailError = validateField("email", form.email || "");
    const passwordError = validateField("password", form.password || "");

    if (firstNameError) nextErrors.first_name = firstNameError;
    if (lastNameError) nextErrors.last_name = lastNameError;
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setFeedback(null);

    try {
      const payload: UserProfileForm = { ...form };
      if (!payload.password) delete payload.password;

      await api.put("/profile", payload);

      const userRaw = sessionStorage.getItem("user");
      if (userRaw) {
        try {
          const user = JSON.parse(userRaw);
          user.first_name = payload.first_name;
          user.last_name = payload.last_name;
          user.email = payload.email;
          sessionStorage.setItem("user", JSON.stringify(user));
        } catch {
          // Ignore parse issues and keep session moving.
        }
      }

      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("Profile update failed:", err);
      setFeedback(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e7ecff_0%,_#edf1f8_40%,_#f3f4f6_100%)] px-4 py-8 text-gray-900 md:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-200 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-300"
        >
          <ArrowLeft size={16} />
          Back To Home
        </button>

        <div className="overflow-hidden rounded-3xl border border-gray-300 bg-gray-100 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
            <aside className="bg-gradient-to-br from-[#d8dbe8] via-[#cfd6e8] to-[#bcc8de] p-6 text-gray-900 md:p-8">
              <div className="flex flex-col items-start gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gray-200 text-2xl font-bold text-gray-900">
                  {initials}
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-700">Profile Settings</p>
                  <h1 className="mt-1 text-2xl font-semibold leading-tight">
                    {form.first_name || "Your"} {form.last_name || "Account"}
                  </h1>
                  <p className="mt-2 text-sm text-gray-800">{form.email || "No email loaded"}</p>
                </div>
              </div>
            </aside>

            <section className="bg-gray-100 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
              <p className="mt-1 text-sm text-gray-600">
                Update your basic account information and optional password.
              </p>

              {feedback && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {feedback}
                </div>
              )}

              {initialLoading ? (
                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">
                  Loading profile...
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field
                      label="First Name"
                      name="first_name"
                      value={form.first_name}
                      error={errors.first_name}
                      onChange={handleChange}
                      icon={<User size={16} />}
                    />
                    <Field
                      label="Last Name"
                      name="last_name"
                      value={form.last_name}
                      error={errors.last_name}
                      onChange={handleChange}
                      icon={<User size={16} />}
                    />
                  </div>

                  <Field
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    error={errors.email}
                    onChange={handleChange}
                    icon={<Mail size={16} />}
                  />

                  <Field
                    label="New Password (Optional)"
                    name="password"
                    type="password"
                    value={form.password || ""}
                    error={errors.password}
                    onChange={handleChange}
                    placeholder="Leave blank to keep current password"
                    icon={<Lock size={16} />}
                  />

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-400 bg-gray-200 px-5 text-sm font-semibold text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300"
                    >
                      <Save size={16} />
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/", { replace: true })}
                      className="h-11 rounded-xl border border-gray-400 bg-gray-200 px-5 text-sm font-semibold text-gray-800 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  error,
  onChange,
  type = "text",
  placeholder,
  icon,
}: {
  label: string;
  name: string;
  value: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>
      <div
        className={`flex h-11 items-center gap-2 rounded-xl border bg-gray-50 px-3 transition ${
          error ? "border-red-400" : "border-gray-300 focus-within:border-[#af4687]"
        }`}
      >
        {icon && <span className="text-gray-500">{icon}</span>}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-500 outline-none"
          autoComplete="off"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
