import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Header from "../Header";
import Footer from "../Footer";
import parse from "html-react-parser";
import { getMeCached } from "../../../utils/me";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

interface Industry {
  id: number;
  title: string;
  name?: string;
  modal_description?: string;
  modal_image?: string;
  industry_id: number;
}

interface StoredWork {
  categoryId: number;
  answer: "yes" | "maybe";
}

export default function ChallengeCards() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Industry[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [profileName, setProfileUserName] = useState<string>("");
  const [activeWork, setActiveWork] = useState<Industry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [showNextModal, setShowNextModal] = useState(false);


  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    document.title = "Connected — Challenge Cards";
  }, []);

useEffect(() => {
  const fetchUser = async () => {
    try {
      const me = await getMeCached();
      setUserName(`${me.last_name}`);
      setProfileUserName(`${me.first_name || "User"} ${me.last_name || ""}`);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  fetchUser();
}, []);


  useEffect(() => {
  const fetchCategories = async () => {
    try {
      const res = await api.get("/industry");
      const data: Industry[] = Array.isArray(res.data.data)
        ? res.data.data
        : res.data;

      const storedRaw = localStorage.getItem("selectedWork");
      const stored: StoredWork[] = storedRaw ? JSON.parse(storedRaw) : [];
      const map: Record<number, "yes" | "maybe"> = {};
      stored.forEach((w) => (map[w.categoryId] = w.answer));

      const filtered = data.filter((c) => map[c.id]);

      // ✅ IF 3 OR LESS → REDIRECT ONLY
      if (filtered.length > 0 && filtered.length <= 3) {
        const ids = filtered.map((c) => c.id);

        await api.post("/initial-industry", { selected_ids: ids });

        setShouldRedirect(true);

        navigate("/selected-three-challenge-card", {
          state: { selectedIds: ids },
          replace: true,
        });
        return;
      }

      // ❌ ONLY SET STATE IF PAGE SHOULD RENDER
      setCategories(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  fetchCategories();
}, [navigate]);


  const handleLogoutClick = () => {
    sessionStorage.clear();
  window.location.href = "/signin";
  };

  const handleSelect = (id: number) => {
  setSelected((prev) => {
    if (prev.includes(id)) {
      // Deselect if already selected
      return prev.filter((s) => s !== id);
    }

    if (prev.length < 2) {
      // Add normally if less than 2 selected
      return [...prev, id];
    }

    if (prev.length === 2) {
      // On selecting 3rd item, trigger modal
      setShowNextModal(true);
      return [...prev, id]; // Still add the 3rd
    }

    // Should never reach here (because limit is 3)
    return prev;
  });
};



  const handleConfirm = async () => {
    if (selected.length >= 1 && selected.length <= 3) {
      try {
        await api.post("/initial-industry", { selected_ids: selected });
        navigate("/selected-three-challenge-card", { state: { selectedIds: selected } });
      } catch (err) {
        console.error(err);
        alert("Failed to save selection.");
      }
    } else {
      alert("Please select 1–3 challenges.");
    }
  };

  const openModal = (work: Industry) => {
    setActiveWork(work);
    document.body.style.overflow = "hidden";
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      setScrollPercent(0);
    }
  };

  const closeModal = () => {
    setActiveWork(null);
    document.body.style.overflow = "auto";
  };

  const updateScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const maxScroll = el.scrollHeight - el.clientHeight;
    setScrollPercent(maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0);
  };
 if (shouldRedirect) return null;
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Poppins:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <style>{`
        body { font-family: 'Poppins', system-ui; background-color: #080b3d; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; }
      `}</style>

      {isLoading ? (
        <div className="fixed inset-0 bg-[#0b0f3f] flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="w-8 h-8 border-4 border-white/30 border-t-green-400 rounded-full animate-spin"></div>
            <span className="text-sm text-white/70">Loading challenges...</span>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col bg-[#0b0f3f] text-white">
          <Header userName={profileName} onLogout={handleLogoutClick} />

          <main className="flex-grow flex flex-col items-center px-4 sm:px-6 py-16 max-w-7xl mx-auto w-full">
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
                Alright {userName}!
              </h1>
              <p className="text-sm sm:text-base text-gray-300 max-w-3xl mx-auto">
                Here are the challenges you're{" "}
                <strong className="font-semibold text-white">highly interested</strong> to solve!
                <p>
              Select the <strong className="text-white">3 challenges you care MOST about</strong>.
            </p>
              </p>
              
            </div>

            <div className="w-full max-w-6xl mx-auto px-4 pb-10">
  {categories.length > 0 ? (
    Array.from({ length: Math.ceil(categories.length / 3) }).map((_, rowIndex) => {
      const rowItems = categories.slice(rowIndex * 3, rowIndex * 3 + 3);
      return (
        // ✅ This row is flex and centered
        <div key={rowIndex} className="flex justify-center gap-6 mb-6 flex-wrap">
          {rowItems.map((work) => {
            const isSelected = selected.includes(work.id);
            return (
              <div
                key={work.id}
                className={`bg-[#0e133b] border-2 rounded-3xl p-5 flex flex-col transition-transform duration-300 w-72
                  ${isSelected ? "border-green-500 bg-green-900/20 shadow-lg" : "border-gray-400"}
                  cursor-pointer`}
                onClick={() => handleSelect(work.id)}
              >
                <div className="flex items-center justify-between mb-3">
  {/* Left Text */}
  <span className="text-sm font-medium text-gray-300">
    {/* Do you care? */}
  </span>

  {/* Right Lamp Button */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      openModal(work);
    }}
    className="bg-green-400 w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
  >
    <img src="/images/lamp.png" alt="info" className="w-4 h-4" />
  </button>
</div>


                <p className="text-base sm:text-lg font-semibold text-white flex-1">
                  {parse(sanitizeHtml(work.title))}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(work.id);
                  }}
                  className={`mt-4 px-5 py-2 rounded-full text-sm font-semibold transition ${
                    isSelected ? "bg-green-500 text-white" : "border border-green-500 text-white"
                  }`}
                >
                  {isSelected ? "Shortlisted" : "Shortlist"}
                </button>
              </div>
            );
          })}
        </div>
      );
    })
  ) : (
    <p className="text-center text-gray-400 py-10 w-full">No challenges found.</p>
  )}
  <p className="text-center text-xs sm:text-sm text-gray-300 mt-4 max-w-2xl mx-auto leading-relaxed">
              Select the <strong className="text-white">3 challenges you care MOST about</strong>.
            </p>
</div>



            <div className="mb-10">
              <button
                onClick={handleConfirm}
                disabled={selected.length < 1 || selected.length > 3}
                className={`px-8 py-3 rounded-full font-bold bg-blue-500 text-white flex items-center gap-2 transition ${
                  selected.length >= 1 && selected.length <= 3
                    ? "hover:bg-blue-600"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                Launch 👉
              </button>
            </div>
          </main>

          <Footer />

          {/* SORT STYLE MODAL */}
          {activeWork && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 sm:px-0">
    <div className="relative w-full max-w-2xl sm:max-w-2xl">

      {/* Vertical Progress (hidden on mobile) */}
      <div className="hidden sm:block absolute top-24 right-2 w-1 h-[75%] bg-gray-200 rounded-full overflow-hidden z-50">
                  <div
                    className="bg-blue-500 w-full transition-all duration-150"
                    style={{ height: `${scrollPercent}%` }}
                  ></div>
                </div>

                <div className="bg-white text-black rounded-[2rem] w-full p-6 relative shadow-xl">
                  <button
                    onClick={closeModal}
                    className="absolute top-4 right-[0.5rem] w-9 h-9 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xl font-light hover:bg-gray-100 transition z-10"
                  >
                    ×
                  </button>

                  <div>
                    <div className="text-gray-500 text-base font-medium">Do you want to work in the</div>
                    <h3 className="text-2xl font-black leading-snug mt-1 text-black">{activeWork.name}</h3>

                    {activeWork.modal_image && (
                      <img
                        src={activeWork.modal_image}
                        className="rounded-xl mt-4 w-full max-h-40 object-cover border border-gray-200"
                      />
                    )}
                  </div>

                  <div
                    ref={scrollRef}
                    onScroll={updateScroll}
                    className="mt-4 text-sm leading-relaxed text-gray-700 overflow-y-auto hide-scrollbar"
                    style={{ maxHeight: "200px", paddingRight: "8px" }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(activeWork.modal_description || "") }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Limit Modal */}
          {showLimitModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-[#0b0f3f] border-2 border-green-400 text-white rounded-3xl max-w-sm w-full p-6 relative">
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                >
                  X
                </button>
                <h3 className="text-xl font-bold text-green-400 mb-2">Selection Limit Reached</h3>
                <p className="text-gray-300 text-sm">
                  You can only select up to 3 challenges. Deselect one to choose another.
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="px-5 py-2 bg-green-400 text-black rounded-full font-bold text-sm hover:bg-green-500"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
          {showNextModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-[#0b0f3f] border-2 border-green-400 text-white rounded-3xl max-w-sm w-full p-6 relative">
      <button
        onClick={() => setShowNextModal(false)}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
      >
        X
      </button>
      <h3 className="text-xl font-bold text-green-400 mb-2">3 Challenges Selected!</h3>
      <p className="text-gray-300 text-sm mb-4">
        You have selected 3 challenges. What do you want to do next?
      </p>
      <div className="flex justify-between gap-4">
        <button
          onClick={handleConfirm}
          className="px-5 py-2 bg-green-400 text-black rounded-full font-bold text-sm hover:bg-green-500 flex-1"
        >
          Next Step
        </button>
        <button
          onClick={() => setShowNextModal(false)}
          className="px-5 py-2 border border-green-400 text-white rounded-full font-bold text-sm flex-1"
        >
          Check Below
        </button>
      </div>
    </div>
  </div>
)}

        </div>
      )}
    </>
  );
}
