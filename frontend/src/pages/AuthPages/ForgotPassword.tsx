// src/pages/AuthPages/ForgotPassword.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!email) {
    toast.error("Please enter your email");
    return;
  }

  try {
    const res = await axios.post("/api/forgot-password", { email });
    toast.success(res.data.message);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.log(err.response?.data); // Check exact errors
      const message = err.response?.data?.message || "Something went wrong";
      toast.error(message);
    } else {
      toast.error("Unexpected error occurred!");
    }
  }
};


  return (
    <div className="flex flex-col flex-1 justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-white">
          Forgot Password
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Enter your email and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>
              Email <span className="text-error-500">*</span>
            </Label>
            <Input
              type="email"
              placeholder="info@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link
            to="/signin"
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
