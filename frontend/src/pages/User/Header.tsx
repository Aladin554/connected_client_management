import { useNavigate } from "react-router-dom";

interface HeaderProps {
  userName: string;
  onLogout: () => void;
}

export default function Header({ userName, onLogout }: HeaderProps) {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <header className="bg-transparent">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Left side */}
        <div
          onClick={() => navigate("/user-dashboard")}
          className="cursor-pointer text-xl tracking-tight hover:text-gray-300 transition" style={{ fontFamily: '"Abril Fatface"' }}
        >
          Connected.
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleProfileClick}
            className="bg-blue-500/90 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-600 transition"
          >
            {userName || "Loading..."}
          </button>

          <button
            onClick={onLogout}
            className="border border-white/30 px-3 py-1 rounded-full text-xs hover:bg-white/10 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* ✅ Border line under the content only (NOT full width) */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-white/30"></div>
      </div>
    </header>
  );
}
