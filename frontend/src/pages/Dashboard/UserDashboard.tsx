import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import Loader from "../Loader/Loader";
import api from "../../api/axios";
import { getMeCached } from "../../utils/me";

interface Board {
  id: number;
  name: string;
  background_gradient?: string | null;
}

interface City {
  id: number;
  name: string;
  boards: Board[];
}

interface Profile {
  first_name?: string | null;
}

function normalizeCities(payload: unknown): City[] {
  if (Array.isArray(payload)) return payload as City[];

  if (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: City[] }).data;
  }

  return [];
}

export default function UserDashboard() {
  const navigate = useNavigate();

  const [cities, setCities] = useState<City[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const [citiesRes, me] = await Promise.all([api.get("/cities"), getMeCached()]);
        setCities(normalizeCities(citiesRes.data));
        setProfile(me as Profile);
      } catch (err) {
        console.error("Failed to load user dashboard", err);
        setErrorMessage("Could not load dashboard data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboard();
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;

    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showUserMenu]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredCities = useMemo(() => {
    if (!normalizedSearchTerm) return cities;

    return cities
      .map((city) => {
        const cityMatch = city.name.toLowerCase().includes(normalizedSearchTerm);
        const boards = cityMatch
          ? city.boards
          : city.boards.filter((board) =>
              board.name.toLowerCase().includes(normalizedSearchTerm)
            );

        return {
          ...city,
          boards,
        };
      })
      .filter((city) => city.boards.length > 0);
  }, [cities, normalizedSearchTerm]);

  const handleOpenProfileSettings = () => {
    setShowUserMenu(false);
    navigate("/profile");
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role_id");
    sessionStorage.removeItem("panel_permission");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/signin");
  };

  if (loading) {
    return <Loader message="Loading dashboard..." />;
  }

  return (
    <div className="h-screen bg-gray-50/70 flex flex-col text-gray-800">
      <header className="h-14 bg-white/80 backdrop-blur-sm border-b flex items-center px-4 gap-4 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="h-7 flex items-center cursor-pointer"
            title="Go to home"
          >
            <img
              src="/images/logo/connected_logo.png"
              alt="Connected Logo"
              className="h-7 w-auto object-contain"
            />
          </button>
        </div>

        <div className="flex-1 flex justify-center px-6">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search boards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100/70 border rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-200 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="h-8 px-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95"
              title="Open user menu"
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
            >
              {profile?.first_name || "User"}
              <ChevronDown
                size={14}
                className={`transition-transform ${showUserMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg z-40">
                <button
                  type="button"
                  onClick={handleOpenProfileSettings}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Profile Settings
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 px-6 md:px-12 py-10 overflow-y-auto">
          <div className="flex flex-col gap-12 max-w-7xl mx-auto">
            <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
              <h1 className="text-2xl font-extrabold text-gray-900">
                Hi {profile?.first_name || "User"}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Get started below with your designated workspace.
              </p>
            </section>

            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}

            {filteredCities.length === 0 ? (
              <div className="text-center py-20 text-gray-600 bg-white rounded-2xl shadow-sm border">
                <p className="text-xl font-semibold mb-3">
                  {normalizedSearchTerm ? "No matching boards found" : "No cities available yet"}
                </p>
                <p className="text-gray-500">
                  {normalizedSearchTerm
                    ? "Try another board or city name"
                    : "Contact your administrator or create your first city"}
                </p>
              </div>
            ) : (
              filteredCities.map((city) => (
                <section key={city.id} className="space-y-5">
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
                  </div>

                  {city.boards.length > 0 ? (
                    <div
                      className="grid gap-6"
                      style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
                    >
                      {city.boards.map((board) => (
                        <Link key={board.id} to={`/boards/${board.id}`}>
                          <BoardCard
                            title={board.name}
                            backgroundGradient={board.background_gradient || null}
                          />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500 bg-gray-50/70 rounded-2xl border border-dashed">
                      No boards created in this city yet
                      <div className="mt-3 text-sm">Ask your admin to add boards</div>
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

interface BoardCardProps {
  title: string;
  backgroundGradient?: string | null;
}

function BoardCard({ title, backgroundGradient }: BoardCardProps) {
  const defaultGradient = "linear-gradient(135deg, #667eea, #764ba2)";

  return (
    <div className="h-40 rounded-2xl overflow-hidden shadow border hover:shadow-lg transition-all duration-200 group bg-white">
      <div className="h-24" style={{ background: backgroundGradient || defaultGradient }} />
      <div className="p-4 font-medium text-gray-800 group-hover:text-blue-700 transition-colors">
        {title}
      </div>
    </div>
  );
}
