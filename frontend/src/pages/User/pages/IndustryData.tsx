import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Header from "../Header";
import Footer from "../Footer";
import { getMeCached } from "../../../utils/me";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

interface Category {
  id: number;
  title: string;
  name: string;
  modal_image?: string;
  modal_description?: string;
}

export default function IndustryData() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentModalData, setCurrentModalData] = useState<Category | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Connected — Challenge Cards";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [me, catRes] = await Promise.all([getMeCached(), api.get("/industry")]);

        setUserName(`${me.first_name} ${me.last_name}`);

        const data: Category[] = catRes.data.data || catRes.data;

        const formatted = data
          .filter((item: any) => item.demo_status === 1) // ✅ only active cards
          .map((item) => ({
            ...item,
            modal_image: item.modal_image
              ? item.modal_image.startsWith("http")
                ? item.modal_image
                : `${import.meta.env.VITE_API_URL}/storage/${item.modal_image}`
              : undefined,
          }));

        setCategories(formatted);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const openModal = (category: Category) => {
    setCurrentModalData(category);
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

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

      {isLoading ? (
        <div className="fixed inset-0 bg-[#080b3d] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="w-8 h-8 border-4 border-white/30 border-t-[--accent] rounded-full animate-spin"></div>
            <span className="text-sm text-white/70">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="text-white bg-[#080b3d] min-h-screen">
          <Header userName={userName} onLogout={handleLogoutClick} />

          <main className="min-h-[70vh] flex flex-col items-center relative px-6">
            <div
  className={`
    mt-10 w-full gap-7 grid justify-center
    ${(() => {
      switch (categories.length) {
        case 1:
          return "place-items-center min-h-[60vh] max-w-[300px] mx-auto";
        case 2:
          return "grid-cols-1 sm:grid-cols-2 place-items-center max-w-[600px] mx-auto";
        case 3:
          return "grid-cols-1 sm:grid-cols-3 place-items-center max-w-[900px] mx-auto";
        default:
          return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-[950px] mx-auto";
      }
    })()}
  `}
>


              {categories.map((category) => (
                <section
                  key={category.id}
                  className="border border-white/40 p-6 sm:p-8 md:p-10 rounded-[2.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] flex flex-col justify-between min-h-[420px]"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="text-sky-300/80 text-base font-semibold">Do you care to</div>
                      <button
                        onClick={() => openModal(category)}
                        className="w-7 h-7 rounded-full bg-[#a3dd2f] flex items-center justify-center shadow hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-sky-300"
                        aria-label="Lamp Button"
                      >
                        <img src="images/lamp.png" alt="lamp icon" className="w-4 h-4" />
                      </button>
                    </div>

                    <h1
                      className="mt-5 text-xl leading-snug font-extrabold tracking-tight text-white"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(category.title) }}
                    />
                  </div>

                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-4">
                      <button className="flex items-center justify-center w-14 h-14 rounded-2xl border border-white/60 bg-white/5 text-white/80 text-xl font-bold hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300" aria-label="Maybe">?</button>
                      <button className="flex items-center justify-center w-14 h-14 rounded-2xl border border-white/60 bg-white/5 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="No">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <button className="flex items-center justify-center w-14 h-14 rounded-2xl border border-white/60 bg-white/5 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[--accent]" aria-label="Yes">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[--accent]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-16 flex flex-col items-center space-y-5">
              <button onClick={() => navigate("/introduction")} className="px-6 py-3 rounded-full font-semibold text-white bg-blue-500/90 hover:bg-[#146ff5]/90 hover:scale-105 transition-transform shadow-lg">
                Sort the Cards again
              </button>

              <button className="px-8 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-green-400 to-teal-500 hover:from-green-500 hover:to-teal-600 hover:scale-105 transition-transform shadow-lg">
                Download your profile
              </button>

              <a href="#" className="text-white-400 font-medium underline hover:text-white-200 transition">
                Email me the profile instead
              </a>
              <a href="#" className="text-white-400 font-medium underline hover:text-white-200 transition">
                I require an accessible PDF
              </a>
            </div>
          </main>

          <Footer />

          {isModalOpen && currentModalData && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white text-black rounded-3xl max-w-sm w-full p-6 relative shadow-xl overflow-y-auto max-h-[90vh]">
                <button onClick={closeModal} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200">✕</button>
                <div className="text-gray-500 text-base font-semibold">Do you care to</div>
                <h3 className="text-2xl font-black leading-snug mt-1">{currentModalData.name}</h3>

                {currentModalData.modal_image && (
                  <img src={currentModalData.modal_image} alt={currentModalData.name} className="rounded-xl mt-4 w-full max-h-40 object-cover" />
                )}

                {currentModalData.modal_description && (
                  <div
                    className="mt-3 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentModalData.modal_description) }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
