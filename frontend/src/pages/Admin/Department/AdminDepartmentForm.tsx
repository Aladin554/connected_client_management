// src/pages/Dashboard/AdminDepartmentForm.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";
import { Editor } from "@tinymce/tinymce-react";
import { ArrowLeft } from "lucide-react";

interface Industry {
  id: number;
  name: string;
}

interface DepartmentForm {
  name: string;
  details: string;
  industry_id?: number | string; // Allow string for placeholder
}

interface DepartmentErrors {
  name: string;
  details: string;
  industry_id: string;
}

export default function AdminDepartmentForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<DepartmentForm>({
    name: "",
    details: "",
    industry_id: "",
  });

  const [errors, setErrors] = useState<DepartmentErrors>({
    name: "",
    details: "",
    industry_id: "",
  });

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch industries
  useEffect(() => {
    api
      .get("/industry")
      .then((res) => {
        setIndustries(res.data.data || res.data || []);
      })
      .catch(() => {
        console.error("Failed to load industries");
      })
      .finally(() => {
        setLoadingIndustries(false);
      });
  }, []);

  // Fetch department data if editing
  useEffect(() => {
    if (isEdit && id) {
      api
        .get(`/departments/${id}`)
        .then((res) => {
          const d = res.data.data || res.data;
          setForm({
            name: d.name || "",
            details: d.details || "",
            industry_id: d.industry_id || "",
          });
        })
        .catch(() => alert("Failed to load department"));
    }
  }, [id, isEdit]);

  // Validation
  const validateForm = () => {
    let valid = true;
    const newErrors: DepartmentErrors = {
      name: "",
      details: "",
      industry_id: "",
    };

    if (!form.name.trim()) {
      newErrors.name = "Department name is required.";
      valid = false;
    }
    if (!form.details.trim()) {
      newErrors.details = "Details are required.";
      valid = false;
    }
    if (!form.industry_id || form.industry_id === "") {
      newErrors.industry_id = "Please select an industry.";
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
      const payload = {
        name: form.name,
        details: form.details,
        industry_id: Number(form.industry_id),
      };

      if (isEdit && id) {
        await api.put(`/departments/${id}`, payload);
        navigate("/dashboard/categories", {
          state: { message: "Category updated successfully!", type: "success" },
        });
      } else {
        await api.post("/departments", payload);
        navigate("/dashboard/categories", {
          state: { message: "Category added successfully!", type: "success" },
        });
      }
    } catch (err: any) {
      console.error(err);
      navigate("/dashboard/categories", {
        state: { message: "Error saving category", type: "error" },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10 border border-gray-200 rounded-2xl dark:border-gray-700 dark:bg-gray-900 max-w-4xl mx-auto">
      {/* Back Button */}
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
        {isEdit ? "Edit Category" : "Add Category"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Industry Select */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">
            Industry <span className="text-red-500">*</span>
          </label>
          <select
            value={form.industry_id}
            onChange={(e) =>
              setForm({ ...form, industry_id: e.target.value })
            }
            disabled={loadingIndustries || submitting}
            className={`w-full border px-3 py-2.5 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
              errors.industry_id
                ? "border-red-500 focus:ring-red-500"
                : "focus:ring-blue-500"
            }`}
          >
            <option value="">
              {loadingIndustries ? "Loading industries..." : "Select Industry"}
            </option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
          {errors.industry_id && (
            <p className="text-red-500 text-sm mt-1">{errors.industry_id}</p>
          )}
        </div>

        {/* Department Name */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">
            Category Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={submitting}
            className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
              errors.name
                ? "border-red-500 focus:ring-red-500"
                : "focus:ring-blue-500"
            }`}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Details (TinyMCE Editor) */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">
            Details <span className="text-red-500">*</span>
          </label>
          <Editor
            apiKey="3cpmmfl6xjoq28sx75olwzo4ps8j52qgea6efpx28fz70i0v"
            disabled={submitting}
            value={form.details}
            onEditorChange={(content) => setForm({ ...form, details: content })}
            init={{
              height: 350,
              menubar: true,
              plugins: [
                "advlist autolink lists link image charmap print preview anchor",
                "searchreplace visualblocks code fullscreen",
                "insertdatetime media table paste code help wordcount",
              ],
              toolbar:
                "undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help",
              skin: "oxide-dark",
              content_css: "dark",
            }}
          />
          {errors.details && (
            <p className="text-red-500 text-sm mt-1">{errors.details}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard/categories")}
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg border dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || loadingIndustries}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {submitting ? (
              <>Saving...</>
            ) : (
              <>
                <span>Save Category</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}