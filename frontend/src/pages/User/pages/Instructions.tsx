// src/pages/User/pages/Instructions.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import { getMeCached } from "../../../utils/me";

export default function Instructions() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    document.title = "Connected — Instructions";
    document.documentElement.style.backgroundColor = "#080b3d";
    document.body.style.backgroundColor = "#080b3d";
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const me = await getMeCached();
        setUserName(`${me.last_name || ""}`);
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

  return (
    <>
      {/* Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Poppins:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <style>{`
        :root {
          --bg: #0f1533;
          --accent: #18e08a;
        }
        body {
          font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, 'Helvetica Neue', Arial;
          background-color: #080b3d;
          margin: 0;
          padding: 0;
        }
        .font-serif {
          font-family: 'Abril Fatface', serif;
        }

        .text-gradient {
          background: linear-gradient(to right, #18e08a, #0ae2ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Existing lamp pulse animation */
        @keyframes pulseLamp {
          0%, 100% { transform: scale(1); box-shadow: 0 0 5px #a3dd2f; }
          50% { transform: scale(1.2); box-shadow: 0 0 15px #a3dd2f; }
        }
        .animate-pulseLamp {
          animation: pulseLamp 1.2s infinite;
        }

        /* NEW flashGlow animation (for smaller tip lamp) */
        @keyframes flashGlow {
          0%, 100% { opacity: 1; box-shadow: 0 0 5px #a3dd2f; }
          50% { opacity: 0.6; box-shadow: 0 0 14px #a3dd2f; }
        }
        .animate-flashGlow {
          animation: flashGlow 1.2s infinite;
        }
      `}</style>

      <div
        className="min-h-screen flex flex-col text-white"
        style={{
          backgroundColor: "#080b3d",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <Header userName={userName} onLogout={handleLogout} />

        <main className="flex-1 flex flex-col items-center px-6 py-8 sm:py-16 text-center max-w-4xl mx-auto text-sm md:text-base text-white">

  {/* Title */}
  <h1 className="text-2xl md:text-3xl font-extrabold mb-4 tracking-tight">
            Instructions{" "}
            <span className="inline-block font-bold animate-[float_2s_ease-in-out_infinite]">
      👇
    </span>
          </h1>

  {/* Intro text */}
  <p className="leading-relaxed text-white/90 max-w-3xl mx-auto mb-2">
    <strong>First, let’s figure out the types of </strong>
    <strong className="text-[#4da6ff] font-bold">CHALLENGES</strong>
    <strong> in this world you deeply care about solving.</strong>
    <span className="font-normal">
      {" "}This will help us identify what type of work you find purpose in.
    </span>
  </p>

  {/* Sentence above card */}
  <p className="mb-3">
    Below is an example of a <strong>Challenge Card</strong> which you will find in the next step:
  </p>

  {/* Example Card */}
  <div className="mb-6">
            <section
              className="relative mx-auto w-55 sm:w-55 p-6 rounded-[2rem] border border-white/15 bg-white/5 backdrop-blur-xl shadow-lg"
              style={{ minHeight: "290px" }}
            >
              <div className="flex justify-between items-start mb-3 pr-2">
                <p className="text-white/70 text-[13px] font-medium text-left">
                  Do you care to
                </p>

                <button className="w-6 h-6 rounded-full bg-[#a3dd2f] shadow-md flex items-center justify-center mr-2 animate-pulseLamp">
                  <img src="/images/lamp.png" className="w-3.5 h-3.5" />
                </button>
              </div>

              <h1 className="text-[15px] leading-snug font-semibold text-white mt-1 text-left">
                Improve Public Health
                <br />And Well-Being,
                <br />
                <span className="text-[#a3dd2f]">
                  Provide Medical Care
                  <br />To Those In Need,
                </span>
                <br />And Advance Medical
                <br />Knowledge?
              </h1>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                <div className="w-10 h-10 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center text-xl font-bold text-white">
                  ?
                </div>
                <div className="w-10 h-10 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center text-xl font-bold text-red-500">
                  ✕
                </div>
                <div className="w-10 h-10 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center text-xl font-bold text-green-500">
                  ✓
                </div>
              </div>
            </section>
          </div>

  {/* Legend */}
  <p className="max-w-2xl mx-auto mb-2">
    For each card, select whether you are{" "}
    <span className="text-green-400 font-bold">“Very Interested” ✓</span>{" "}
    |{" "}
    <span className="text-red-400 font-bold">“Not Interested” ✕</span>{" "}
    |{" "}
    <span className="text-white/70">“Not Sure?” ?</span>
  </p>

  {/* Tip */}
  <p className="max-w-2xl mx-auto mb-5">
    Tip: You can see additional information about a card by clicking the{" "}
    <strong className="inline-flex items-center gap-2">
      lamp icon in the top corner of the card.
      <button className="w-6 h-6 rounded-full bg-[#a3dd2f] shadow-md flex items-center justify-center animate-flashGlow">
        <img src="/images/lamp.png" className="w-3.5 h-3.5" />
      </button>
    </strong>
  </p>

  {/* Launch Button */}
  <button
    onClick={() => navigate("/sort-cards")}
    className="w-full sm:w-auto bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 px-9 rounded-full shadow-md hover:-translate-y-0.5 transition-all"
  >
    Launch <span className="text-xl">🚀</span>
  </button>

</main>



        <Footer />
      </div>
    </>
  );
}
