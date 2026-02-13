import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Header from "../Header";
import Footer from "../Footer";
import Loader from "../../Loader/Loader";

interface Department {
  id: number;
  name: string;
  details?: string;
}

interface Industry {
  id: number;
  name: string;
  departments?: Department[];
}

interface UserChallengeData {
  industry: Industry;
  department_ids: number[];
  common_department_id: string; // JSON string like "[1,2]"
}

interface SubmittedAnswer {
  id: number;
  selected_option: string;
  question: { title: string };
}

interface RelatedIndustry {
  id: number;
  name: string;
  departments: Department[];
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  challenge_data?: UserChallengeData;
  related_industries?: RelatedIndustry[];
  submitted_answers?: SubmittedAnswer[];
  common_departments?: Department[];
}

export default function MyReport() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/reports/me");
        const data: User = res.data;

        // Parse common departments
        let commonDepartments: Department[] = [];
        if (data.challenge_data?.common_department_id) {
          try {
            const commonIds: number[] = JSON.parse(data.challenge_data.common_department_id);
            if (commonIds.length > 0) {
              const resCommon = await api.get("/common-departments");
              commonDepartments = (resCommon.data.data || []).filter((d: Department) =>
                commonIds.includes(d.id)
              );
            }
          } catch (err) {
            console.error("Failed to parse common_department_id:", err);
          }
        }

        setUser({ ...data, common_departments: commonDepartments });

        if (commonDepartments.length > 0) {
          const resIndustries = await api.get("/industry");
          setIndustries(resIndustries.data.data || []);
        }
      } catch {
        alert("Failed to load your report.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const gradientColors = [
    "from-[#f97316] to-[#fb923c]",
    "from-[#2563eb] to-[#1d4ed8]",
    "from-[#10b981] to-[#059669]",
    "from-[#8b5cf6] to-[#7c3aed]",
    "from-[#ef4444] to-[#b91c1c]",
  ];

  if (loading) return <Loader message="Fetching your report..." />;
  if (!user) return <div className="text-center text-white p-8">No report found.</div>;

  // Build map of user departments per industry
  const allUserDepartments = new Map<number, Department[]>();
  if (user.challenge_data?.industry) {
    const { industry, department_ids } = user.challenge_data;
    const selectedDepts = industry.departments?.filter((d) => department_ids.includes(d.id)) || [];
    allUserDepartments.set(industry.id, selectedDepts);
  }
  user.related_industries?.forEach((rel) => {
    allUserDepartments.set(rel.id, rel.departments);
  });

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Poppins:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <style>
        {`
          :root {
            --bg: #0f1533;
            --accent: #18e08a;
          }
          body {
            font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, 'Helvetica Neue', Arial;
            background-color: #080b3d;
          }
          .font-serif {
            font-family: 'serif';
          }
        `}
      </style>

      <div className="text-white bg-[#080b3d] min-h-screen">
        <Header
          userName={`${user.first_name} ${user.last_name}`}
          onLogout={() => {
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
            navigate("/signin");
          }}
        />

        <main className="flex flex-col items-center justify-start px-4 py-10">
          <div className="w-full max-w-6xl rounded-2xl shadow-2xl text-white p-8 border border-white/10 bg-[#0f1533]/60 backdrop-blur-md">
            <h1 className="text-4xl font-extrabold mb-4">My Report</h1>
            <p className="text-gray-300 mb-8 leading-relaxed text-sm lg:text-base">
              Here’s a summary of your career interest selections and personality highlights.
            </p>

            {/* Industries */}
            <div className="space-y-6">
              {(user.common_departments?.length ?? 0) > 0
                ? industries.map((industry, idx) => {
                    const userDepts = allUserDepartments.get(industry.id) || [];
                    const commonLabeled = user.common_departments!.map((c) => ({
                      ...c,
                      name: `${c.name} (Common)`,
                    }));
                    const combined = [...userDepts, ...commonLabeled];
                    const uniqueDepts = combined.filter(
                      (v, i, arr) => arr.findIndex((d) => d.id === v.id) === i
                    );

                    return (
                      <div
                        key={industry.id}
                        className={`rounded-2xl p-6 text-left shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl bg-gradient-to-br ${
                          gradientColors[idx % gradientColors.length]
                        }`}
                      >
                        <h2 className="text-2xl font-extrabold mb-3">{industry.name}</h2>
                        <div className="flex flex-wrap gap-3 mt-3">
                          {uniqueDepts.map((dept) => (
                            <span
                              key={dept.id}
                              className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm"
                            >
                              {dept.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                : (
                  <>
                    {user.challenge_data?.industry && (
                      <div
                        className={`rounded-2xl p-6 text-left shadow-lg bg-gradient-to-br ${gradientColors[0]}`}
                      >
                        <h2 className="text-2xl font-extrabold mb-3">{user.challenge_data.industry.name}</h2>
                        <div className="flex flex-wrap gap-3 mt-3">
                          {user.challenge_data.industry.departments
                            ?.filter((d) => user.challenge_data?.department_ids.includes(d.id))
                            .map((dept) => (
                              <span
                                key={dept.id}
                                className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm"
                              >
                                {dept.name}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {user.related_industries?.map((industry, idx) => (
                      <div
                        key={industry.id}
                        className={`rounded-2xl p-6 text-left shadow-lg bg-gradient-to-br ${
                          gradientColors[(idx + 1) % gradientColors.length]
                        }`}
                      >
                        <h2 className="text-2xl font-extrabold mb-3">{industry.name}</h2>
                        <div className="flex flex-wrap gap-3 mt-3">
                          {industry.departments.map((dept) => (
                            <span
                              key={dept.id}
                              className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm"
                            >
                              {dept.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
            </div>

            {/* Submitted Answers */}
            {user.submitted_answers && user.submitted_answers.length > 0 && (
              <div className="mt-10">
                <h2 className="text-2xl font-bold mb-6">Personality Highlights</h2>
                <div className="bg-white/10 rounded-2xl overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-white/20">
                        <th className="px-4 py-3">Area</th>
                        <th className="px-4 py-3">Preference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.submitted_answers.map((ans) => (
                        <tr key={ans.id} className="border-b border-white/10">
                          <td className="px-4 py-2">{ans.question?.title}</td>
                          <td className="px-4 py-2">{ans.selected_option}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-10 space-y-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full bg-[#0055FF] hover:bg-[#0042cc] text-white font-semibold py-3 rounded-xl transition duration-200"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
