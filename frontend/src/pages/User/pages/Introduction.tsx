import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Header from "../Header";
import Footer from "../Footer";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function Introduction() {
  const [userName, setUserName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [showVideo, setShowVideo] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);

  const navigate = useNavigate();
  const playerRef = useRef<any>(null);

  /* ---------------- Page title ---------------- */
  useEffect(() => {
    document.title = "Connected — Introduction";
  }, []);

  /* ---------------- Fetch user + video_status ---------------- */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile");

        setUserName(res.data.last_name || "");
        setProfileName(
          `${res.data.first_name || "User"} ${res.data.last_name || ""}`
        );

        setVideoWatched(res.data.video_status === 1);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };

    fetchProfile();
  }, []);

  /* ---------------- Logout ---------------- */
  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/signin";
  };

  /* ---------------- Load YouTube API & Player ---------------- */
  useEffect(() => {
    if (!showVideo) return;

    if (!document.getElementById("youtube-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("youtube-player", {
        videoId: "uQZ3Whq5yAg",
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onStateChange: async (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              try {
                await api.post("/video-status"); // save to backend
                setVideoWatched(true);
                setShowVideo(false);
              } catch (err) {
                console.error("Failed to update video status", err);
              }
            }
          },
        },
      });
    };
  }, [showVideo]);

  return (
    <>
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

          }
        `}
      </style>

      <div className="min-h-screen flex flex-col text-white">
        <Header userName={profileName} onLogout={handleLogout} />

        <main className="flex-1 flex flex-col items-center px-4 py-8 sm:py-16 text-center max-w-4xl mx-auto">
          <div className="max-w-3xl mx-auto space-y-5">

            <h1 className="text-2xl md:text-4xl font-bold flex justify-center gap-2">
              Hi {userName}! <span className="animate-bounce">👋</span>
            </h1>

            <h2 className="text-xl md:text-2xl font-semibold text-cyan-400">
              Welcome to Connected Program Advising System!
            </h2>

            <div className="text-gray-200 space-y-5 leading-relaxed">
              <p>
                Discover your <span className="text-white font-medium">dream study program</span> based on
                your passion, personality, and career goals. 🚀
              </p>
              <p>
                We guide you step-by-step and match your purpose with the
                <span className="text-white font-medium"> most suitable program</span>. ✨
              </p>
            </div>

            <p className="text-xl font-extrabold mt-10">
              Ready? Let’s Get Started.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">

              <button
                onClick={() => setShowVideo(true)}
                className="px-8 py-3 rounded-full font-extrabold bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 transition flex items-center justify-center gap-2 text-center"
              >
                Watch Demo ▶️
              </button>


              <button
                onClick={() => navigate("/instructions")}
                disabled={!videoWatched}
                className={`px-7 py-3 rounded-full font-extrabold transition-all ${
                  videoWatched
                    ? "bg-blue-500 hover:bg-blue-400"
                    : "bg-blue-500 opacity-50 cursor-not-allowed"
                }`}
              >
                Get Started ✨
              </button>

            </div>
          </div>
        </main>

        <Footer />

        {/* ---------------- Video Modal ---------------- */}
        {showVideo && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="relative w-full max-w-5xl h-[80vh]">
              <div
                id="youtube-player"
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-xl"
              ></div>
            </div>

            {!videoWatched && (
              <p className="text-sm text-gray-400 mt-4 text-center w-full absolute bottom-16">
                You must watch the full video to continue.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
