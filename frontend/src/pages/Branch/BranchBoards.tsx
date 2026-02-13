// src/pages/Branch/BranchBoards.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Loader from "../Loader/Loader";

import {
  LayoutGrid,
  Home,
  Users,
  Search,
  Bell,
  HelpCircle,
  Plus,
  Settings,
} from "lucide-react";
import api from "../../api/axios";

interface Board {
  id: number;
  name: string;
  background_gradient?: string; // added - comes from backend
}

export default function BranchBoards() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState<"boards" | "home">("boards");
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [boardTitle, setBoardTitle] = useState("");
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId || isNaN(Number(branchId))) return;

    const fetchBoards = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/boards/branch/${branchId}`);
        setBoards(res.data.data || []);
        setError(null);
      } catch (err) {
        console.error("Failed to load boards:", err);
        setError("Failed to load boards");
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, [branchId]);

  const handleCreateBoard = async () => {
    if (!boardTitle.trim() || !branchId) return;

    try {
      const res = await api.post("/boards", {
        name: boardTitle.trim(),
        branch_id: Number(branchId),
      });

      const newBoard = res.data.data;
      setBoards((prev) => [...prev, newBoard]);
      setBoardTitle("");
      setShowCreateBoard(false);
    } catch (err) {
      console.error("Board creation failed:", err);
      alert("Failed to create board");
    }
  };
if (loading) {
  return <Loader message="Loading boards..." />;
}
  return (
    <div className="h-screen bg-gray-50/70 flex flex-col text-gray-800 selection:bg-blue-100">
      {/* TOP BAR */}
      <header className="h-14 bg-white/80 backdrop-blur-sm border-b border-gray-200/70 flex items-center px-4 gap-4 z-10">
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActivePage("home")}
            className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md flex items-center justify-center text-white font-bold shadow-sm cursor-pointer"
          >
            C
          </div>

          
          <TopbarLink
            label="Home"
            active={false}
            onClick={() => navigate("/user-dashboard")}
          />
        </div>

        <div className="flex-1 flex justify-center px-6">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search boards..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100/70 border border-gray-200 rounded-lg text-[15px] font-medium placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100/60 transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateBoard(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all duration-200"
          >
            <Plus size={16} />
            Create
          </button>

          <IconCircle>
            <HelpCircle size={18} />
          </IconCircle>
          <IconCircle>
            <Bell size={18} />
          </IconCircle>

          <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full cursor-pointer shadow-sm hover:shadow-md transition-shadow" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 bg-white/60 backdrop-blur-md border-r border-gray-200/70 px-3 py-5 hidden md:block overflow-y-auto">
          <div className="space-y-1 mb-8">
            <SidebarItem icon={<LayoutGrid size={18} />} label="Boards" active={activePage === "boards"} onClick={() => setActivePage("boards")} />
            <SidebarItem icon={<Home size={18} />} label="Home" active={activePage === "home"} onClick={() => setActivePage("home")} />
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 mb-3 px-2 uppercase tracking-wide">Workspaces</div>

            <div className="bg-white/80 rounded-xl border border-gray-200/70 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-3.5 py-2.5 border-b bg-gradient-to-r from-gray-50 to-white">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center rounded-lg text-sm font-bold shadow-sm">
                  T
                </div>
                <span className="text-sm font-semibold tracking-tight">Workspace</span>
              </div>

              <div className="py-1">
                <WorkspaceItem icon={<LayoutGrid size={18} />} label="Boards" active onClick={() => setActivePage("boards")} />
                <WorkspaceItem icon={<Users size={18} />} label="Members" onClick={() => navigate("/workspace/members")} />
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 px-6 md:px-12 py-10 overflow-y-auto bg-gradient-to-b from-gray-50/40 to-transparent">
          {activePage === "home" && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/70 backdrop-blur-sm border border-purple-100 rounded-2xl p-10 text-center shadow-lg shadow-purple-100/30">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent mb-3">
                  Organize anything
                </h1>
                <p className="text-gray-600 mb-8 text-base max-w-md mx-auto">
                  Put everything in one place and start moving things forward with your first beautiful board!
                </p>
                <button
                  onClick={() => setShowCreateBoard(true)}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200/40 hover:shadow-xl hover:shadow-blue-300/40 transition-all duration-300"
                >
                  <Plus size={18} />
                  Create your first board
                </button>
                <div className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline underline-offset-4 cursor-pointer transition-colors">
                  Got it! Dismiss
                </div>
              </div>
            </div>
          )}

          {activePage === "boards" && (
            <div className="flex flex-col gap-10 max-w-6xl mx-auto">
              {/* RECENTLY VIEWED */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-[15px] font-semibold text-gray-800">
                  ⏱ Recently viewed
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {boards.slice(0, 2).map((board) => (
                    <Link key={board.id} to={`/boards/${board.id}`}>
                      <BoardCard title={board.name} background_gradient={board.background_gradient} />
                    </Link>
                  ))}

                  
                </div>
              </section>

              {/* WORKSPACES / ALL BOARDS */}
              <section>
                <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase">Your Workspaces</h2>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 text-white rounded flex items-center justify-center font-bold">T</div>
                    <div className="text-lg font-semibold">Workspace</div>
                  </div>

                  <div className="flex gap-2">
                    <WorkspaceButton icon={<LayoutGrid size={16} />} label="Boards" active />
                    <WorkspaceButton icon={<Users size={16} />} label="Members" />
                    <WorkspaceButton icon={<Settings size={16} />} label="Settings" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {loading ? (
                    <>
                      <div className="h-32 rounded-lg bg-gray-100 animate-pulse" />
                      <div className="h-32 rounded-lg bg-gray-100 animate-pulse" />
                      <div className="h-32 rounded-lg bg-gray-100 animate-pulse" />
                    </>
                  ) : boards.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">No boards yet</div>
                  ) : (
                    boards.map((board) => (
                      <Link key={board.id} to={`/boards/${board.id}`}>
                        <BoardCard title={board.name} background_gradient={board.background_gradient} />
                      </Link>
                    ))
                  )}

                  {!loading && (
                    <div
                      onClick={() => setShowCreateBoard(true)}
                      className="h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/70 hover:bg-gray-100 cursor-pointer flex flex-col items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Plus size={24} className="mb-1" />
                      <span className="text-sm font-medium">Create new board</span>
                    </div>
                  )}
                </div>

                <button className="mt-6 px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm font-medium">
                  View all closed boards
                </button>
              </section>
            </div>
          )}
        </main>

        {/* RIGHT PANEL - kept as static for now */}
        {activePage === "home" && (
          <aside className="w-80 bg-white/40 backdrop-blur-md border-l border-gray-200/70 px-6 py-10 hidden lg:block overflow-y-auto">
            <div className="mb-10">
              <h3 className="text-base font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <span className="text-xl">🕒</span> Recently viewed
              </h3>

              <div
                onClick={() => navigate("/boards/1")}
                className="group relative rounded-xl overflow-hidden bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500
                p-4 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                <div className="relative font-semibold text-white text-base">
                  My First Project Board
                </div>
                <div className="relative text-xs text-white/80 mt-1">
                  Workspace • Updated 2h ago
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-4 text-gray-800">
                Quick Actions
              </h3>

              <div className="space-y-1.5">
                <QuickActionItem
                  icon={<Plus size={18} />}
                  label="Create new board"
                  onClick={() => setShowCreateBoard(true)}
                />

                <QuickActionItem
                  icon={<LayoutGrid size={18} />}
                  label="Browse templates"
                  onClick={() => navigate("/templates")}
                />
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* CREATE BOARD MODAL */}
      {showCreateBoard && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">Create board</h2>
                <button
                  onClick={() => setShowCreateBoard(false)}
                  className="text-gray-500 hover:text-gray-800 text-2xl"
                >
                  ×
                </button>
              </div>

              <div
                className="h-40 rounded-xl mb-6 bg-cover bg-center"
                style={{
                  background: boardTitle.trim()
                    ? "ur[](https://images.unsplash.com/photo-1500530855697-b586d89ba3ee)"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              />

              <label className="block text-sm font-semibold mb-2">
                Board title <span className="text-red-500">*</span>
              </label>

              <input
                autoFocus
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                placeholder="Your new board name..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {!boardTitle.trim() && boardTitle !== "" && (
                <p className="text-xs text-red-600 mt-1.5">Board title is required</p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowCreateBoard(false)}
                  className="flex-1 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBoard}
                  disabled={!boardTitle.trim()}
                  className={`flex-1 py-3 rounded-lg font-semibold ${
                    boardTitle.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SUB-COMPONENTS ================= */

function TopbarLink({ label, active = false, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[15px] font-semibold cursor-pointer transition-colors ${
        active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {label}
    </div>
  );
}

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <button className="w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors">
      {children}
    </button>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[15px] font-semibold ${
        active ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100/80 text-gray-700"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function WorkspaceItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 text-[15px] font-semibold cursor-pointer ${
        active ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function WorkspaceButton({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <button
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
        active ? "bg-gray-200 text-gray-900" : "bg-gray-100 hover:bg-gray-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function BoardCard({ title, background_gradient }: { title: string; background_gradient?: string }) {
  const defaultGradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";

  return (
    <div className="group h-36 rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-200">
      <div
        className="h-24 w-full"
        style={{ background: background_gradient || defaultGradient }}
      />
      <div className="p-3 text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate">
        {title}
      </div>
    </div>
  );
}

function QuickActionItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-100/80 text-[15px] font-semibold text-gray-700 cursor-pointer"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
        {icon}
      </div>
      {label}
    </div>
  );
}