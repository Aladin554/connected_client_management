// src/pages/Dashboard/AdminCities.tsx
import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface BoardList {
  id: number;
  title: string;
}

interface Board {
  id: number;
  name: string;
  lists?: BoardList[];
}

interface City {
  id: number;
  name: string;
  boards: Board[];
  created_at?: string;
  updated_at?: string;
}

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role?: Role;
  cities?: City[];
  boards?: Board[];
  board_lists?: BoardList[]; // backend uses snake_case
}

export default function AdminCities() {
  const [cities, setCities] = useState<City[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [loading, setLoading] = useState(true);

  // Permission selection
  const [selectedRole, setSelectedRole] = useState<number | "">("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | "">("");
  const [selectedCityIds, setSelectedCityIds] = useState<number[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);

  // City CRUD modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [cityName, setCityName] = useState("");
  const [boardNames, setBoardNames] = useState<string[]>([""]);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCities(), fetchUsers(), fetchRoles()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchCities = async () => {
    try {
      const res = await api.get("/cities");
      setCities(res.data || []);
    } catch {
      toast.error("Failed to load cities");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      const normalized = res.data.map((u: any) => ({
        ...u,
        board_lists: u.board_lists || [],
      }));
      setUsers(normalized);
    } catch {
      toast.error("Failed to load users");
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get("/roles");
      setRoles(res.data || []);
    } catch {
      toast.error("Failed to load roles");
    }
  };

  // Filter users when role changes
  useEffect(() => {
    if (!selectedRole) {
      setFilteredUsers([]);
      setSelectedUser("");
      clearSelections();
      return;
    }
    const matches = users.filter((u) => u.role?.id === selectedRole);
    setFilteredUsers(matches);
    setSelectedUser("");
    clearSelections();
  }, [selectedRole, users]);

  // Load selected user's permissions
  useEffect(() => {
    if (!selectedUser) {
      clearSelections();
      return;
    }
    const user = users.find((u) => u.id === selectedUser);
    if (!user) return;

    setSelectedCityIds(user.cities?.map((c) => c.id) || []);
    setSelectedBoardIds(user.boards?.map((b) => b.id) || []);
    setSelectedListIds(user.board_lists?.map((l) => l.id) || []);
  }, [selectedUser, users]);

  const clearSelections = () => {
    setSelectedCityIds([]);
    setSelectedBoardIds([]);
    setSelectedListIds([]);
  };

  // ── Permission Toggles ───────────────────────────────────────

  const toggleCity = (cityId: number) => {
    setSelectedCityIds((prev) => {
      if (prev.includes(cityId)) {
        const city = cities.find((c) => c.id === cityId);
        if (!city) return prev;

        const boardIds = city.boards.map((b) => b.id);
        const listIds = city.boards.flatMap((b) => b.lists?.map((l) => l.id) || []);

        setSelectedBoardIds((p) => p.filter((id) => !boardIds.includes(id)));
        setSelectedListIds((p) => p.filter((id) => !listIds.includes(id)));

        return prev.filter((id) => id !== cityId);
      }
      return [...prev, cityId];
    });
  };

  const toggleBoard = (boardId: number) => {
    setSelectedBoardIds((prev) => {
      if (prev.includes(boardId)) {
        const board = cities
          .flatMap((c) => c.boards)
          .find((b) => b.id === boardId);
        const listIds = board?.lists?.map((l) => l.id) || [];

        setSelectedListIds((p) => p.filter((id) => !listIds.includes(id)));
        return prev.filter((id) => id !== boardId);
      }

      const board = cities
        .flatMap((c) => c.boards)
        .find((b) => b.id === boardId);
      const listIds = board?.lists?.map((l) => l.id) || [];
      if (listIds.length > 0) {
        setSelectedListIds((p) => [...new Set([...p, ...listIds])]);
      }

      const parentCity = cities.find((c) => c.boards.some((b) => b.id === boardId));
      if (parentCity && !selectedCityIds.includes(parentCity.id)) {
        setSelectedCityIds((p) => [...p, parentCity.id]);
      }

      return [...prev, boardId];
    });
  };

  const toggleList = (listId: number) => {
    setSelectedListIds((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    try {
      await Promise.all([
        api.patch(`/users/${selectedUser}/cities`, { cities: selectedCityIds }),
        api.patch(`/users/${selectedUser}/boards`, { boards: selectedBoardIds }),
        api.patch(`/users/${selectedUser}/lists`, { lists: selectedListIds }),
      ]);
      toast.success("Permissions updated");
      fetchUsers();
    } catch {
      toast.error("Failed to save permissions");
    }
  };

  // ── City CRUD ─────────────────────────────────────────────────

  const openAddCity = () => {
    setEditingCity(null);
    setCityName("");
    setBoardNames([""]);
    setModalOpen(true);
  };

  const openEditCity = (city: City) => {
    setEditingCity(city);
    setCityName(city.name);
    setBoardNames(city.boards.map((b) => b.name));
    setModalOpen(true);
  };

  const saveCity = async () => {
    if (!cityName.trim()) {
      toast.error("City name is required");
      return;
    }

    const validBoards = boardNames.filter((name) => name.trim() !== "");

    try {
      if (editingCity) {
        await api.put(`/cities/${editingCity.id}`, {
          name: cityName.trim(),
          boards: validBoards,
        });
        toast.success("City updated");
      } else {
        await api.post("/cities", {
          name: cityName.trim(),
          boards: validBoards,
        });
        toast.success("City created");
      }
      setModalOpen(false);
      fetchCities();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save city");
    }
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/cities/${deleteId}`);
      toast.success("City deleted");
      fetchCities();
    } catch {
      toast.error("Failed to delete city");
    } finally {
      setDeleteModalOpen(false);
      setDeleteId(null);
    }
  };

  // Board input handlers
  const addBoard = () => {
    setBoardNames((prev) => [...prev, ""]);
  };

  const removeBoard = (index: number) => {
    setBoardNames((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBoard = (index: number, value: string) => {
    setBoardNames((prev) =>
      prev.map((name, i) => (i === index ? value : name))
    );
  };

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : "—");

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading cities & users...</div>;
  }

  return (
    <div className="p-5 lg:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-[1100px] mx-auto">
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Cities & Access Control
        </h1>
        <button
          onClick={openAddCity}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          <Plus size={18} /> New City
        </button>
      </div>

      {/* Permission Assignment Panel */}
      <div className="mb-10 p-5 border rounded-xl bg-gray-50/50 dark:bg-gray-800/40 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Assign Permissions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(Number(e.target.value) || "")}
              className="w-full px-4 py-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select Role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {selectedRole && (
            <div>
              <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300">
                User
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(Number(e.target.value) || "")}
                className="w-full px-4 py-2.5 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select User —</option>
                {filteredUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} • {u.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedUser && (
          <div className="space-y-7">
            {/* Cities */}
            <div>
              <h3 className="font-medium mb-2.5 text-gray-800 dark:text-gray-200">Cities</h3>
              <div className="flex flex-wrap gap-2.5">
                {cities.map((city) => (
                  <label
                    key={city.id}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer text-sm transition-all ${
                      selectedCityIds.includes(city.id)
                        ? "bg-blue-100 border-blue-400 dark:bg-blue-950/50 dark:border-blue-600"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCityIds.includes(city.id)}
                      onChange={() => toggleCity(city.id)}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span className="font-medium">{city.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({city.boards.length})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Boards */}
            {selectedCityIds.length > 0 && (
              <div>
                <h3 className="font-medium mb-2.5 text-gray-800 dark:text-gray-200">Boards</h3>
                {cities
                  .filter((c) => selectedCityIds.includes(c.id))
                  .map((city) => (
                    <div key={city.id} className="mb-5 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {city.name}
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        {city.boards.map((board) => (
                          <label
                            key={board.id}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer text-sm transition-all ${
                              selectedBoardIds.includes(board.id)
                                ? "bg-indigo-100 border-indigo-400 dark:bg-indigo-950/50 dark:border-indigo-600"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedBoardIds.includes(board.id)}
                              onChange={() => toggleBoard(board.id)}
                              className="h-4 w-4 rounded text-indigo-600"
                            />
                            <span>{board.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Lists */}
            {selectedBoardIds.length > 0 && (
              <div>
                <h3 className="font-medium mb-2.5 text-gray-800 dark:text-gray-200">Lists</h3>
                {cities
                  .flatMap((c) => c.boards)
                  .filter((b) => selectedBoardIds.includes(b.id))
                  .map((board) => (
                    <div key={board.id} className="mb-5 pl-8">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        {board.name}
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        {(board.lists || []).map((list) => (
                          <label
                            key={list.id}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer text-sm transition-all ${
                              selectedListIds.includes(list.id)
                                ? "bg-purple-100 border-purple-400 dark:bg-purple-950/50 dark:border-purple-600"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedListIds.includes(list.id)}
                              onChange={() => toggleList(list.id)}
                              className="h-4 w-4 rounded text-purple-600"
                            />
                            <span>{list.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <button
              onClick={savePermissions}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
            >
              Save Permissions
            </button>
          </div>
        )}
      </div>

      {/* Cities Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full bg-white dark:bg-gray-900">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b">
            <tr>
              <th className="px-6 py-4 text-left border-r">City Name</th>
              <th className="px-6 py-4 text-left border-r">Boards</th>
              <th className="px-6 py-4 text-left border-r">Created</th>
              <th className="px-6 py-4 text-left border-r">Updated</th>
              <th className="px-6 py-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {cities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                  No cities found
                </td>
              </tr>
            ) : (
              cities.map((city) => (
                <tr key={city.id} className="border-t">
                  <td className="px-6 py-4 border-r">{city.name}</td>
                  <td className="px-6 py-4 border-r">
                    {city.boards.map((b) => b.name).join(", ") || "—"}
                  </td>
                  <td className="px-6 py-4 border-r">{formatDate(city.created_at)}</td>
                  <td className="px-6 py-4 border-r">{formatDate(city.updated_at)}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => openEditCity(city)}
                      className="p-2 bg-yellow-100 hover:bg-yellow-200 rounded dark:bg-yellow-900/40 dark:hover:bg-yellow-800/60"
                      title="Edit"
                    >
                      <Edit size={16} className="text-yellow-700 dark:text-yellow-400" />
                    </button>
                    <button
                      onClick={() => confirmDelete(city.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 rounded dark:bg-red-900/40 dark:hover:bg-red-800/60"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-red-700 dark:text-red-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit City Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-[420px]">
            <h3 className="text-xl font-bold mb-4">
              {editingCity ? "Edit City" : "Add City"}
            </h3>

            {/* City selection - only shown when adding new */}
            {!editingCity && (
              <select
                value="new"
                onChange={(e) => {
                  if (e.target.value !== "new") {
                    const city = cities.find((c) => c.id === Number(e.target.value));
                    if (city) openEditCity(city);
                  }
                }}
                className="w-full mb-4 px-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="new">Create New City</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {/* City name input */}
            <input
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              className="w-full mb-4 px-4 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              placeholder="City name"
            />

            {/* Boards */}
            <div className="mb-4">
              <p className="font-medium mb-2">Boards</p>
              {boardNames.map((board, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    value={board}
                    onChange={(e) => updateBoard(index, e.target.value)}
                    className="flex-1 px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    placeholder={`Board ${index + 1}`}
                  />
                  {boardNames.length > 1 && (
                    <button
                      onClick={() => removeBoard(index)}
                      className="p-2 bg-red-100 hover:bg-red-200 rounded dark:bg-red-900/40 dark:hover:bg-red-800/50"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addBoard}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-2 flex items-center gap-1"
              >
                <Plus size={14} /> Add Board
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 border py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={saveCity}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Delete this city?<br />
              <span className="text-red-600 font-medium">
                All boards and lists will be permanently removed.
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium"
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
