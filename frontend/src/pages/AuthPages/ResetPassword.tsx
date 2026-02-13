import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "../../api/axios";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get("token");
  const email = params.get("email"); 

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Email missing from reset link");
      return;
    }

    try {
      const res = await axios.post("/reset-password", {
        token,
        email,
        password,
        password_confirmation: confirm,
      });

      setMsg("Password reset successful! Redirecting...");
      setError("");

      // Redirect after 1.5 seconds
      setTimeout(() => {
        navigate("/signin");
      }, 1500);

    } catch (err) {
      setError("Invalid or expired link");
      setMsg("");
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h2 className="text-xl font-bold mb-3">Reset Password</h2>

      <form onSubmit={handleReset}>
        <input
          type="password"
          placeholder="New password"
          className="border p-2 w-full rounded mb-3"
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm password"
          className="border p-2 w-full rounded mb-3"
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Reset Password
        </button>
      </form>

      {msg && <p className="mt-3 text-green-500">{msg}</p>}
      {error && <p className="mt-3 text-red-500">{error}</p>}
    </div>
  );
}
