// src/pages/User/pages/QACompletion.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Header from "../Header";
import Footer from "../Footer";
import { getMeCached } from "../../../utils/me";

export default function QACompletion() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

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

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/signin";
  };

  const handleSendToCounsellor = async () => {
    try {
      await api.put("/reports/update-status", { report_notification: 1 });
      setShowModal(true);
    } catch (err) {
      console.error("Failed to update report:", err);
      alert("Failed to send report to counsellor. Please try again.");
    }
  };

  const handleModalOk = () => {
    setShowModal(false);
    navigate("/dashboard");
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Poppins:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <style>{`
        body { font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, 'Helvetica Neue', Arial; background-color: #080b3d; }
      `}</style>

      <div className="text-white bg-[#080b3d] min-h-screen flex flex-col">
        <Header userName={userName} onLogout={handleLogout} />

        <main className="flex-1 flex flex-col mt-5 items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl bg-[#0c1240]/90 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 flex flex-col items-center">

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1 text-center">
              Congratulations!
            </h1>

            {/* Description */}
            <p className="text-gray-300 text-xs sm:text-sm text-center mb-1">
              We’ve reached the <span className="font-semibold text-white">end of the line!</span>
            </p>
            <p className="text-gray-400 text-[10px] sm:text-xs text-center mb-4 leading-tight">
              Thanks for sharing your preferences with us! It’s helped us understand your goals
              better, so we can guide you toward the <span className="font-semibold text-white">perfect program</span>.
            </p>

            {/* Steps */}
            <div className="w-full border-t border-b border-gray-700 py-2 mb-6">
              {[ "Program Preferences", "Career Preferences", "Personality Assessment" ].map((label, i) => (
                <div key={i} className="flex justify-between items-center py-1 text-xs sm:text-sm">
                  <span className="font-semibold text-gray-100">{label}</span>
                  <span className="w-3 h-3 rounded-full bg-green-400"></span>
                </div>
              ))}
            </div>

            {/* Progress Circle */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="progressGradient" x1="1" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00ff95" />
                      <stop offset="100%" stopColor="#a0ff00" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="url(#progressGradient)"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray="283"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col justify-center items-center">
                  <span className="text-2xl sm:text-3xl md:text-3xl font-extrabold text-white">100%</span>
                </div>
              </div>
            </div>


            {/* Send to Counsellor Button */}
            <button
              onClick={handleSendToCounsellor}
              className="w-full bg-[#0066ff] hover:bg-[#0051cc] text-white font-semibold text-sm sm:text-base py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-transform transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              Send to Counsellor
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </main>

        <Footer />

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-gray-900 rounded-3xl p-6 sm:p-8 w-11/12 sm:w-96 shadow-2xl animate-fadeIn">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 text-center">
                Report Completed
              </h2>
              <p className="text-gray-300 text-[11px] sm:text-sm text-center mb-4 leading-tight">
                Your program counselling session has been completed.<br />
                Please speak to your counsellor regarding next steps.
              </p>
              <button
                onClick={handleModalOk}
                className="w-full bg-[#18e08a] hover:bg-[#12b46b] text-black font-semibold py-2 px-4 rounded-xl transition-all shadow-lg"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
