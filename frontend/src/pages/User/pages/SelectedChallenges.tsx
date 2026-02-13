// Updated SelectedChallenges component with decreased card width, smaller tag text, white color, and adjusted spacing

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api/axios";
import Header from "../Header";
import Footer from "../Footer";
import parse from "html-react-parser";
import { getMeCached } from "../../../utils/me";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

interface Industry {
  id: number;
  name: string;
  final_details?: string;
}

interface LocationState {
  selectedIds: number[];
}

export default function SelectedChallenges() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string>("");
  const [profileName, setProfileUserName] = useState<string>("");
  const [selectedChallenges, setSelectedChallenges] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "Connected — Selected Challenges";
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const me = await getMeCached();
        setUserName(`${me.last_name || ""}`);
        setProfileUserName(`${me.first_name || "User"} ${me.last_name || ""}`);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const selectedIds =
      (location.state as LocationState)?.selectedIds ||
      JSON.parse(localStorage.getItem("selectedChallenges") || "[]");

    if (!selectedIds.length) {
      navigate("/challenges");
      return;
    }

    fetchSelectedChallenges(selectedIds);
  }, [location.state]);

  const fetchSelectedChallenges = async (ids: number[]) => {
    try {
      setIsLoading(true);
      const res = await api.get("/industry");
      const all = res.data.data || res.data;

      const formatted = all.map((item: any) => ({
        id: item.id,
        name: item.name || item.title,
        final_details: item.final_details || "",
      }));

      const filtered = formatted.filter((cat: Industry) => ids.includes(cat.id));
      const ordered = ids
        .map((id) => filtered.find((c) => c.id === id))
        .filter(Boolean) as Industry[];

      setSelectedChallenges(ordered);
      localStorage.setItem("selectedChallenges", JSON.stringify(ids));
    } catch (err) {
      console.error("Failed to fetch selected challenges:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutClick = () => {
    sessionStorage.clear();
  window.location.href = "/signin";
  };

  const handleWatchDemo = () => {
    alert("Watch Demo clicked! (Add video modal or redirect)");
  };

  const handleStartNext = () => {
    navigate("/phases-instructions", {
      state: { challengeIds: selectedChallenges.map((c) => c.id) },
    });
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Poppins:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      {isLoading ? (
        <div className="fixed inset-0 bg-[#080b3d] flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="w-8 h-8 border-4 border-white/20 border-t-green-400 rounded-full animate-spin"></div>
            <span className="text-sm text-white/70">Loading your passions...</span>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col bg-[#080b3d] text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <Header userName={profileName} onLogout={handleLogoutClick} />

           <main className="flex-1 flex flex-col items-center px-4 sm:px-6 md:px-12 py-8 sm:py-12 max-w-6xl mx-auto w-full">
  <div className="text-center mb-4 sm:mb-6 -mt-2">
    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 mt-4">
      Perfect {userName}! <span className="font-semibold">⭐</span>
    </h1>

    <p className="text-[10px] sm:text-xs md:text-sm text-white max-w-full mx-auto flex items-center justify-center gap-1 whitespace-nowrap">
  Looks like you are <span className="text-white font-bold">VERY interested</span> to solve challenges related to
  <span className="text-sm sm:text-base md:text-lg">👇</span>
</p>


  </div>

  <div className="w-full max-w-6xl mx-auto px-2 py-2">
    <div className="flex flex-col sm:flex-row sm:justify-center sm:gap-3 md:flex-nowrap md:overflow-x-auto pb-1 scrollbar-hide">
      {selectedChallenges.slice(0, 4).map((challenge, index) => (
        <div
          key={challenge.id}
          className="w-full sm:w-64 flex-shrink-0 bg-white/5 border-2 border-green-400 rounded-3xl p-4 flex flex-col backdrop-blur-xl shadow-md min-h-[200px] transition-all mx-auto sm:mx-0 mb-3 sm:mb-0"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between mb-1 -mt-2">
            <span className="mt-1 text-base sm:text-lg font-['Abril Fatface'] font-semibold text-white/90">
              0{index + 1}.
            </span>
            <span className="bg-green-400/20 text-white text-[8px] font-semibold px-2 py-0.5  rounded-full border border-green-400/40 mt-1">
              Highly Interested
            </span>
          </div>

          {/* Card Title */}
          <div className="flex flex-col gap-1">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white">
              {challenge.name}
            </h3>

            <p className="text-[10px] sm:text-xs text-white/80 leading-relaxed">
              {challenge.final_details
                ? parse(sanitizeHtml(challenge.final_details || ""))
                : "You have shown interest to work in these industries."}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>

  <p className="text-center text-xs sm:text-sm md:text-base text-white sm:mt-8 max-w-3xl mx-auto leading-relaxed">
    This is super exciting! We just got to learn which type of industries you care to work in.
    <br />
    <strong className="text-white">Next we will identify, which types of role you are passionate about.</strong>
  </p>

  <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center w-full">
    <button
      onClick={handleStartNext}
      className="w-full sm:w-auto bg-blue-500 hover:bg-blue-400 text-white font-bold py-2.5 px-6 rounded-full shadow-md hover:-translate-y-0.5 transition-all"
    >
      Start Next Module 👉
    </button>
  </div>
</main>


          <Footer />
        </div>
      )}
    </>
  );
}
