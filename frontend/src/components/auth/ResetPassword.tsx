import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/axios"; // your axios instance

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [password_confirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e: any) => {
    e.preventDefault();

    try {
      const res = await api.post("/reset-password", {
        token,
        email,
        password,
        password_confirmation
      });

      setMessage(res.data.message);

      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-5">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md">

        <h2 className="text-2xl font-bold text-center mb-4">
          Reset Your Password
        </h2>

        {message && (
          <p className="text-green-600 text-center mb-3">{message}</p>
        )}
        {error && (
          <p className="text-red-600 text-center mb-3">{error}</p>
        )}

        <form onSubmit={handleReset}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded-lg"
              value={password_confirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-500 text-white py-2 rounded-lg hover:bg-brand-600"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
