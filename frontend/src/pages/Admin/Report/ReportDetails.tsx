import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../../api/axios";
import { ArrowLeft } from "lucide-react";

interface SubDepartment {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  sub_departments?: SubDepartment[];
}

interface Industry {
  id: number;
  industry: string;
  departments: Department[];
}

interface CommonDepartment {
  id: number;
  name: string;
}

interface SubmittedAnswer {
  id: number;
  selected_option: string;
  question: {
    id?: number;
    title: string;
  };
}

interface UserInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    user: UserInfo;
    industries: Industry[];
    common_departments: CommonDepartment[];
    submitted_answers: SubmittedAnswer[];
  };
}

export default function ReportDetails() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [commonDepartments, setCommonDepartments] = useState<CommonDepartment[]>([]);
  const [submittedAnswers, setSubmittedAnswers] = useState<SubmittedAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get<ApiResponse>(`/reports/${id}`);
        const responseData = res.data.data;

        setUser(responseData.user);
        setIndustries(responseData.industries || []);
        setCommonDepartments(responseData.common_departments || []);
        setSubmittedAnswers(responseData.submitted_answers || []);
      } catch (error) {
        console.error(error);
        alert("Failed to load user report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading)
    return <div className="p-6 text-center text-gray-700 dark:text-gray-200">Loading...</div>;

  if (!user)
    return <div className="p-6 text-center text-red-500 dark:text-red-400">User not found.</div>;

  return (
    <div className="p-5 lg:p-8 max-w-[95vw] mx-auto">
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6 lg:p-8 space-y-8 w-[900px]">
        {/* Back Button */}
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/users-report"
            className="flex items-center text-blue-600 hover:underline"
          >
            <ArrowLeft size={18} className="mr-2" /> Back to Reports
          </Link>
        </div>

        <h1 className="text-3xl font-bold dark:text-gray-100">User Report Details</h1>

        {/* User Info */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user.first_name} {user.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Industries & Departments */}
        {industries.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6">
            <h2 className="text-2xl font-semibold mb-6 dark:text-gray-100">
              Industries & Departments
            </h2>

            {industries.map((industry) => (
              <div key={industry.id} className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {industry.industry}
                </p>

                {industry.departments.length > 0 ? (
                  <ul className="ml-5 space-y-3">
                    {industry.departments.map((dept) => (
                      <li key={dept.id}>
                        <p className="font-medium text-gray-800 dark:text-gray-300">{dept.name}</p>
                        {dept.sub_departments && dept.sub_departments.length > 0 && (
                          <ul className="ml-5 list-disc list-inside text-gray-700 dark:text-gray-400">
                            {dept.sub_departments.map((sub) => (
                              <li key={sub.id}>{sub.name}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No departments selected.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Common Departments */}
        {commonDepartments.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 space-y-4">
            <h2 className="text-2xl font-semibold mb-4 dark:text-gray-100">Common Departments</h2>
            <ul className="list-disc list-inside ml-5 text-gray-800 dark:text-gray-300 space-y-1">
              {commonDepartments.map((dept) => (
                <li key={dept.id}>{dept.name}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submitted Answers */}
        {submittedAnswers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <h2 className="text-2xl font-semibold mb-6 dark:text-gray-100">
              Personality Highlights
            </h2>
            <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left">Area</th>
                  <th className="px-4 py-3 text-left">Preference</th>
                </tr>
              </thead>
              <tbody>
                {submittedAnswers.map((ans) => (
                  <tr key={ans.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-2">{ans.question?.title || "-"}</td>
                    <td className="px-4 py-2">{ans.selected_option || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
