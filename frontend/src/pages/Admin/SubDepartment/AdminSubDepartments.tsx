// src/pages/Dashboard/AdminSubDepartments.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../../../api/axios";
import { Trash2, Edit, Plus } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Industry {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

interface SubDepartment {
  id: number;
  industry?: Industry;
  department?: Department;
  name: string;
  details?: string;
  created_at?: string;
  updated_at?: string;
}

export default function AdminSubDepartments() {
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(25); // ← Default 25
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Toast from navigation state
  useEffect(() => {
    if (location.state?.message) {
      const type = location.state.type || "success";
      toast[type === "error" ? "error" : "success"](location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    fetchSubDepartments();
  }, []);

  const fetchSubDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/sub-departments");
      setSubDepartments(res.data.data || res.data || []);
    } catch {
      toast.error("Failed to fetch sub-departments");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;

    try {
      await api.delete(`/sub-departments/${deleteTargetId}`);
      toast.success("Sub-department deleted successfully");
      fetchSubDepartments();
    } catch {
      toast.error("Error deleting sub-department");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  const openEditForm = (subDept: SubDepartment) => {
    navigate(`/dashboard/departments/${subDept.id}/edit`);
  };

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelected(!selectAll ? subDepartments.map((s) => s.id) : []);
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };
const getPageNumbers = () => {
  const pages: (number | string)[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);

    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("...");

    pages.push(totalPages);
  }

  return pages;
};

  const formatDate = (date?: string) =>
    date ? new Date(date).toISOString().split("T")[0] : "-";

  const filteredData = subDepartments.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.department?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.industry?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / perPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-700 lg:p-6 dark:bg-gray-900 bg-white relative w-full max-w-[900px] mx-auto">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="colored" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 text-center sm:text-left">
          Departments List
        </h1>
        <Link
          to="/dashboard/departments/add"
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white text-base font-medium shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={20} /> Add Department
        </Link>
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
          placeholder="Search by name, department, or industry..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg text-base placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
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
                Category
              </th>
              <th className="px-6 py-4 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                Industry
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
                <td colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No sub-departments found
                </td>
              </tr>
            ) : (
              paginatedData.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <td className="text-center py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium">
                    {s.name}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {s.department?.name || "-"}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {s.industry?.name || "-"}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {formatDate(s.created_at)}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {formatDate(s.updated_at)}
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    <button
                      onClick={() => openEditForm(s)}
                      className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition"
                      aria-label="Edit sub-department"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTargetId(s.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                      aria-label="Delete sub-department"
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No sub-departments found
          </div>
        ) : (
          paginatedData.map((s) => (
            <div
              key={s.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                      {s.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Department: <span className="font-medium">{s.department?.name || "-"}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Industry: <span className="font-medium">{s.industry?.name || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Created:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">
                    {formatDate(s.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Updated:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">
                    {formatDate(s.updated_at)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => openEditForm(s)}
                  className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => {
                    setDeleteTargetId(s.id);
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-6 text-sm text-gray-700 dark:text-gray-300">
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
          {getPageNumbers().map((item, index) =>
            item === "..." ? (
              <span
                key={index}
                className="px-3 py-2 text-gray-500 dark:text-gray-400"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                onClick={() => setCurrentPage(item as number)}
                className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg transition ${
                  item === currentPage
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Delete Sub-Department?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this sub-department?{" "}
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