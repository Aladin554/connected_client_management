// src/pages/Dashboard/IndustryForm.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";
import { Editor } from "@tinymce/tinymce-react";
import { ArrowLeft } from "lucide-react";


export default function IndustryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: "",
    name: "",
    modal_description: "",
    final_details: "", // <-- added field
    modal_image: null as File | null,
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    title: "",
    name: "",
    modal_description: "",
    final_details: "", // <-- added field
    modal_image: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Load existing Industry for editing
  useEffect(() => {
    if (isEdit) {
      api
        .get(`/industry/${id}`)
        .then((res) => {
          const data = res.data.data || res.data;
          setForm({
            title: data.title || "",
            name: data.name || "",
            modal_description: data.modal_description || "",
            final_details: data.final_details || "", // <-- added field
            modal_image: null,
          });

          if (data.modal_image) {
            const imageUrl = data.modal_image.startsWith("http")
              ? data.modal_image
              : `${import.meta.env.VITE_API_URL}/storage/${data.modal_image}`;
            setPreview(imageUrl);
          }
        })
        .catch(() => {
          // No toast here
        });
    }
  }, [id, isEdit]);

  // Validate form
  const validateForm = () => {
    let valid = true;
    const newErrors = { title: "", name: "", modal_description: "", final_details: "", modal_image: "" };

    if (!form.title.trim()) {
      newErrors.title = "Title is required.";
      valid = false;
    }
    if (!form.name.trim()) {
      newErrors.name = "Modal title is required.";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm({ ...form, modal_image: file });
    if (file) setPreview(URL.createObjectURL(file));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("name", form.name);
      if (form.modal_description) formData.append("modal_description", form.modal_description);
      if (form.final_details) formData.append("final_details", form.final_details); // <-- added field
      if (form.modal_image) formData.append("modal_image", form.modal_image);

      if (isEdit) {
        await api.post(`/industry/${id}?_method=PUT`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        navigate("/dashboard/industry", { state: { message: "Industry updated successfully!", type: "success" } });
      } else {
        await api.post("/industry", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        navigate("/dashboard/industry", { state: { message: "Industry created successfully!", type: "success" } });
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Something went wrong while saving the Industry";
      navigate("/dashboard/industry", { state: { message, type: "error" } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10 md:p-16 border border-gray-200 rounded-2xl dark:border-gray-700 dark:bg-gray-900 shadow-sm max-w-5xl mx-auto w-full">
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
        {isEdit ? "Edit Industry" : "Add New Industry"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        {/* Title using TinyMCE */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">Title</label>
          <Editor
            apiKey="3cpmmfl6xjoq28sx75olwzo4ps8j52qgea6efpx28fz70i0v"
            disabled={submitting}
            value={form.title}
            onEditorChange={(content) => setForm({ ...form, title: content })}
            init={{
              height: 300,
              menubar: true,
              plugins: [
                "advlist autolink lists link image charmap print preview anchor",
                "searchreplace visualblocks code fullscreen",
                "insertdatetime media table paste code help wordcount",
              ],
              toolbar:
                "undo redo | formatselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help",
              skin: "oxide-dark",
              content_css: "dark",
            }}
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
        </div>

        {/* Modal Title */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">Modal Title</label>
          <input
            type="text"
            disabled={submitting}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
              errors.name ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
            }`}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Modal Description */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">Modal Description</label>
          <Editor
            apiKey="3cpmmfl6xjoq28sx75olwzo4ps8j52qgea6efpx28fz70i0v"
            disabled={submitting}
            value={form.modal_description}
            onEditorChange={(content) => setForm({ ...form, modal_description: content })}
            init={{
              height: 300,
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
        </div>

        {/* Final Details */}
        <div>
          <label className="block mb-1 text-sm font-medium dark:text-gray-300">Final Details</label>
          <Editor
            apiKey="3cpmmfl6xjoq28sx75olwzo4ps8j52qgea6efpx28fz70i0v"
            disabled={submitting}
            value={form.final_details}
            onEditorChange={(content) => setForm({ ...form, final_details: content })}
            init={{
              height: 200,
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
        </div>

        {/* Image Upload */}
        <div>
  <label className="block mb-1 text-sm font-medium dark:text-gray-300">
    Modal Image
    <span className="block text-xs text-red-500 dark:text-gray-500">
      Required size: 624 × 192 px
    </span>
  </label>

  <input
    type="file"
    accept="image/*"
    onChange={handleFileChange}
    disabled={submitting}
    className="block w-full text-gray-300 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700"
  />

  {preview && (
    <div className="mt-3 w-full max-w-sm">
      <div className="w-full aspect-[13/4] overflow-hidden rounded-lg border dark:border-gray-600 bg-gray-100">
        <img
          src={preview}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      </div>
      
    </div>
  )}

  {errors.modal_image && (
    <p className="text-red-500 text-sm mt-1">{errors.modal_image}</p>
  )}
</div>


        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard/industry")}
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
