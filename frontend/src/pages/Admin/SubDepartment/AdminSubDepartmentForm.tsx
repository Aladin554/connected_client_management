// src/pages/Dashboard/AdminSubDepartmentForm.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ArrowLeft } from "lucide-react";

interface Industry {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  industry_id: number;
}

interface SubDepartmentFormData {
  industry_id: number | "";
  department_id: number | "";
  name: string;
  details: string;
}

export default function AdminSubDepartmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<SubDepartmentFormData>({
    industry_id: "",
    department_id: "",
    name: "",
    details: "",
  });

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  // Load industries and departments
  useEffect(() => {
    fetchIndustries();
    fetchDepartments();
    if (isEdit) fetchSubDepartment();
  }, [id]);

  useEffect(() => {
    // Filter departments when industry_id changes
    if (formData.industry_id) {
      setFilteredDepartments(
        departments.filter((d) => d.industry_id === Number(formData.industry_id))
      );
    } else {
      setFilteredDepartments([]);
      setFormData((prev) => ({ ...prev, department_id: "" }));
    }
  }, [formData.industry_id, departments]);

  const fetchIndustries = async () => {
    try {
      const res = await api.get("/industry");
      setIndustries(res.data.data || []);
    } catch {
      toast.error("Failed to load industries");
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data.data || []);
    } catch {
      toast.error("Failed to load departments");
    }
  };

  const fetchSubDepartment = async () => {
    try {
      const res = await api.get(`/sub-departments/${id}`);
      const d = res.data.data;
      setFormData({
        industry_id: d.industry_id || "",
        department_id: d.department_id || "",
        name: d.name || "",
        details: d.details || "",
      });
    } catch {
      toast.error("Failed to load department data");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        await api.put(`/sub-departments/${id}`, formData);
        navigate("/dashboard/departments", {
          state: { message: "Department updated successfully!", type: "success" },
        });
      } else {
        await api.post("/sub-departments", formData);
        navigate("/dashboard/departments", {
          state: { message: "Department created successfully!", type: "success" },
        });
      }
    } catch {
      toast.error("Error saving department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border border-gray-200 rounded-2xl dark:border-gray-700 dark:bg-gray-900 max-w-[700px] mx-auto">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-3 py-2 mb-6 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200 shadow-sm"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">
        {isEdit ? "Edit Department" : "Add Department"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Industry */}
        <div>
          <label className="block mb-2 text-gray-700 dark:text-gray-300">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            name="industry_id"
            value={formData.industry_id}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-4 py-2 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Select Industry</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        {/* Department (Category) */}
        <div>
          <label className="block mb-2 text-gray-700 dark:text-gray-300">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="department_id"
            value={formData.department_id}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-4 py-2 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            disabled={!formData.industry_id}
          >
            <option value="">
              {formData.industry_id ? "Select Category" : "Select Industry first"}
            </option>
            {filteredDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label className="block mb-2 text-gray-700 dark:text-gray-300">
            Department Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-4 py-2 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Details */}
        <div>
          <label className="block mb-2 text-gray-700 dark:text-gray-300">
            Details
          </label>
          <textarea
            name="details"
            value={formData.details}
            onChange={handleChange}
            rows={4}
            className="w-full border rounded-lg px-4 py-2 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard/departments")}
            className="px-5 py-2 rounded-lg border dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
