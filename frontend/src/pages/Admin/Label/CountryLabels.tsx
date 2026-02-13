// src/pages/Dashboard/CountryLabels.tsx
import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Trash2, Edit, Plus, X } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface CountryLabel {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export default function CountryLabels() {
  const [labels, setLabels] = useState<CountryLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Country Label");
  const [form, setForm] = useState<{ id?: number; name: string }>({ name: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Fetch labels
  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      setLoading(true);
      const res = await api.get("/country-labels");
      setLabels(res.data.data || res.data || []);
    } catch {
      toast.error("Failed to fetch country labels");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setForm({ name: "" });
    setFormError("");
    setModalTitle("Add Country Label");
    setIsModalOpen(true);
  };

  const openEditModal = (label: CountryLabel) => {
    setForm({ id: label.id, name: label.name });
    setFormError("");
    setModalTitle("Edit Country Label");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (form.id) {
        await api.put(`/country-labels/${form.id}`, { name: form.name });
        toast.success("Country label updated successfully!");
      } else {
        await api.post("/country-labels", { name: form.name });
        toast.success("Country label created successfully!");
      }
      setIsModalOpen(false);
      fetchLabels();
    } catch {
      toast.error("Error saving country label");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/country-labels/${deleteTargetId}`);
      toast.success("Country label deleted successfully");
      fetchLabels();
    } catch {
      toast.error("Error deleting country label");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelected(!selectAll ? labels.map((l) => l.id) : []);
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const formatDate = (date?: string) => (date ? new Date(date).toISOString().split("T")[0] : "-");

  const filteredData = labels.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));
  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / perPage);
  const paginatedData = filteredData.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-700 lg:p-6 dark:bg-gray-900 bg-white relative w-full max-w-[900px] mx-auto">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="colored" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Country Labels
        </h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white text-base font-medium shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={20} /> Add Country Label
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between mb-4 gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-base">
          <span>Show</span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-6 py-2 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>

        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg text-base placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-base bg-white dark:bg-gray-900">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="w-14 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-4 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                Name
              </th>
              <th className="px-6 py-4 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                Created
              </th>
              <th className="px-6 py-4 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                Updated
              </th>
              <th className="px-6 py-4 text-left font-medium text-gray-700 dark:text-gray-300">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No country labels found
                </td>
              </tr>
            ) : (
              paginatedData.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <td className="text-center py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(l.id)}
                      onChange={() => toggleSelect(l.id)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium">
                    {l.name}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {formatDate(l.created_at)}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {formatDate(l.updated_at)}
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    <button
                      onClick={() => openEditModal(l)}
                      className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTargetId(l.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition"
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

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6 text-sm text-gray-700 dark:text-gray-300">
        <div>
          Showing {totalRows === 0 ? 0 : (currentPage - 1) * perPage + 1} to{" "}
          {Math.min(currentPage * perPage, totalRows)} of {totalRows} entries
        </div>
        <div className="flex gap-1 mt-3 md:mt-0">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => setCurrentPage(num)}
              className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg transition ${
                num === currentPage
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{modalTitle}</h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium dark:text-gray-300">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full border px-3 py-2 rounded-lg text-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 ${
                    formError ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
                  }`}
                />
                {formError && <p className="text-red-500 text-sm mt-1">{formError}</p>}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Delete Country Label?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this country label?{" "}
                <span className="font-bold">This action cannot be undone.</span>
              </p>
            </div>
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
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
