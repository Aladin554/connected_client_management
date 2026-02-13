// src/pages/User/pages/UserIndustriesWithSubDepartments.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Header from "../Header";
import Footer from "../Footer";
import Loader from "../../Loader/Loader";
import parse from "html-react-parser";
import { Plus, Minus } from "lucide-react";
import { getMeCached } from "../../../utils/me";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

interface SubDepartment {
  id: number;
  industry_id: number;
  department_id: number;
  name: string;
  details: string;
}

interface Department {
  id: number;
  name?: string;
  details?: string;
  sub_departments?: SubDepartment[];
}

interface IndustryWithDepartments {
  id: number;
  name: string;
  departments?: Department[];
}

export default function UserIndustriesWithSubDepartments() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [industries, setIndustries] = useState<IndustryWithDepartments[]>([]);
  const [currentIndustryIndex, setCurrentIndustryIndex] = useState(0);

  // 🔴 CHANGE: selections stored PER INDUSTRY
  const [selectedSubDeptIds, setSelectedSubDeptIds] = useState<
    Record<number, number[]>
  >({});

  const [expandedDeptId, setExpandedDeptId] = useState<number | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const me = await getMeCached();
        setUserName(`${me.first_name} ${me.last_name}`);

        const res = await api.get("/user-industries-with-departments");
        setIndustries(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentIndustry = industries[currentIndustryIndex];
  const currentIndustryId = currentIndustry?.id;
  const isLastIndustry = currentIndustryIndex === industries.length - 1;

  const selectedForCurrentIndustry =
    (currentIndustryId && selectedSubDeptIds[currentIndustryId]) || [];

  const handleLogout = () => {
    sessionStorage.clear();
  window.location.href = "/signin";
  };

  const toggleDepartment = (deptId: number) => {
    setExpandedDeptId(prev => (prev === deptId ? null : deptId));
  };

  // ✅ LIMIT = 3 PER INDUSTRY
  const handleSubDepartmentSelect = (subDeptId: number, deptId: number) => {
    if (!currentIndustryId) return;

    setSelectedSubDeptIds(prev => {
      const current = prev[currentIndustryId] || [];

      // Unselect
      if (current.includes(subDeptId)) {
        return {
          ...prev,
          [currentIndustryId]: current.filter(id => id !== subDeptId),
        };
      }

      // Limit reached
      if (current.length >= 3) {
        setShowLimitModal(true);
        return prev;
      }

      return {
        ...prev,
        [currentIndustryId]: [...current, subDeptId],
      };
    });
  };

  const goToNextIndustry = () => {
    if (isLastIndustry) {
      handleFinalSubmit();
    } else {
      setCurrentIndustryIndex(prev => prev + 1);
      setExpandedDeptId(null);
    }
  };

  const goToPreviousIndustry = () => {
    if (currentIndustryIndex > 0) {
      setCurrentIndustryIndex(prev => prev - 1);
      setExpandedDeptId(null);
    }
  };

  const handleFinalSubmit = async () => {
    const payload: {
      industry_id: number;
      department_id: number;
      sub_department_ids: number[];
    }[] = [];

    industries.forEach(industry => {
      const selectedSubs = selectedSubDeptIds[industry.id] || [];

      industry.departments?.forEach(dept => {
        const subIds =
          dept.sub_departments
            ?.filter(s => selectedSubs.includes(s.id))
            .map(s => s.id) || [];

        if (subIds.length > 0) {
          payload.push({
            industry_id: industry.id,
            department_id: dept.id,
            sub_department_ids: subIds,
          });
        }
      });
    });

    if (payload.length === 0) {
      alert("Please select at least one department.");
      return;
    }

    try {
      await api.post("/save-departments-and-sub-departments", {
        departments: payload,
      });
      navigate("/secound-phases", { state: { payload } });
    } catch (err) {
      console.error("Failed to save data:", err);
      alert("Failed to save your selection. Please try again.");
    }
  };

  if (isLoading) return <Loader message="Fetching user data..." />;

  if (industries.length === 0) {
    return <div className="text-white text-center">No industries available.</div>;
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Poppins:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <style>{`
        :root { --bg: #0f1533; --accent: #18e08a; }
        body { font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, 'Helvetica Neue', Arial;  background-color: #080b3d; }
      `}</style>

      <div className="text-white bg-[#080b3d] min-h-screen flex flex-col">
        <Header userName={userName} onLogout={handleLogout} />

        <main className="flex-1 flex flex-col items-center px-4 sm:px-6 md:px-16 py-12 sm:py-16 max-w-4xl mx-auto">
  <div className="w-full max-w-xl">
    {/* Progress Indicator */}
    <div className="mb-6 text-center">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
        Let’s Start{" "}
        <span className="text-[#18e08a]">
          {userName.split(" ").slice(-1)}
        </span>
      </h1>
      <p className="text-gray-400 text-sm sm:text-base">
        Step {currentIndustryIndex + 1} of {industries.length}
      </p>
      <div className="mt-4 flex justify-center gap-2 flex-wrap">
        {industries.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-10 sm:w-12 rounded-full transition-all ${
              index === currentIndustryIndex
                ? "bg-lime-400 w-20 sm:w-20"
                : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>

    {/* Current Industry */}
    {currentIndustry && (
      <div className="mb-10 animate-fadeIn">
        <h2 className="text-2xl sm:text-3xl md:text-3xl font-bold text-white mb-4 text-center">
          {currentIndustry.name}
        </h2>

        {currentIndustry.departments?.map(dept => {
          const isExpanded = expandedDeptId === dept.id;
          const anySelected = dept.sub_departments?.some(s =>
            selectedForCurrentIndustry.includes(s.id)
          );

          return (
            <div
              key={dept.id}
              className={`rounded-2xl overflow-hidden mb-4 border transition-all ${
                isExpanded
                  ? "border-lime-400 bg-[#0b1045]/90"
                  : "border-white/8 bg-[#0b1045]/50"
              }`}
            >
              <div
                className="flex items-center justify-between p-3 sm:p-4 cursor-pointer"
                onClick={() => toggleDepartment(dept.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center rounded-md bg-[#0e1250] border border-white/8">
                    {isExpanded ? (
                      <Minus size={16} className="text-lime-400" />
                    ) : (
                      <Plus size={16} className="text-white/80" />
                    )}
                  </div>
                  <div
                    className={`font-semibold text-base sm:text-lg ${
                      isExpanded ? "text-lime-300" : "text-white"
                    }`}
                  >
                    {dept.name}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 ${
                    anySelected
                      ? "bg-lime-400 border-lime-400"
                      : "border-white/40 bg-transparent"
                  }`}
                />
              </div>

              <div
                className={`transition-[max-height] duration-500 ease-in-out overflow-hidden ${
                  isExpanded ? "max-h-[10000px]" : "max-h-0"
                }`}
              >
                <div className="p-3 sm:p-4 border-t border-white/6 bg-[#0e1250]">
                  {dept.details && (
                    <p className="mb-3 text-sm sm:text-base text-gray-300">
                      {parse(sanitizeHtml(dept.details || ""))}
                    </p>
                  )}

                  {dept.sub_departments?.map(sub => {
                    const isSelected =
                      selectedForCurrentIndustry.includes(sub.id);

                    return (
                      <div
                        key={sub.id}
                        className={`rounded-xl p-3 sm:p-4 mb-3 transition-all flex flex-col md:flex-row items-start justify-between cursor-pointer border ${
                          isSelected
                            ? "border-lime-400 shadow-[0_0_15px_rgba(163,255,114,0.25)]"
                            : "border-transparent hover:border-lime-400/20"
                        } bg-[#0b1540]`}
                        onClick={() =>
                          handleSubDepartmentSelect(sub.id, dept.id)
                        }
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div
                              className={`font-semibold text-sm sm:text-base ${
                                isSelected ? "text-lime-300" : "text-white"
                              }`}
                            >
                              {parse(sanitizeHtml(sub.name || ""))}
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                                isSelected
                                  ? "bg-lime-400/20 text-lime-300 border border-lime-400/50"
                                  : "bg-white/5 text-gray-300 border border-transparent hover:border-lime-300/50"
                              }`}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </span>
                          </div>
                          <p
                            className={`text-xs sm:text-sm ${
                              isSelected
                                ? "text-lime-200/80"
                                : "text-gray-300"
                            }`}
                          >
                            {sub.details || "No details available."}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}

    {/* Navigation Buttons */}
    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-3 sm:gap-4 w-full">
      <button
        onClick={goToPreviousIndustry}
        disabled={currentIndustryIndex === 0}
        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all ${
          currentIndustryIndex === 0
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : "bg-white/10 hover:bg-white/20 text-white"
        }`}
      >
        ← Previous
      </button>

      <div className="text-sm text-gray-400">
        Selected: {selectedForCurrentIndustry.length}/3
      </div>

      <button
        onClick={goToNextIndustry}
        className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
          isLastIndustry
            ? "bg-lime-400 hover:bg-lime-500 text-black"
            : "bg-[#18e08a]/20 hover:bg-[#18e08a]/30 text-[#18e08a] border border-[#18e08a]/50"
        }`}
      >
        {isLastIndustry ? "Submit & Continue →" : "Next Industry →"}
      </button>
    </div>
  </div>
</main>


        <Footer />

        {/* Limit Modal */}
        {showLimitModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
            <div className="bg-[#080b3d] border-2 border-lime-400 p-6 rounded-3xl shadow-xl max-w-sm w-full text-center">
              <h3 className="text-xl font-bold text-lime-400 mb-2">
                Selection Limit Reached
              </h3>
              <p className="text-gray-300 mb-4">
                You can only select up to 3 sub-departments per industry.
              </p>
              <button
                onClick={() => setShowLimitModal(false)}
                className="px-5 py-2 bg-lime-400 text-black font-semibold rounded-full hover:bg-lime-500 transition"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
