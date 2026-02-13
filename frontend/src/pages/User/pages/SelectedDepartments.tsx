// src/pages/User/pages/SelectedDepartments.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Header from "../Header";
import Footer from "../Footer";
import Loader from "../../Loader/Loader";
import parse from "html-react-parser";
import { getMeCached } from "../../../utils/me";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

interface CommonDepartment {
  id: number;
  name: string;
  details?: string;
}

export default function SelectedDepartments() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [departments, setDepartments] = useState<CommonDepartment[]>([]);
  const [expandedDeptIds, setExpandedDeptIds] = useState<Record<number, boolean>>(
    {}
  );
  const [selectedDepts, setSelectedDepts] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showMinimumModal, setShowMinimumModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const me = await getMeCached();
        setUserName(`${me.first_name} ${me.last_name}`);

        const res = await api.get("/common-departments");
        setDepartments(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleDept = (id: number) => {
    setExpandedDeptIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // MAX 2 SELECTION LOGIC WITH MODAL
  const toggleSelect = (id: number) => {
    setSelectedDepts(prev => {
      if (prev.includes(id)) {
        // Unselect
        return prev.filter(d => d !== id);
      }

      if (prev.length >= 2) {
        // Show modal instead of alert
        setShowLimitModal(true);
        return prev;
      }

      return [...prev, id];
    });
  };

  const handleNext = async () => {
    

    try {
      
      await api.post("/save-common-departments", {
        common_department_id: selectedDepts,
      });
      navigate("/selected-data", { state: { selectedDepts } });
    } catch (err) {
      console.error("Failed to save selections:", err);
      // Optional: add an error modal here if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Loader message="Fetching data..." />;

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Poppins:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <style>{`
        :root {
          --bg: #0f1533;
          --accent: #18e08a;
        }
        body {
         font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, 'Helvetica Neue', Arial;
          background-color: #080b3d;
        }
      `}</style>

      <div className="text-white bg-[#080b3d] min-h-screen flex flex-col">
        <Header
          userName={userName}
          onLogout={() => {
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
            navigate("/signin");
          }}
        />

        <main className="flex-1 flex flex-col items-center px-4 sm:px-6 md:px-16 py-8 sm:py-12 max-w-4xl mx-auto w-full">
  <div className="w-full max-w-xl sm:max-w-2xl rounded-2xl p-4 sm:p-6 border border-white/10 bg-gradient-to-b from-[#10153f] to-[#080b3d] shadow-2xl transition-all">
    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2">
      Common Departments
    </h1>
    <p className="text-gray-300 mb-4 text-sm sm:text-base leading-relaxed">
      Click on a department to view details, or select it from the right side.
    </p>

    <div className="space-y-3 sm:space-y-4">
      {departments.length === 0 && (
        <p className="text-gray-400 text-sm sm:text-base">
          No common departments found.
        </p>
      )}

      {departments.map(dept => {
        const isExpanded = !!expandedDeptIds[dept.id];
        const isSelected = selectedDepts.includes(dept.id);

        return (
          <div
            key={dept.id}
            className={`rounded-2xl overflow-hidden border transition-all duration-300 ${
              isExpanded
                ? "border-lime-400 bg-[#0b1045]/90"
                : "border-white/8 bg-[#0b1045]/50"
            }`}
          >
            {/* Header */}
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 cursor-pointer select-none gap-2 sm:gap-3"
              onClick={() => toggleDept(dept.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border ${
                    isExpanded
                      ? "border-lime-400 bg-[#0e1250]"
                      : "border-white/8 bg-[#0e1250]"
                  }`}
                >
                  <span
                    className={`font-semibold text-sm sm:text-base ${
                      isExpanded ? "text-lime-300" : "text-white"
                    }`}
                  >
                    {isExpanded ? "−" : "+"}
                  </span>
                </div>
                <div className="font-semibold text-sm sm:text-base md:text-lg text-white">
                  {dept.name}
                </div>
              </div>

              {/* Buttons and Select inline */}
              <div
                className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0 flex-wrap sm:flex-nowrap"
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="text-xs sm:text-sm bg-lime-500/10 hover:bg-lime-500/20 text-lime-300 font-semibold px-2 py-0.5 rounded-full transition"
                  onClick={() => toggleDept(dept.id)}
                >
                  {isExpanded ? "Hide" : "Details"}
                </button>

                <div
                  onClick={() => toggleSelect(dept.id)}
                  className={`w-5 h-5 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all ${
                    isSelected
                      ? "border-lime-400 bg-lime-400/30"
                      : "border-white/40 bg-transparent hover:border-lime-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-lime-400"></div>
                  )}
                </div>

                <button
                  onClick={() => toggleSelect(dept.id)}
                  className={`text-xs sm:text-sm font-semibold px-3 py-1 rounded-full border transition ${
                    isSelected
                      ? "border-lime-400 text-lime-300 bg-lime-500/10 hover:bg-lime-500/20"
                      : "border-white/20 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {isSelected ? "Selected" : "Select"}
                </button>
              </div>
            </div>

            {/* Expandable Details */}
            <div
              className={`transition-[max-height] duration-400 ease-in-out overflow-hidden ${
                isExpanded ? "max-h-[2000px]" : "max-h-0"
              }`}
            >
              <div className="p-3 sm:p-4 border-t border-white/6 bg-[#0e1250]">
                {dept.details ? (
                  <p className="mb-3 text-sm sm:text-base text-gray-300">
                    {parse(sanitizeHtml(dept.details || ""))}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm sm:text-base">
                    No details available.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>

    <button
      onClick={handleNext}
      disabled={isSubmitting}
      className={`w-full py-3 rounded-xl text-base sm:text-lg md:text-lg font-bold mt-4 sm:mt-6 transition-all ${
        isSubmitting
          ? "bg-gray-500 cursor-wait text-white/80"
          : "bg-lime-400 hover:bg-lime-500 text-black"
      }`}
    >
      {isSubmitting ? "Processing..." : "Next →"}
    </button>
  </div>
</main>


        <Footer />

        {/* Selection Limit Modal */}
        {showLimitModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
            <div className="bg-[#080b3d] border-2 border-lime-400 p-6 rounded-3xl shadow-xl max-w-sm w-full text-center">
              <h3 className="text-xl font-bold text-lime-400 mb-2">
                Selection Limit Reached
              </h3>
              <p className="text-gray-300 mb-4">
                You can only select up to <strong>2</strong> common departments.
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

        {/* Minimum Selection Modal */}
        {showMinimumModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
            <div className="bg-[#080b3d] border-2 border-lime-400 p-6 rounded-3xl shadow-xl max-w-sm w-full text-center">
              <h3 className="text-xl font-bold text-lime-400 mb-2">
                Selection Required
              </h3>
              <p className="text-gray-300 mb-4">
                Please select at least <strong>one</strong> department to continue.
              </p>
              <button
                onClick={() => setShowMinimumModal(false)}
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
