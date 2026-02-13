// src/pages/User/pages/SelectedData.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Header from "../Header";
import Footer from "../Footer";
import Loader from "../../Loader/Loader";
import { getMeCached } from "../../../utils/me";

interface Department {
  id: number;
  name: string;
  details?: string;
}

interface IndustryGroup {
  id: number;
  industry: string;
  sub_departments: Department[];
}

export default function SelectedData() {
  const navigate = useNavigate();

  const [userName, setUserName] = useState<string>("");
  const [industries, setIndustries] = useState<IndustryGroup[]>([]);
  const [commonDepartments, setCommonDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch user profile
  useEffect(() => {
    getMeCached()
      .then((me) => setUserName(`${me.first_name} ${me.last_name}`))
      .catch((err) => console.error("Profile fetch failed:", err));
  }, []);

  // Fetch user-related industries and departments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get("/user-related-departments");
        if (res.data.success) {
          setIndustries(res.data.data.industries || []);
          setCommonDepartments(res.data.data.common_departments || []);
        }
      } catch (err) {
        console.error("Error fetching user-related departments:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Define the 4 core colors in fixed order (matching your original design)
  const CORE_GRADIENTS = [
    "from-[#00A651] to-[#006837]", // Green - Healthcare
    "from-[#6A1B9A] to-[#4A148C]", // Purple - IT/Tech
    "from-[#1E88E5] to-[#1565C0]", // Blue - Business/Finance
    "from-[#FF6D00] to-[#E65100]", // Orange - Engineering
  ];

  // Map known industries to their specific gradient index
  const getIndustryGradientIndex = (industryName: string): number => {
    const name = industryName.toLowerCase();

    if (name.includes("health") || name.includes("medicine") || name.includes("healthcare")) {
      return 0; // Green
    }
    if (name.includes("it") || name.includes("computer") || name.includes("technology") || name.includes("science")) {
      return 1; // Purple
    }
    if (name.includes("business") || name.includes("finance")) {
      return 2; // Blue
    }
    if (name.includes("engineer")) {
      return 3; // Orange
    }

    // For unknown/future industries: return -1 to trigger fallback cycling
    return -1;
  };

  if (loading) return <Loader message="Fetching your selected data..." />;

  // Count how many industries need fallback colors
  let fallbackIndex = 0;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Poppins:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <style>{`
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

        <main className="flex-grow flex justify-center items-start px-4 sm:px-6 py-10 sm:py-16">
          <div className="w-full max-w-6xl rounded-2xl p-4 sm:p-6 md:p-8 border border-white/10 shadow-2xl bg-[#0f1533]/60 backdrop-blur-md">

            {/* Title */}
            <h1 className="text-lg sm:text-2xl md:text-4xl font-extrabold mb-2 sm:mb-3 whitespace-nowrap">
              Your Selected Roles
            </h1>

            <p className="text-gray-300 mb-6 sm:mb-8 text-sm lg:text-base leading-relaxed">
              Here are the departments you selected for each industry.
            </p>

            {industries.length > 0 ? (
              <div className="space-y-5 sm:space-y-8">
                {industries.map((group) => {
                  const fixedIndex = getIndustryGradientIndex(group.industry);

                  let gradient;
                  if (fixedIndex !== -1) {
                    gradient = CORE_GRADIENTS[fixedIndex];
                    fallbackIndex = 0;
                  } else {
                    gradient = CORE_GRADIENTS[fallbackIndex % 4];
                    fallbackIndex++;
                  }

                  return (
                    <div
                      key={group.id}
                      className={`
                        rounded-2xl sm:rounded-3xl
                        p-4 sm:p-6 md:p-7
                        shadow-xl sm:shadow-2xl
                        transition-all duration-300
                        bg-gradient-to-br ${gradient}
                        border border-white/20
                        sm:hover:-translate-y-2 sm:hover:shadow-3xl
                      `}
                    >
                      {/* Industry title */}
                      <h2 className="text-base sm:text-xl md:text-3xl font-extrabold mb-4 sm:mb-5 text-white break-words">
                        {group.industry}
                      </h2>

                      {/* Selected Sub-departments */}
                      {group.sub_departments.length > 0 ? (
                        <div className="flex flex-wrap gap-2 sm:gap-4">
                          {group.sub_departments.map((subDept) => (
                            <span
                              key={`${group.id}-${subDept.id}`}
                              className="
                                bg-white/25
                                px-3 sm:px-5
                                py-1.5 sm:py-2
                                rounded-full
                                text-xs sm:text-sm md:text-base
                                font-semibold
                                backdrop-blur-sm
                                border border-white/30
                              "
                              title={subDept.details}
                            >
                              {subDept.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/80 text-xs sm:text-sm italic">
                          No specific roles selected for this industry.
                        </p>
                      )}

                      {/* Common Departments */}
                      {commonDepartments.length > 0 && (
                        <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-white/30">
                          <p className="text-white/90 text-xs sm:text-sm font-medium mb-3">
                            Common roles across your interests:
                          </p>

                          <div className="flex flex-wrap gap-2 sm:gap-4">
                            {commonDepartments.map((dept) => (
                              <span
                                key={`common-${dept.id}`}
                                className="
                                  bg-white/15
                                  px-3 sm:px-5
                                  py-1.5 sm:py-2
                                  rounded-full
                                  text-xs sm:text-sm md:text-base
                                  font-medium
                                  backdrop-blur-sm
                                  border border-white/20
                                "
                                title={dept.details}
                              >
                                {dept.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm sm:text-lg">
                No industries or roles selected yet.
              </p>
            )}

            {/* Action Buttons */}
            <div className="mt-8 sm:mt-10 flex flex-col gap-3 sm:gap-4">
              <button
                onClick={() => navigate("/qa-instructions")}
                className="
                  w-full
                  bg-[#0055FF] hover:bg-[#0042cc]
                  text-white font-bold
                  py-3 sm:py-4
                  rounded-xl sm:rounded-2xl
                  text-base sm:text-lg
                  transition
                  shadow-lg hover:shadow-xl
                "
              >
                Start Next Module 👉
              </button>

              <button
                onClick={() => navigate("/sort-cards")}
                className="w-full text-gray-400 hover:text-white text-center text-xs sm:text-sm font-medium underline-offset-4 hover:underline transition"
              >
                ← Go back and change role selection
              </button>
            </div>
          </div>
        </main>


        <Footer />
      </div>
    </>
  );
}
