import { useNavigate } from "react-router-dom";
import Button from "../ui/button/Button";

export default function ChooseDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-lg dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <h2 className="mb-8 text-2xl font-bold text-center text-gray-900 dark:text-white">
          Choose Your Dashboard
        </h2>

        <div className="space-y-4">
          <Button
            className="w-full py-3 text-base font-medium"
            onClick={() => navigate("/dashboard", { replace: true })}
          >
            Go to Admin Dashboard
          </Button>

          <Button
            variant="outline"
            className="w-full py-3 text-base font-medium"
            onClick={() => navigate("/user-dashboard", { replace: true })}
          >
            Go to User Dashboard
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          You can change this later in your profile settings.
        </p>
      </div>
    </div>
  );
}