// src/pages/Dashboard/DepartmentForm.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";
import { ArrowLeft } from "lucide-react";


interface DepartmentFormData {
  name: string;
  details: string;
}

interface DepartmentFormErrors {
  name: string;
  details: string;
}

export default function DepartmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<DepartmentFormData>({
    name: "",
    details: "",
  });

  const [errors, setErrors] = useState<DepartmentFormErrors>({ name: "", details: "" });
  const [submitting, setSubmitting] = useState(false);

  // Fetch existing data if editing
  useEffect(() => {
    if (isEdit) {
      api
        .get(`/common-departments/${id}`)
        .then((res) => {
          const d = res.data.data || res.data;
          setForm({ name: d.name, details: d.details || "" });
        })
        .catch(() => alert("Failed to load department"));
    }
  }, [id, isEdit]);

  // Simple validation
  const validateForm = () => {
    let valid = true;
    const newErrors: DepartmentFormErrors = { name: "", details: "" };

    if (!form.name.trim()) {
      newErrors.name = "Name is required.";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/common-departments/${id}`, form);
        navigate("/dashboard/common-departments", {
          state: { message: "Common Department updated successfully!", type: "success" },
        });
      } else {
        await api.post("/common-departments", form);
        navigate("/dashboard/common-departments", {
          state: { message: "Common Department created successfully!", type: "success" },
        });
      }
    } catch {
      navigate("/dashboard/common-departments", {
        state: { message: "Error saving common department", type: "error" },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10 border border-gray-200 rounded-2xl dark:border-gray-700 dark:bg-gray-900 max-w-4xl mx-auto">
      <button
  type="button"
  onClick={() => navigate(-1)}
  className="inline-flex items-center gap-2 px-3 py-2 mb-6 
             rounded-xl border border-gray-300 dark:border-gray-700
             text-gray-700 dark:text-gray-300
             hover:bg-gray-100 dark:hover:bg-gray-800
             hover:border-gray-400 dark:hover:border-gray-600
             transition-all duration-200 shadow-sm"
>
  <ArrowLeft className="w-5 h-5" />
  <span className="font-medium">Back</span>
</button>

      <h1 className="text-2xl font-semibold mb-6 dark:text-gray-200">
        {isEdit ? "Edit Common Department" : "Add Common Department"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
              errors.name ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
            }`}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Details */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">Details</label>
          <textarea
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
              errors.details ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
            }`}
            rows={6}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard/common-departments")}
            className="px-5 py-2 rounded-lg border dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
