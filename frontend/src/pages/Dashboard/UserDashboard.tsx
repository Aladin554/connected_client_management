import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Loader from "../Loader/Loader";
import {
  LayoutGrid,
  Home,
  Users,
  Search,
  Bell,
  HelpCircle,
  Settings,
} from "lucide-react";
import api from "../../api/axios";
import { getMeCached } from "../../utils/me";

/* ================= TYPES ================= */

interface Board {
  id: number;
  name: string;
  background_gradient?: string;
}

interface City {
  id: number;
  name: string;
  boards: Board[];
}

interface Profile {
  first_name?: string | null;
}

/* ================= COMPONENT ================= */

export default function UserDashboard() {
  const navigate = useNavigate();

  const [cities, setCities] = useState<City[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const [citiesRes, me] = await Promise.all([api.get("/cities"), getMeCached()]);
        setCities(citiesRes.data || []);
        setProfile(me as any);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return <Loader message="Loading dashboard..." />;
  }

  return (
    <div className="h-screen bg-gray-50/70 flex flex-col text-gray-800">
      {/* ================= TOP BAR ================= */}
      <header className="h-14 bg-white/80 backdrop-blur-sm border-b flex items-center px-4 gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="h-8 flex items-center cursor-pointer">
            <img
              src="/images/logo/connected_logo.png"
              alt="Connected Logo"
              className="h-8 w-auto object-contain"
            />
          </div>
          {/* <TopbarLink
            label="Home"
            active={false}
            onClick={() => navigate("/user-dashboard")}
          /> */}
        </div>

        <div className="flex-1 flex justify-center px-6">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search boards..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100/70 border rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-200 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* <IconCircle><HelpCircle size={18} /></IconCircle>
          <IconCircle><Bell size={18} /></IconCircle> */}
          <div className="h-8 px-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold flex items-center justify-center shadow-sm">
            {profile?.first_name || "User"}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR – unchanged */}
        <aside className="w-64 bg-white/60 border-r px-3 py-5 hidden md:block overflow-y-auto">
          {/* ... sidebar content remains the same ... */}
          <div className="space-y-1 mb-8">
            <SidebarItem icon={<LayoutGrid size={18} />} label="Boards" active />
            {/* <SidebarItem icon={<Home size={18} />} label="Home" /> */}
          </div>

          {/* <div>
            <div className="text-xs font-semibold text-gray-500 mb-3 px-2 uppercase">
              Workspaces
            </div>

            <div className="bg-white/80 rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5 border-b bg-gray-50">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 text-white flex items-center justify-center rounded-lg font-bold">
                  T
                </div>
                <span className="font-semibold">Workspace</span>
              </div>

              <div className="py-1">
                <WorkspaceItem icon={<LayoutGrid size={18} />} label="Boards" active />
                <WorkspaceItem icon={<Users size={18} />} label="Members" />
              </div>
            </div>
          </div> */}
        </aside>

        {/* ================= MAIN CONTENT – ALL CITIES ================= */}
        <main className="flex-1 px-6 md:px-12 py-10 overflow-y-auto">
          <div className="flex flex-col gap-12 max-w-6xl mx-auto">
            {cities.length === 0 ? (
              <div className="text-center py-20 text-gray-600 bg-white rounded-2xl shadow-sm border">
                <p className="text-xl font-semibold mb-3">No cities available yet</p>
                <p className="text-gray-500">
                  Contact your administrator or create your first city
                </p>
              </div>
            ) : (
              cities.map((city) => (
                <section key={city.id} className="space-y-5">
                  {/* City Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-lg flex items-center justify-center font-bold text-xl shadow-sm">
                        {city.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">{city.name}</h2>
                        <p className="text-sm text-gray-500">
                          {city.boards.length} board
                          {city.boards.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Optional: Add city-level actions here later */}
                  </div>

                  {/* Boards Grid */}
                  {city.boards.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {city.boards.map((board) => (
                        <Link key={board.id} to={`/boards/${board.id}`}>
                          <BoardCard
                            title={board.name}
                            background_gradient={board.background_gradient}
                          />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500 bg-gray-50/70 rounded-2xl border border-dashed">
                      No boards created in this city yet
                      <div className="mt-3 text-sm">
                        Ask your admin to add boards
                      </div>
                    </div>
                  )}
                </section>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= SUB COMPONENTS (unchanged except BoardCard) ================= */

function TopbarLink({ label, active, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
        active ? "bg-gray-100" : "hover:bg-gray-100"
      }`}
    >
      {label}
    </div>
  );
}

function IconCircle({ children }: any) {
  return (
    <button className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center">
      {children}
    </button>
  );
}

function SidebarItem({ icon, label, active }: any) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
        active ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function WorkspaceItem({ icon, label, active }: any) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${
        active ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

function WorkspaceButton({ icon, label, active }: any) {
  return (
    <button
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium ${
        active ? "bg-gray-200" : "bg-gray-100 hover:bg-gray-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function BoardCard({ title, background_gradient }: any) {
  const defaultGradient = "linear-gradient(135deg, #667eea, #764ba2)";
  return (
    <div className="h-44 rounded-2xl overflow-hidden shadow border hover:shadow-lg transition-all duration-200 group">
      <div
        className="h-32"
        style={{ background: background_gradient || defaultGradient }}
      />
      <div className="p-4 bg-white font-medium text-gray-800 group-hover:text-blue-700 transition-colors">
        {title}
      </div>
    </div>
  );
}
