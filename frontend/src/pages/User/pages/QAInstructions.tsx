// src/pages/User/pages/QAInstructions.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import Loader from "../../Loader/Loader";
import { getMeCached } from "../../../utils/me";

export default function QAInstructions() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const me = await getMeCached();
        setUserName(`${me.first_name} ${me.last_name}`);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/signin";
  };

  const firstName = userName.split(" ")[0];
  const lastName = userName.split(" ")[1] || "";

  if (loading) return <Loader message="Fetching user data..." />;

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
        @keyframes fillProgress {
          0% { stroke-dashoffset: 283; }
          100% { stroke-dashoffset: 70; }
        }
      `}</style>

      <div className="text-white bg-[#080b3d] min-h-screen flex flex-col">
        <Header userName={userName} onLogout={handleLogout} />

        {/* Centered main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-12 py-4 sm:py-6 lg:py-8">

          <div
            className="
              w-full max-w-xl sm:max-w-2xl lg:max-w-3xl
              bg-[#0f1533]/75 backdrop-blur-lg
              border border-white/10
              rounded-2xl sm:rounded-3xl
              shadow-2xl
              p-4 sm:p-6 lg:p-8
              flex flex-col items-center
              overflow-hidden
            "
          >

            {/* Animated Circle */}
            <div
              className="
                relative
                w-32 h-32
                sm:w-40 sm:h-40
                lg:w-40 lg:h-40
                xl:w-40 xl:h-40
                mb-6 sm:mb-8 lg:mb-6
                flex items-center justify-center
              "
            >
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="progressGradient" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="10"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="url(#progressGradient)"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray="283"
                  strokeDashoffset="283"
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  className="animate-[fillProgress_2.5s_ease-out_forwards]"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xs sm:text-sm text-gray-400 font-medium tracking-wider">
                  STEP
                </span>
                <span className="text-2xl sm:text-3xl lg:text-3xl font-black mt-1">
                  3 of 3
                </span>
              </div>
            </div>

            {/* Title */}
            <h1
              className="
                text-xl sm:text-2xl lg:text-3xl xl:text-3xl
                font-extrabold
                mb-2 sm:mb-4 lg:mb-3
                text-center
                leading-tight
              "
            >
              Amazing{" "}
              <span className="text-[#c084fc]">
                {lastName || firstName}!
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="
                text-gray-300
                text-xs sm:text-sm lg:text-base xl:text-base
                text-center
                mb-4 sm:mb-6 lg:mb-4
                max-w-md
              "
            >
              This is the{" "}
              <span className="text-white font-semibold">
                final step {lastName ? lastName + "!" : ""}
              </span>
            </p>

            {/* Instructions Divider */}
            <div
              className="
                border-t border-b border-gray-600/70
                py-2 lg:py-1
                flex justify-between items-center
                w-full
                mb-4 sm:mb-6 lg:mb-4
                text-xs sm:text-sm
              "
            >
              <span className="tracking-wider font-bold uppercase">
                Instructions
              </span>
            </div>

            {/* Description */}
            <div className="w-full">
  <p
    className="
      text-gray-300
      text-xs sm:text-sm lg:text-sm
      leading-relaxed
      text-left
      mb-6 sm:mb-8 lg:mb-5
      max-w-none lg:max-w-2xl xl:max-w-3xl
    "
  >
    Now we would like to explore your personality on a deeper level so
    we can connect your{" "}
    <span className="text-white font-semibold">
      interests and preferences
    </span>{" "}
    to the characteristics of each role.
    <br />
    <br />
    In this final step, we will ask you{" "}
    <span className="text-white font-semibold">20 questions</span>.
    Please answer them carefully — your answers help us find the best
    match for you!
  </p>
</div>

            {/* CTA Button */}
            <button
              onClick={() => navigate("/questionnaire")}
              className="
                w-full sm:w-3/5 lg:w-1/2 xl:w-2/5
                bg-gradient-to-r from-indigo-600 to-indigo-500
                hover:from-indigo-500 hover:to-blue-600
                text-white font-semibold
                text-sm sm:text-base
                py-3 sm:py-4 lg:py-3
                px-6 sm:px-8
                rounded-2xl
                shadow-lg shadow-indigo-900/40
                transition-all duration-300
                transform hover:scale-[1.02] active:scale-95
              "
            >
              Get Started →
            </button>

          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
