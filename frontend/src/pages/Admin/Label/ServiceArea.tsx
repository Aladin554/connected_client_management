import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Edit, Plus, Trash2, X } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface ServiceAreaItem {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

function normalizeCollection(payload: any): ServiceAreaItem[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

export default function ServiceArea() {
  const [items, setItems] = useState<ServiceAreaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Service Area");
  const [form, setForm] = useState<{ id?: number; name: string }>({ name: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  useEffect(() => {
    void fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get("/service-areas");
      setItems(normalizeCollection(res.data));
    } catch {
      toast.error("Failed to fetch service areas");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setForm({ name: "" });
    setFormError("");
    setModalTitle("Add Service Area");
    setIsModalOpen(true);
  };

  const openEditModal = (item: ServiceAreaItem) => {
    setForm({ id: item.id, name: item.name });
    setFormError("");
    setModalTitle("Edit Service Area");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = form.name.trim();
    if (!trimmed) {
      setFormError("Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (form.id) {
        await api.put(`/service-areas/${form.id}`, { name: trimmed });
        toast.success("Service area updated successfully");
      } else {
        await api.post("/service-areas", { name: trimmed });
        toast.success("Service area created successfully");
      }
      setIsModalOpen(false);
      void fetchItems();
    } catch {
      toast.error("Error saving service area");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/service-areas/${deleteTargetId}`);
      toast.success("Service area deleted successfully");
      void fetchItems();
    } catch {
      toast.error("Error deleting service area");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-5 border border-gray-200 rounded-2xl lg:p-6 bg-white relative w-full max-w-[900px] mx-auto">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="colored" />

      <div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Service Area</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white text-base font-medium shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={20} /> Add Service Area
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 bg-white px-4 py-2 rounded-lg text-base text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-base bg-white">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left font-medium text-gray-700 border-r border-gray-200">
                Name
              </th>
              <th className="px-6 py-4 text-left font-medium text-gray-700 border-r border-gray-200">
                Updated
              </th>
              <th className="px-6 py-4 text-left font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-gray-500">
                  No service area found
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 border-r border-gray-200 text-gray-800 font-medium">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 text-gray-700">
                    {item.updated_at ? new Date(item.updated_at).toISOString().split("T")[0] : "-"}
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTargetId(item.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{modalTitle}</h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full border px-3 py-2 rounded-lg text-lg text-gray-800 focus:outline-none focus:ring-2 ${
                    formError ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                  }`}
                />
                {formError && <p className="text-red-500 text-sm mt-1">{formError}</p>}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
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
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Service Area?</h2>
              <p className="text-gray-600">
                Are you sure you want to delete this service area?{" "}
                <span className="font-bold">This action cannot be undone.</span>
              </p>
            </div>
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
