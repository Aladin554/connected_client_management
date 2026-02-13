import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import { getMeCached } from "../../../utils/me";

export default function Tip() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");

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

  const handleSortCards = () => {
    navigate("/sort-cards");
  };

  const handleBack = () => {
    navigate("/instructions");
  };

  const handleLogout = () => {
    sessionStorage.clear();
  window.location.href = "/signin";
  };

  return (
    <>
      {/* Fonts & Styles */}
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

          /* Lamp button flashing animation */
          @keyframes pulseLamp {
            0%, 100% { transform: scale(1); box-shadow: 0 0 5px #a3dd2f; }
            50% { transform: scale(1.2); box-shadow: 0 0 15px #a3dd2f; }
          }
          .animate-pulseLamp {
            animation: pulseLamp 1.2s infinite;
          }
        `}
      </style>

      {/* Flex column wrapper */}
      <div
        className="text-white min-h-screen flex flex-col"
        style={{
          fontFamily:
            "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
          backgroundColor: "#080b3d",
        }}
      >
        {/* Header with dynamic userName */}
        <Header userName={userName} onLogout={handleLogout} />

        {/* Main content */}
        <main className="flex-grow flex flex-col items-center justify-center px-6 text-center pt-20">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Tip</h1>
          <p className="max-w-xl text-base leading-relaxed mb-10">
            You can see additional information about a challenge by clicking the
            <span className="inline-flex w-9 h-9 rounded-full bg-[#a3dd2f] items-center justify-center text-black shadow mx-1">
              <img src="images/lamp.png" alt="lamp icon" className="w-5 h-5" />
            </span>{" "}
            icon button in the top corner of the card.
          </p>

          {/* Gradient Card */}
          <section className="border border-white/40 p-8 rounded-[2.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] min-h-[200px] flex flex-col justify-between w-full max-w-md mx-auto">
            <div>
              <div className="flex items-start justify-between">
                <div className="text-sky-300/80 text-base font-semibold">Do you care to</div>
                <button
                  className="w-7 h-7 rounded-full bg-[#a3dd2f] flex items-center justify-center shadow hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-sky-300 animate-pulseLamp"
                  aria-label="Lamp Button"
                >
                  <img src="images/lamp.png" alt="lamp icon" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col items-center justify-center gap-6 mt-12">
            <button
              onClick={handleSortCards}
              className="px-6 py-3 rounded-full font-semibold shadow text-[#7B3FA1] bg-white transform transition-transform duration-300 hover:scale-105"
            >
              Sort cards
            </button>

            <button
              onClick={handleBack}
              className="px-6 py-3 rounded-full font-semibold text-white/90 border border-white/40 hover:bg-white/10 transition"
            >
              ↩ Back to instructions
            </button>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}
