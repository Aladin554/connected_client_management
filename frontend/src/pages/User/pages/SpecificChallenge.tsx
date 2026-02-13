// src/pages/User/pages/SpecificChallenge.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import Loader from "../../Loader/Loader";
import { getMeCached } from "../../../utils/me";

export default function SpecificChallenge() {
  const navigate = useNavigate();
  const location = useLocation();

  const clickedId = location.state?.challengeId;

  const [userName, setUserName] = useState<string>("");
  const [profileName, setProfileUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const me = await getMeCached();
        setUserName(`${me.last_name}`);
        setProfileUserName(`${me.first_name || "User"} ${me.last_name || ""}`);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);
  const handleLogout = () => {
    sessionStorage.clear();
  window.location.href = "/signin";
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Poppins:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <style>{`
        :root {
          --bg: #0f1533;
          --accent: #18e08a;
        }
        body {
          font-family: 'Poppins', sans-serif;
          background-color: #080b3d;
        }
      `}</style>

      {isLoading ? (
        <Loader message="Fetching user data..." />
      ) : (
        <div className="text-white bg-[#080b3d] min-h-screen flex flex-col">
          <Header userName={profileName} onLogout={handleLogout} />

           <main className="flex-1 flex flex-col items-center px-6 py-16 max-w-4xl mx-auto">
            <div className="w-full max-w-4xl bg-gradient-to-b from-[#0c1040] to-[#070a2f] 
              border border-gray-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white 
              transition-all duration-300">

              {/* Top Section */}
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-snug">
                  Alright{" "}
                  <span className="text-[#18e08a]">{userName}</span>
                  <span className="text-white">!</span>
                </h1>

                <p className="mt-3 text-sm sm:text-base text-gray-300 leading-relaxed">
                  Now that we know what type of work you find purpose in, it's
                  time for the <span className="text-white font-semibold">exciting part!</span>
                </p>

                <hr className="my-2 border-t border-gray-600" />

                {/* Instructions */}
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-white">Instructions</div>
                  </div>
                  <div className="absolute top-[-.1rem] right-[2rem] text-3xl text-gray-400 rotate-45">
                    ➜
                  </div>
                </div>

                <hr className="my-2 border-t border-gray-600" />

                <p className="text-sm sm:text-base text-gray-300">
                  In the next step we will ask you questions in{" "}
                  <span className="text-white font-semibold">two phases</span>.
                </p>

                {/* Timeline */}
                <div className="mt-3 relative pl-8">
                  <div className="absolute left-4 top-2 bottom-[90px] lg:bottom-[50px] w-0.5 bg-gray-500"></div>

                  {/* First Phase */}
                  <div className="relative mb-3">
                    <div className="absolute left-[-1.5rem] top-0 w-4 h-4 rounded-full bg-[#18e08a] shadow"></div>
                    <div className="ml-1">
                      <div className="text-base font-semibold text-white">
                        First Phase
                      </div>
                      <p className="mt-1 text-sm text-gray-300 leading-relaxed">
                        We will identify whether you care to work in any specific
                        roles{" "}
                        <span className="font-semibold text-white">
                          directly related to your chosen industry
                        </span>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Second Phase */}
                  <div className="relative">
                    <div className="absolute left-[-1.5rem] top-0 w-4 h-4 rounded-full bg-[#18e08a] shadow"></div>
                    <div>
                      <div className="text-base font-semibold text-white">
                        Second Phase
                      </div>
                      <p className="mt-1 text-sm text-gray-300 leading-relaxed">
                        We will identify whether you have any interest to work in{" "}
                        <span className="font-semibold text-white">
                          roles which are available in almost any industries
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="bg-[#0c1040]/70 backdrop-blur-md rounded-xl p-6 mt-10 border border-gray-700 shadow-inner">
                <h2
                  className="text-xl sm:text-2xl font-extrabold text-center"
                  style={{ color: "var(--accent)" }}
                >
                  Discover Yourself..
                </h2>

                <p className="mt-3 text-sm sm:text-base text-gray-300 text-center leading-relaxed">
                  This step is <span className="font-semibold text-white">crucial</span> because we want to explore{" "}
                  <span className="font-semibold text-white">
                    what type of role you’d like to take on
                  </span>{" "}
                  to help solve the challenge you care about!
                </p>

                <button
                  onClick={() =>
                    navigate("/first-phases", { state: { challengeId: clickedId } })
                  }
                  className="mt-5 w-full py-3 rounded-lg text-lg font-semibold shadow-lg transition-transform 
                  hover:scale-[1.03] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(90deg, var(--accent), #b9ff2f)",
                    color: "#0b0b0b",
                  }}
                >
                  Launch Module ➜
                </button>
              </div>
            </div>
          </main>

          <Footer />
        </div>
      )}
    </>
  );
}
