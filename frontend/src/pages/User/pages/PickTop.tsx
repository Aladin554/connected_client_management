import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import { getMeCached } from "../../../utils/me";

export default function PickTop() {
  const [userName, setUserName] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();

  const { selectedIds } = location.state || { selectedIds: [] };

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

  const handleNextClick = () => {
    navigate("/sort-three-challenge-card", { state: { selectedIds } });
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
          :root { --bg: #0f1533; --accent: #18e08a; }
          body { font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, 'Helvetica Neue', Arial; background-color: #080b3d; }
          .font-serif { font-family: 'serif'; }
        `}
      </style>

      <div className="text-white bg-[#080b3d] min-h-screen flex flex-col" style={{ fontFamily: "Poppins, sans-serif" }}>
        {/* Header */}
        <Header userName={userName} onLogout={handleLogoutClick} />

        {/* Main content */}
         <main className="flex-1 flex flex-col items-center px-6 py-16 text-center max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-4">
            Excellent! ⭐️
          </h1>

          <p className="text-lg text-gray-300 max-w-2xl">
            Now, take a look at the Challenges you're <span className="font-semibold text-white">highly interested</span> to solve!
          </p>

          <button
            onClick={handleNextClick}
            className="mt-8 w-full sm:w-auto bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 px-7 rounded-full flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 transition-all"
          >
            See Cards👉
          </button>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}
