// src/pages/Dashboard/QAForm.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";
import { ArrowLeft } from "lucide-react";

export default function QAForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: "",
    details: "",
    first_option: "",
    second_option: "",
  });

  const [errors, setErrors] = useState({
    title: "",
    details: "",
    first_option: "",
    second_option: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // ✅ Load existing Questionnaire Answer for editing
  useEffect(() => {
    if (isEdit) {
      api
        .get(`/question-answers/${id}`)
        .then((res) => {
          const data = res.data.data || res.data;
          setForm({
            title: data.title || "",
            details: data.details || "",
            first_option: data.first_option || "",
            second_option: data.second_option || "",
          });
        })
        .catch(() => {
          navigate("/dashboard/question-answers", {
            state: {
              message: "Failed to load Questionnaire Answer",
              type: "error",
            },
          });
        });
    }
  }, [id, isEdit, navigate]);

  // ✅ Validate form
  const validateForm = () => {
    let valid = true;
    const newErrors = { title: "", details: "", first_option: "", second_option: "" };

    if (!form.title.trim()) {
      newErrors.title = "Title is required.";
      valid = false;
    }
    if (!form.details.trim()) {
      newErrors.details = "Details are required.";
      valid = false;
    }
    if (!form.first_option.trim()) {
      newErrors.first_option = "First option is required.";
      valid = false;
    }
    if (!form.second_option.trim()) {
      newErrors.second_option = "Second option is required.";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // ✅ Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      if (isEdit) {
        await api.put(`/question-answers/${id}`, form);
        navigate("/dashboard/question-answers", {
          state: {
            message: "Questionnaire Answer updated successfully!",
            type: "success",
          },
        });
      } else {
        await api.post("/question-answers", form);
        navigate("/dashboard/question-answers", {
          state: {
            message: "Questionnaire Answer created successfully!",
            type: "success",
          },
        });
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Something went wrong while saving the Questionnaire Answer";

      navigate("/dashboard/question-answers", {
        state: { message, type: "error" },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10 md:p-16 border border-gray-200 rounded-2xl dark:border-gray-700 dark:bg-gray-900 shadow-sm max-w-4xl mx-auto w-full">
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
        {isEdit ? "Edit Questionnaire Answer" : "Add New Questionnaire Answer"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        {/* Title */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">Title</label>
          <input
            type="text"
            disabled={submitting}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
              errors.title ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
            }`}
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>

        {/* Details */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">Details</label>
          <textarea
            disabled={submitting}
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            rows={4}
            className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
              errors.details ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
            }`}
          />
          {errors.details && <p className="text-red-500 text-sm mt-1">{errors.details}</p>}
        </div>

        {/* First Option */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">
            First Option
          </label>
          <input
            type="text"
            disabled={submitting}
            value={form.first_option}
            onChange={(e) => setForm({ ...form, first_option: e.target.value })}
            className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
              errors.first_option
                ? "focus:ring-red-500 border-red-500"
                : "focus:ring-blue-500"
            }`}
          />
          {errors.first_option && (
            <p className="text-red-500 text-sm mt-1">{errors.first_option}</p>
          )}
        </div>

        {/* Second Option */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">
            Second Option
          </label>
          <input
            type="text"
            disabled={submitting}
            value={form.second_option}
            onChange={(e) => setForm({ ...form, second_option: e.target.value })}
            className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
              errors.second_option
                ? "focus:ring-red-500 border-red-500"
                : "focus:ring-blue-500"
            }`}
          />
          {errors.second_option && (
            <p className="text-red-500 text-sm mt-1">{errors.second_option}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard/question-answers")}
            className="px-5 py-2 rounded-lg border dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-lg disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
