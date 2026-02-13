// src/pages/Dashboard/AdminBoardForm.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";
import { ArrowLeft } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ---------- TYPES ----------
interface CityOption {
  id: number;
  name: string;
}

interface BoardForm {
  name: string;
  city_id: string;
}

interface Errors {
  name: string;
  city_id: string;
}

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  role?: Role; // Updated to optional Role object
  boards?: { id: number; name: string }[];
}

// ---------- COMPONENT ----------
export default function AdminBoardForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<BoardForm>({ name: "", city_id: "" });
  const [errors, setErrors] = useState<Errors>({ name: "", city_id: "" });

  const [cities, setCities] = useState<CityOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  // ---------- FETCH CITIES & USERS ----------
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoadingCities(true);
        const res = await api.get("/cities");
        const cityList: CityOption[] = (res.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
        }));
        setCities(cityList);
      } catch {
        toast.error("Failed to load cities");
      } finally {
        setLoadingCities(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await api.get("/users");
        const userList: User[] = (res.data || []).map((u: any) => ({
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role, // Keep as object, render .name later
        }));
        setUsers(userList);
      } catch {
        toast.error("Failed to load users");
      }
    };

    fetchCities();
    fetchUsers();
  }, []);

  // ---------- LOAD BOARD IF EDIT ----------
  useEffect(() => {
    if (!isEdit || !id) return;

    const fetchBoard = async () => {
      try {
        const res = await api.get(`/boards/${id}`);
        const board = res.data;

        setForm({
          name: board.name || "",
          city_id: board.city_id ? String(board.city_id) : "",
        });

        if (board.user_id) setSelectedUser(board.user_id);
      } catch {
        toast.error("Failed to load board");
        navigate("/dashboard/admin-boards");
      }
    };

    fetchBoard();
  }, [id, isEdit, navigate]);

  // ---------- VALIDATION ----------
  const validateForm = (): boolean => {
    let valid = true;
    const newErrors: Errors = { name: "", city_id: "" };

    if (!form.name.trim()) {
      newErrors.name = "Board name is required";
      valid = false;
    }
    if (!form.city_id) {
      newErrors.city_id = "Please select a city";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // ---------- SUBMIT ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      city_id: Number(form.city_id),
      user_id: selectedUser || undefined,
    };

    try {
      if (isEdit) {
        await api.put(`/boards/${id}`, payload);
        toast.success("Board updated successfully!");
      } else {
        await api.post("/boards", payload);
        toast.success("Board created successfully!");
      }
      navigate("/dashboard/admin-boards");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save board");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- RENDER ----------
  return (
    <div className="p-16 border border-gray-200 rounded-2xl dark:border-gray-700 dark:bg-gray-900 shadow-sm max-w-4xl mx-auto w-full relative">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="colored" />

      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-3 py-2 mb-6 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      <h1 className="text-2xl font-semibold mb-6 dark:text-gray-200">
        {isEdit ? "Edit Board" : "Add New Board"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Selection */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">Assign User</label>
          <select
            value={selectedUser || ""}
            onChange={(e) => setSelectedUser(Number(e.target.value))}
            className="w-full border px-4 py-3 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select User (optional) --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name} ({user.role?.name || "-"}) {/* ✅ FIX: render role name */}
              </option>
            ))}
          </select>
        </div>

        {/* City Selection */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">
            City <span className="text-red-500">*</span>
          </label>
          {loadingCities ? (
            <div className="text-gray-500">Loading cities...</div>
          ) : (
            <>
              <select
                value={form.city_id}
                onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                className={`w-full border px-4 py-3 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
                  errors.city_id ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                }`}
                disabled={loadingCities}
              >
                <option value="">Select a city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              {errors.city_id && <p className="text-red-500 text-sm mt-1">{errors.city_id}</p>}
            </>
          )}
        </div>

        {/* Board Name */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">
            Board Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`w-full border px-4 py-3 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
              errors.name ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
            }`}
            placeholder="Enter board name"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={() => navigate("/dashboard/admin-boards")}
            className="px-5 py-2 rounded-lg border dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || loadingCities}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-lg disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Board"}
          </button>
        </div>
      </form>
    </div>
  );
}
