// AdminUsers.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios.ts";
import { Trash2, Edit, Plus } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getMeCached } from "../../utils/me";

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
  role?: Role;
  can_create_users: number | string;     // 0 or 1
  panel_permission: number | string;     // ← NEW: 0 or 1             // already existed in your code
  created_at?: string;
  updated_at?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "2" | "3" | "4">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const navigate = useNavigate();
  const location = useLocation();
  const canShowAddUserButton =
    currentUser?.role_id === 1 ||
    (currentUser?.role_id === 2 && Number(currentUser?.can_create_users) === 1);

  // Toast from navigation state
  useEffect(() => {
    if (location.state?.message) {
      const type = location.state.type || "success";
      // @ts-ignore
      toast[type](location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Fetch logged-in user
  useEffect(() => {
    getMeCached()
      .then((me) => setCurrentUser(me as any))
      .catch(() => setCurrentUser(null));
  }, []);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const applyServerUpdate = (userId: number, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
  };

  // Toggle can_create_users
  const togglePermission = async (user: User) => {
    if (currentUser?.id === user.id) {
      toast.error("You cannot change your own permissions!");
      return;
    }

    const oldVal = user.can_create_users;
    const optimistic = oldVal === 1 ? 0 : 1;

    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, can_create_users: optimistic } : u))
    );

    try {
      const res = await api.patch(`/users/${user.id}/toggle-permission`);
      const body = res.data ?? {};

      if (body.user || body.id) {
        applyServerUpdate(user.id, body.user ?? body);
      } else if (body.hasOwnProperty("can_create_users")) {
        applyServerUpdate(user.id, { can_create_users: body.can_create_users });
      } else {
        fetchUsers();
      }

      const finalValue = body.can_create_users ?? body.user?.can_create_users;
      toast.success(`Permission: ${finalValue === 1 ? "Active" : "Inactive"}`);
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, can_create_users: oldVal } : u))
      );
      toast.error(err?.response?.data?.message || "Failed to update permission");
      if (err?.response?.status === 403) {
        toast.warn("You don't have permission to do this.");
      }
    }
  };

  // NEW: Toggle panel_permission
  const togglePanelPermission = async (user: User) => {
    if (currentUser?.id === user.id) {
      toast.error("You cannot change your own panel permission!");
      return;
    }

    // Optional: restrict to super-admins (role_id === 1)
    if (currentUser?.role_id !== 1) {
      toast.warn("Only super administrators can modify panel permission.");
      return;
    }

    const oldVal = user.panel_permission ?? 0;
    const optimistic = oldVal === 1 ? 0 : 1;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, panel_permission: optimistic } : u
      )
    );

    try {
      // You can either:
      // A) Use a dedicated endpoint
      // const res = await api.patch(`/users/${user.id}/toggle-panel-permission`);

      // B) Reuse generic toggle (recommended if backend supports it)
      const res = await api.patch(`/users/${user.id}/toggle-permission`, {
        field: "panel_permission",
      });

      const body = res.data ?? {};

      let finalValue: number;

      if (body.panel_permission !== undefined) {
        finalValue = body.panel_permission;
      } else if (body.user?.panel_permission !== undefined) {
        finalValue = body.user.panel_permission;
        applyServerUpdate(user.id, body.user);
      } else {
        finalValue = optimistic;
      }

      toast.success(`Panel Permission: ${finalValue === 1 ? "Allowed" : "Blocked"}`);
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, panel_permission: oldVal } : u
        )
      );
      toast.error(
        err?.response?.data?.message || "Failed to update panel permission"
      );
      if (err?.response?.status === 403) {
        toast.warn("You don't have permission to change this setting.");
      }
    }
  };

  const togglePanelStatus = async (user: User) => {
    if (currentUser?.id === user.id) {
      toast.error("You cannot change your own panel status!");
      return;
    }

    const oldVal = user.panel_permission ?? 0;
    const optimistic = oldVal === 1 ? 0 : 1;

    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, panel_permission: optimistic } : u))
    );

    try {
      const res = await api.patch(`/users/${user.id}/toggle-panel-status`);
      const body = res.data ?? {};

      if (body.user || body.id) {
        applyServerUpdate(user.id, body.user ?? body);
      } else if (body.hasOwnProperty("panel_permission")) {
        applyServerUpdate(user.id, { panel_permission: body.panel_permission });
      } else {
        fetchUsers();
      }

      const finalValue = body.panel_permission ?? body.user?.panel_permission;
      toast.success(`Panel Status: ${finalValue === 1 ? "Active" : "Inactive"}`);
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, panel_permission: oldVal } : u))
      );
      toast.error(err?.response?.data?.message || "Failed to update panel status");
    }
  };

  const confirmDelete = (id: number) => {
    if (currentUser?.id === id) {
      toast.error("You cannot delete yourself!");
      return;
    }
    setDeleteUserId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    try {
      await api.delete(`/users/${deleteUserId}`);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error deleting user");
    } finally {
      setIsModalOpen(false);
      setDeleteUserId(null);
    }
  };

  const openEditForm = (user: User) => {
    navigate(`/dashboard/admin-users/${user.id}/edit`);
  };

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelected(!selectAll ? users.map((u) => u.id) : []);
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const formatDate = (dateString?: string) =>
    !dateString ? "-" : new Date(dateString).toISOString().split("T")[0];

  const filteredData = users
    .filter((u) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
      const email = u.email.toLowerCase();
      const role = u.role?.name.toLowerCase() || "";
      return fullName.includes(term) || email.includes(term) || role.includes(term);
    })
    .filter((u) => {
      if (roleFilter === "all") return true;
      return Number(u.role_id) === Number(roleFilter);
    })
    .sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0;
      return sortOrder === "asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / perPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-700 lg:p-6 dark:bg-gray-900 bg-white relative w-full max-w-[900px] mx-auto">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme="colored" />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-5 gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 text-center sm:text-left">
          Admin User List
        </h1>
        {canShowAddUserButton ? (
          <Link
            to="/dashboard/admin-users/add"
            className="flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white text-base font-medium shadow-sm hover:bg-blue-700 transition-all"
          >
            <Plus size={20} /> Add User
          </Link>
        ) : null}
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between mb-4 gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-base">
          <span>Show</span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-7 py-2 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search by name, email, role..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-7 py-2 rounded-lg text-base placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "2" | "3" | "4")}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-8 py-2 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="2">Role 2</option>
            <option value="3">Role 3</option>
            <option value="4">Role 4</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-6 py-2 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="asc">Oldest First</option>
            <option value="desc">Newest First</option>
          </select>
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full table-auto text-base bg-white dark:bg-gray-900">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-5 py-3 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                User
              </th>
              <th className="px-5 py-3 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                Role
              </th>
              {currentUser?.role_id === 1 && (
                <>
                  <th className="px-5 py-3 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                    AddUser
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                    Panel Permission
                  </th>
                </>
              )}
              <th className="px-5 py-3 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                Created
              </th>
              <th className="px-5 py-3 text-left font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                Updated
              </th>
              <th className="px-5 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-500 dark:text-gray-400">
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
                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {user.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                    {user.role?.name || "-"}
                  </td>

                  {currentUser?.role_id === 1 && (
                    <>
                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => togglePermission(user)}
                          className={`px-3 py-1.5 rounded text-white text-sm font-medium transition ${
                            user.can_create_users === 1
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {user.can_create_users === 1 ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => togglePanelPermission(user)}
                          className={`px-3 py-1.5 rounded text-white text-sm font-medium transition ${
                            user.panel_permission === 1
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-rose-600 hover:bg-rose-700"
                          }`}
                        >
                          {user.panel_permission === 1 ? "Allowed" : "Blocked"}
                        </button>
                      </td>
                    </>
                  )}

                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                    {formatDate(user.updated_at)}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => openEditForm(user)}
                      className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition"
                      aria-label="Edit user"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => confirmDelete(user.id)}
                      className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                      aria-label="Delete user"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-4">
        {paginatedData.map((user) => (
          <div
            key={user.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(user.id)}
                  onChange={() => toggleSelect(user.id)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Role: {user.role?.name || "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {currentUser?.role_id === 1 && (
                <>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Permission:</span>
                    <button
                      onClick={() => togglePermission(user)}
                      className={`ml-2 px-2 py-1 rounded text-white text-xs font-medium ${
                        user.can_create_users === 1 ? "bg-green-600" : "bg-red-600"
                      }`}
                    >
                      {user.can_create_users === 1 ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Panel Perm:</span>
                    <button
                      onClick={() => togglePanelPermission(user)}
                      className={`ml-2 px-2 py-1 rounded text-white text-xs font-medium ${
                        user.panel_permission === 1 ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                    >
                      {user.panel_permission === 1 ? "Allowed" : "Blocked"}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => openEditForm(user)}
                className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => confirmDelete(user.id)}
                className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-6 text-sm text-gray-700 dark:text-gray-300">
        <div>
          Showing {(currentPage - 1) * perPage + 1} to{" "}
          {Math.min(currentPage * perPage, totalRows)} of {totalRows} entries
        </div>
        <div className="flex gap-1 mt-3 md:mt-0">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Previous
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg transition ${
                currentPage === i + 1
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* DELETE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="text-red-600 dark:text-red-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete User?</h3>
              <p className="text-gray-600 dark:text-gray-400">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
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
