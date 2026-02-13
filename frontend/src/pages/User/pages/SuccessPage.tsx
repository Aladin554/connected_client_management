// src/pages/User/pages/SuccessPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import { getMeCached } from "../../../utils/me";

export default function SuccessPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    document.title = "Connected — Success";
  }, []);

  // Fetch logged-in user's name
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const me = await getMeCached();
        setUserName(`${me.first_name} ${me.last_name}`);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();
  }, []);

  const handleLogoutClick = () => {
    sessionStorage.clear();
  window.location.href = "/signin";
  };

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
    
          <div
            className="text-white bg-[#080b3d] min-h-screen"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {/* Header */}
            <Header userName={userName} onLogout={handleLogoutClick} />

        {/* Main */}
        <main className="flex flex-col items-center justify-center text-center px-6 py-20 flex-1">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold">You made it!</h1>
            <p className="text-sm mt-2 text-gray-200">
              Now what? Download your Challenge Profile and learn how to take
              action.
            </p>
          </div>

          {/* Card */}
          <div className="bg-[var(--bg)] border-2 border-white rounded-2xl shadow-xl w-[370px] overflow-hidden relative">
            <div className="relative text-white rounded-t-2xl p-6">
              {/* Logo */}
              <div className="flex items-center space-x-2 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 2v20m10-10H2m14.142-7.071L5.858 18.364m12.284 0L5.858 5.636"
                  />
                </svg>
                <span className="font-bold tracking-wide text-lg">
                  CONNECTED
                </span>
              </div>

              {/* Illustration */}
              <div className="absolute top-0 right-0 w-40 h-40">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 200 200"
                  className="w-full h-full"
                >
                  <circle
                    cx="100"
                    cy="100"
                    r="100"
                    fill="#fff"
                    opacity="0.12"
                  />
                  <path
                    d="M30 150 L100 50 L170 150 Z"
                    fill="#fff"
                    opacity="0.25"
                  />
                  <circle cx="100" cy="50" r="6" fill="#fff" />
                </svg>
              </div>

              {/* Mini cards */}
              <div className="absolute top-16 left-4 w-20">
                <div className="absolute transform rotate-[-10deg] bg-yellow-400 rounded-md w-16 h-24 shadow-lg -left-2 top-2 z-0"></div>
                <div className="absolute transform rotate-[5deg] bg-red-400 rounded-md w-16 h-24 shadow-lg left-3 top-2 z-10"></div>
                <div className="relative bg-teal-500 rounded-md w-16 h-24 shadow-lg z-20 flex items-center justify-center text-[10px]">
                  <p className="text-center text-white px-2">
                    CHOOSE YOUR FUTURE CHALLENGE
                  </p>
                </div>
              </div>

              {/* Title */}
              <div className="mt-32 text-center">
                <h2 className="text-2xl font-bold">
                  Your Challenges, <br /> Your Path
                </h2>
                <p className="mt-3 text-sm font-medium">
                  HOW TO USE YOUR CHALLENGE PROFILE
                  <br />
                  TO CREATE YOUR PATH
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-16 flex flex-col items-center space-y-5">
            <button
              className="px-6 py-3 rounded-full font-semibold text-white bg-[#146ff5] hover:bg-[#146ff5]/90 hover:scale-105 transition-transform shadow-lg"
            >
              Sort the Cards again
            </button>
            <button className="px-8 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-green-400 to-teal-500 hover:from-green-500 hover:to-teal-600 hover:scale-105 transition-transform shadow-lg">
              Download your profile
            </button>
            <a
              href="#"
              className="text-purple-400 font-medium underline hover:text-purple-200 transition"
            >
              Email me the profile instead
            </a>
            <a
              href="#"
              className="text-purple-400 font-medium underline hover:text-purple-200 transition"
            >
              I require an accessible PDF
            </a>
          </div>
        </main>

        {/* ✅ Shared Footer */}
        <Footer />
      </div>
    </>
  );
}
