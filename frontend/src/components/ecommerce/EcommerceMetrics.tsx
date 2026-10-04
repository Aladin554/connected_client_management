// src/components/Metrics.tsx
import { Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMeCached, type Me } from "../../utils/me";

export default function Metrics() {
  const [currentUser, setCurrentUser] = useState<Me | null>(null);

  useEffect(() => {
    getMeCached({ force: true })
      .then(setCurrentUser)
      .catch((err) => console.error("Dashboard fetch error:", err));
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
