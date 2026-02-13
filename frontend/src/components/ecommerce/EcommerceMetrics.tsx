// src/components/Metrics.tsx
import { useEffect, useState } from "react";
import { GroupIcon, BoxIconLine } from "../../icons";
import { Plus, ArrowRight, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { getMeCached } from "../../utils/me";

interface CurrentUser {
  can_create_users: number;
}

interface DashboardCounts {
  users?: number;
  industries?: number;
  departments?: number;
  sub_departments?: number; // Add sub-departments count
}

export default function Metrics() {
  const [userCount, setUserCount] = useState(0);
  const [industryCount, setIndustryCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [subDepartmentCount, setSubDepartmentCount] = useState(0); // Sub-department count
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Dashboard counts
        const countsRes = await api.get("/dashboard-counts");
        const data: DashboardCounts = countsRes.data;
        setUserCount(data.users || 0);
        setIndustryCount(data.industries || 0);
        setDepartmentCount(data.departments || 0);

        // Sub-departments count (if not included in dashboard-counts API)
        const subDeptRes = await api.get("/sub-departments");
        setSubDepartmentCount(subDeptRes.data.data?.length || 0);

        // Current user
        const me = await getMeCached();
        setCurrentUser(me as any);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const CardInner = ({ children }: { children: React.ReactNode }) => (
    <div
      className="h-full rounded-3xl bg-white dark:bg-gray-900 p-8
      shadow-md hover:shadow-xl transition-all duration-300
      hover:-translate-y-1"
    >
      {children}
    </div>
  );

  return (
    <div className="w-full flex flex-wrap justify-center gap-6">
      {/* Users */}
      {/* <div className="w-[220px] p-[2px] rounded-3xl bg-gradient-to-br from-blue-400/70 to-indigo-600/70">
        <CardInner>
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-blue-500/30">
            <GroupIcon className="size-6 text-white" />
          </div>
          <div className="mt-6">
            <span className="text-sm text-gray-500 dark:text-gray-400">Active Users</span>
            <h4 className="mt-2 text-3xl font-extrabold text-gray-800 dark:text-white">
              {loading ? "—" : userCount}
            </h4>
          </div>
        </CardInner>
      </div> */}

      {/* Industries */}
      {/* <div className="w-[220px] p-[2px] rounded-3xl bg-gradient-to-br from-emerald-400/70 to-teal-600/70">
        <CardInner>
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
            <BoxIconLine className="size-6 text-white" />
          </div>
          <div className="mt-6">
            <span className="text-sm text-gray-500 dark:text-gray-400">Industries</span>
            <h4 className="mt-2 text-3xl font-extrabold text-gray-800 dark:text-white">
              {loading ? "—" : industryCount}
            </h4>
          </div>
        </CardInner>
      </div> */}

      {/* Departments */}
      {/* <div className="w-[220px] p-[2px] rounded-3xl bg-gradient-to-br from-orange-400/70 to-amber-600/70">
        <CardInner>
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
            <Layers className="size-6 text-white" />
          </div>
          <div className="mt-6">
            <span className="text-sm text-gray-500 dark:text-gray-400">Category</span>
            <h4 className="mt-2 text-3xl font-extrabold text-gray-800 dark:text-white">
              {loading ? "—" : departmentCount}
            </h4>
          </div>
        </CardInner>
      </div> */}

      {/* Sub-Departments */}
      {/* <div className="w-[220px] p-[2px] rounded-3xl bg-gradient-to-br from-purple-400/70 to-pink-600/70">
        <CardInner>
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
            <Layers className="size-6 text-white" />
          </div>
          <div className="mt-6">
            <span className="text-sm text-gray-500 dark:text-gray-400">Departments</span>
            <h4 className="mt-2 text-3xl font-extrabold text-gray-800 dark:text-white">
              {loading ? "—" : subDepartmentCount}
            </h4>
          </div>
        </CardInner>
      </div> */}

      {/* Add User */}
      {currentUser?.can_create_users === 1 && (
        <Link
          to="/dashboard/admin-users/add"
          className="w-[220px] p-[2px] rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600"
        >
          <CardInner>
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/40">
              <Plus className="size-8 text-white" />
            </div>
            <h4 className="mt-6 text-xl font-bold text-gray-800 dark:text-white">Add New User</h4>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
              <span>Create User</span>
              <ArrowRight className="size-4" />
            </div>
          </CardInner>
        </Link>
      )}
    </div>
  );
}
