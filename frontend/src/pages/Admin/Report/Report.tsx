// src/pages/Dashboard/Report.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios.ts";
import { Eye } from "lucide-react";

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  report_status: number;
  role?: Role;
  created_at?: string;
  updated_at?: string;
}

export default function Report() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(25); // ← Default 25
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/reports");
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: number) => {
    navigate(`/dashboard/reports/${id}`);
  };

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelected(!selectAll ? users.map((u) => u.id) : []);
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const formatDate = (dateString?: string) =>
    !dateString ? "-" : new Date(dateString).toISOString().split("T")[0];

  const filteredData = users.filter(
    (u) =>
      `${u.first_name} ${u.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.role?.name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / perPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-700 lg:p-6 dark:bg-gray-900 bg-white relative w-full max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 text-center sm:text-left">
          Users Report List
        </h1>
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
          placeholder="Search by name, email, or role..."
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
                User
              </th>
              <th className="px-6 py-4 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                Role
              </th>
              <th className="px-6 py-4 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                Data Entry
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
                  No users found
                </td>
              </tr>
            ) : (
              paginatedData.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <td className="text-center py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {user.role?.name || "-"}
                  </td>
                  {/* ← Your original badge code preserved exactly */}
                  <td className="px-6 py-4 border-r text-left">
                    {user.report_status ? (
                      <span
                        className={`px-2 py-1 rounded-full text-sm font-semibold ${
                          user.report_status === 1
                            ? "bg-blue-100 text-blue-800"
                            : user.report_status === 2
                            ? "bg-yellow-100 text-yellow-800"
                            : user.report_status === 3
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.report_status}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-500">-</span>
                    )}
                  </td>
                  {/* ← End of preserved code */}
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {formatDate(user.updated_at)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleView(user.id)}
                      className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                      aria-label="View report"
                    >
                      <Eye size={18} />
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
            No users found
          </div>
        ) : (
          paginatedData.map((user) => (
            <div
              key={user.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(user.id)}
                    onChange={() => toggleSelect(user.id)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Role: <span className="font-medium">{user.role?.name || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Data Entry Status:</span>
                {/* Same original badge logic in mobile */}
                {user.report_status ? (
                  <span
                    className={`ml-2 inline-block px-2 py-1 rounded-full text-sm font-semibold ${
                      user.report_status === 1
                        ? "bg-blue-100 text-blue-800"
                        : user.report_status === 2
                        ? "bg-yellow-100 text-yellow-800"
                        : user.report_status === 3
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.report_status}
                  </span>
                ) : (
                  <span className="ml-2 inline-block px-2 py-1 rounded-full text-sm bg-gray-100 text-gray-500">-</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Created:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">
                    {formatDate(user.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Updated:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">
                    {formatDate(user.updated_at)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => handleView(user.id)}
                  className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                >
                  <Eye size={18} />
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
    </div>
  );
}