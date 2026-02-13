// src/pages/User/pages/SelectSpecificChallenge.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import { getMeCached } from "../../../utils/me";

export default function SelectSpecificChallenge() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    document.title = "Connected — Challenge Cards";
  }, []);

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

  const handleSelect = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else {
      if (selected.length < 1) {
        setSelected([...selected, id]);
      } else {
        alert("You can only select up to 1 challenge!");
      }
    }
  };

  const handleConfirm = () => {
    if (selected.length === 1) {
      navigate("/success-page", { state: { challenges: selected } });
    } else {
      alert("Please select exactly 1 challenge.");
    }
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
        `}
      </style>

      <div
        className="text-white bg-[#080b3d] min-h-screen"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        {/* Header */}
        <Header userName={userName} onLogout={handleLogoutClick} />

        {/* Main */}
        <main className="flex-1 flex flex-col items-center px-4 sm:px-6 mt-6 w-full">
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-center mt-4 text-[--accent]">
            Pick Your Top 1
          </h2>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mt-6 max-w-7xl w-full">
            {[1, 2, 3, 4, 5].map((id) => {
              const isSelected = selected.includes(id);
              return (
                <section
                  key={id}
                  className={`border p-3 sm:p-6 rounded-2xl sm:rounded-[2rem] min-h-[200px] sm:min-h-[250px] flex flex-col justify-between hover:scale-105 transition
                  ${
                    isSelected
                      ? "border-[var(--accent)] bg-[rgba(24,224,138,0.1)]"
                      : "border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="text-sky-300/70 text-xs sm:text-base font-semibold">
                        Do you care to
                      </div>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#a3dd2f] flex items-center justify-center shadow hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-sky-300"
                      >
                        <img
                          src="/images/lamp.png"
                          alt="lamp icon"
                          className="w-3 h-3 sm:w-4 sm:h-4"
                        />
                      </button>
                    </div>

                    <h1 className="mt-3 sm:mt-5 text-sm sm:text-xl leading-snug font-bold sm:font-extrabold tracking-tight">
                      Software
                      <span className="block text-[--accent]">
                        Builds apps, websites, and systems.
                      </span>
                      Coding, problem solving, teamwork.
                    </h1>
                  </div>

                  <div className="mt-4 sm:mt-8 flex justify-center">
                    <button
                      onClick={() => handleSelect(id)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border text-xs sm:text-base font-bold transition
                        ${
                          isSelected
                            ? "bg-[var(--accent)] text-black border-[var(--accent)]"
                            : "bg-white/5 text-white/80 border-white/50 hover:bg-white/10"
                        }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>
                </section>
              );
            })}
          </div>

          {/* Confirm Button */}
          <div className="mt-6 sm:mt-8 mb-12">
            <button
              disabled={selected.length !== 1}
              onClick={handleConfirm}
              className={`flex items-center justify-center gap-2 px-5 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-lg font-bold transition
                ${
                  selected.length === 1
                    ? "bg-[--accent] hover:bg-[#1cd3a2] text-black"
                    : "bg-gray-500 cursor-not-allowed text-black"
                }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Confirm
            </button>
          </div>
        </main>

        {/* Footer */}
        <Footer />

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white text-black rounded-2xl sm:rounded-3xl max-w-xs sm:max-w-sm w-full p-4 sm:p-6 relative shadow-xl overflow-y-auto max-h-[90vh]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-200"
              >
                ✕
              </button>

              <div className="text-gray-500 text-xs sm:text-base font-semibold">
                Do you care to
              </div>
              <h3 className="text-lg sm:text-2xl font-black leading-snug mt-1">
                Healthcare and <br /> Medicine Industry?
              </h3>

              <img
                src="/images/download.jpg"
                alt="Doctor"
                className="rounded-xl mt-3 sm:mt-4 w-full max-h-28 sm:max-h-40 object-cover"
              />

              <div className="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed">
                <p>Your work will involve mitigating challenges such as:</p>
                <p className="mt-2">
                  <a
                    href="#"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Global Health Security
                  </a>
                  <br />
                  <span className="text-gray-700">
                    Strengthening health systems to prevent and respond to global
                    health threats.
                  </span>
                </p>
                <p className="mt-3">
                  <a
                    href="#"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Mental Health and Wellness Coaching
                  </a>
                  <br />
                  <span className="text-gray-700">
                    Providing support to enhance mental well-being and cope with
                    life challenges.
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
