// src/pages/User/pages/Sort.tsx
import { useState, useEffect, useRef } from "react";
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
    modal_title?: string;
    modal_image?: string;
    modal_description?: string;
}

export default function Sort() {
    const [userName, setUserName] = useState<string>("");
    const [dataRange, setDataRange] = useState<number>(0);
    const [categorys, setCategorys] = useState<Category[]>([]);
    const [selections, setSelections] = useState<
        { categoryId: number; answer: "yes" | "maybe" }[]
    >([]);
    const [answeredIds, setAnsweredIds] = useState<number[]>([]);
    const [processing, setProcessing] = useState(false);
    const [currentWork, setCurrentWork] = useState<Category | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [displayCount, setDisplayCount] = useState<number>(1);
    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
    const [maxCards, setMaxCards] = useState<number | null>(null);

    const navigate = useNavigate();

    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrollPercent, setScrollPercent] = useState(0);

    const updateScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const scrollTop = el.scrollTop;
        const maxScroll = el.scrollHeight - el.clientHeight;
        setScrollPercent(maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0);
    };

    useEffect(() => {
        document.title = "Connected — Challenge Cards";
        document.documentElement.style.backgroundColor = "#080b3d";
        document.body.style.backgroundColor = "#080b3d";
    }, []);

    useEffect(() => {
        const fetchUserAndData = async () => {
            try {
                const [me, workRes] = await Promise.all([
                    getMeCached(),
                    api.get("/industry"),
                ]);
                setUserName(`${me.first_name} ${me.last_name}`);
                setDataRange((me as any).data_range ?? 0);
                setMaxCards((me as any).max_cards ?? null);

                const data: Category[] = workRes.data.data || workRes.data;
                const formatted = data.map((item) => ({
                    ...item,
                    modal_image: item.modal_image
                        ? item.modal_image.startsWith("http")
                            ? item.modal_image
                            : `${import.meta.env.VITE_API_URL}/storage/${
                                  item.modal_image
                              }`
                        : undefined,
                }));
                setCategorys(formatted);
            } catch (err) {
                console.error("Failed to fetch data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserAndData();
    }, []);

    const totalSteps =
        maxCards !== null
            ? Math.min(maxCards, categorys.length)
            : categorys.length;
    const progressPercent =
        totalSteps > 0
            ? Math.floor((answeredIds.length / totalSteps) * 100)
            : 0;

    const handleAnswer = (cardId: number, answer: "yes" | "no" | "maybe") => {
        if (processing) return;
        setProcessing(true);

        // mark as answered
        setAnsweredIds((prev) =>
            prev.includes(cardId) ? prev : [...prev, cardId]
        );

        const existingIndex = selections.findIndex(
            (s) => s.categoryId === cardId
        );
        const alreadySelected = existingIndex !== -1;

        if (answer === "yes" || answer === "maybe") {
            // check maxCards limit
            if (
                !alreadySelected &&
                maxCards !== null &&
                selections.length >= maxCards
            ) {
                setProcessing(false);
                return; // cannot select more than max
            }

            setSelections((prev) => {
                const filtered = prev.filter((s) => s.categoryId !== cardId);
                filtered.push({ categoryId: cardId, answer });
                localStorage.setItem("selectedWork", JSON.stringify(filtered));
                return filtered;
            });
        } else {
            // NO: remove from selections if present
            if (alreadySelected) {
                setSelections((prev) =>
                    prev.filter((s) => s.categoryId !== cardId)
                );
            }
        }

        setTimeout(() => {
            setProcessing(false);
            // move next card if not last
            setCurrentCardIndex((prev) =>
                prev + 1 < categorys.length ? prev + 1 : prev
            );

            // navigate if all answered
            if (answeredIds.length + 1 >= totalSteps) {
                const selectedIds = [...selections.map((s) => s.categoryId)];
                if (answer !== "no") selectedIds.push(cardId);
                setTimeout(
                    () => navigate("/pick-top", { state: { selectedIds } }),
                    100
                );
            }

            window.scrollTo({ top: 0, behavior: "smooth" });
        }, 200);
    };

    const openModal = (work: Category) => {
        setCurrentWork(work);
        setIsModalOpen(true);
    };
    const closeModal = () => setIsModalOpen(false);

    useEffect(() => {
        document.body.style.overflow = isModalOpen ? "hidden" : "auto";
        if (isModalOpen && scrollRef.current) {
            scrollRef.current.scrollTop = 0;
            setScrollPercent(0);
        }
    }, [isModalOpen]);

    const handleLogoutClick = () => {
        sessionStorage.clear();
        window.location.href = "/signin";
    };

    const displayOptions = [1, 2, 3, 4, 5, 10, 20, 50];

    useEffect(() => {
        if (currentCardIndex > Math.max(0, categorys.length - displayCount)) {
            setCurrentCardIndex(Math.max(0, categorys.length - displayCount));
        }
    }, [categorys.length, displayCount]);

    const visibleCards = categorys.slice(
        currentCardIndex,
        currentCardIndex + displayCount
    );
    const currentCard = visibleCards[0];
    const isCurrentAnswered = currentCard
        ? answeredIds.includes(currentCard.id)
        : false;

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Poppins:wght@400;500;600;700;800;900&display=swap"
                rel="stylesheet"
            />
            <style>{`
        :root { --bg: #0f1533; --accent: #18e08a; }
        body { font-family: 'Poppins', system-ui; background-color: #080b3d; }
        .nav-circle {
          width: 50px;
          height: 50px;
          border-radius: 9999px;
          border: 1.5px solid rgba(255,255,255,0.35);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; }

        @keyframes pulseLamp {
  0%, 100% { transform: scale(1); box-shadow: 0 0 5px #a3dd2f; }
  50% { transform: scale(1.2); box-shadow: 0 0 15px #a3dd2f; }
}
.animate-pulseLamp {
  animation: pulseLamp 1.2s infinite;
}

      `}</style>

            {isLoading ? (
                <div className="fixed inset-0 bg-[#080b3d] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-white">
                        <div className="w-8 h-8 border-4 border-white/30 border-t-[--accent] rounded-full animate-spin"></div>
                        <span className="text-sm text-white/70">
                            Loading...
                        </span>
                    </div>
                </div>
            ) : (
                <div className="text-white bg-[#080b3d] min-h-screen flex flex-col">
                    <Header userName={userName} onLogout={handleLogoutClick} />

                    <main className="flex-1 flex flex-col items-center px-6 py-8 w-full max-w-[1200px] mx-auto">
                        {dataRange !== 0 && (
                            <div className="w-full flex justify-end mt-4 pr-6">
                                <div className="flex items-center gap-2 text-white/80 text-sm">
                                    <label className="font-medium">Show:</label>
                                    <select
                                        value={displayCount}
                                        onChange={(e) => {
                                            const n = Number(e.target.value);
                                            setDisplayCount(n);
                                            setCurrentCardIndex(0);
                                        }}
                                        className="px-4 py-1 rounded-md bg-white/10 border border-white/30 text-white text-sm"
                                    >
                                        {displayOptions.map((v) => (
                                            <option
                                                key={v}
                                                value={v}
                                                className="bg-[#080b3d] text-white"
                                            >
                                                {v}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="
  flex
  items-center
  relative
  w-full
  justify-center
  gap-4 sm:gap-6 mt-8
  flex-nowrap
  sm:flex-wrap
">

                            {/* LEFT ARROW */}
                            <button
                                onClick={() =>
                                    setCurrentCardIndex((i) =>
                                        Math.max(0, i - displayCount)
                                    )
                                }
                                disabled={currentCardIndex === 0}
                                className={`
                                nav-circle
                                w-10 h-10 sm:w-[50px] sm:h-[50px]
                                ml-0 sm:-ml-8
                                ${currentCardIndex === 0 ? "opacity-40" : "hover:scale-110"}
                              `}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 512 512"
                                    width="28"
                                    height="28"
                                    className="sm:w-[60px] sm:h-[30px]"
                                >
                                    <circle
                                        cx="256"
                                        cy="256"
                                        r="240"
                                        fill="#060b3d"
                                    />
                                    <path
                                        d="M352 256H202 M256 176l-96 80 96 80"
                                        fill="none"
                                        stroke="#fff"
                                        strokeWidth="40"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>

                            {/* CARDS */}
                            {visibleCards.map((card) => {
                                const isSelected = selections.some(
                                    (s) => s.categoryId === card.id
                                );
                                const selectedAnswer =
                                    selections.find(
                                        (s) => s.categoryId === card.id
                                    )?.answer ?? null;
                                const disableYesMaybe =
                                    maxCards !== null &&
                                    selections.length >= maxCards &&
                                    !isSelected;

                                return (
                                    <section
                                        key={card.id}
                                        className="border border-white  p-6 sm:p-8 rounded-[2.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] flex flex-col justify-between relative transition-all duration-300"
                                        style={{
                                            flex: `0 1 300px`,
                                            minHeight: "400px",
                                        }}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between">
                                                <div className="text-[#99d4fc] text-base font-semibold">
                                                    Do you care to
                                                </div>

                                                <button
                                                    onClick={() =>
                                                        openModal(card)
                                                    }
                                                    className="w-7 h-7 rounded-full bg-[#a3dd2f] flex items-center justify-center shadow hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-sky-300 animate-pulseLamp"
                                                    aria-label="Lamp Button"
                                                >
                                                    <img
                                                        src="/images/lamp.png"
                                                        className="w-4 h-4"
                                                    />
                                                </button>
                                            </div>

                                            {card.modal_title && (
                                                <h3
                                                    className="mt-4 text-lg font-semibold text-[#a3dd2f]"
                                                    dangerouslySetInnerHTML={{
                                                        __html: sanitizeHtml(card.modal_title),
                                                    }}
                                                />
                                            )}

                                            <h1
                                                className="mt-3 text-xl leading-snug font-extrabold tracking-tight text-white"
                                                dangerouslySetInnerHTML={{
                                                    __html: sanitizeHtml(card.title),
                                                }}
                                            />
                                        </div>

                                        {/* Buttons */}
                                        <div className="mt-8 flex justify-center">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() =>
                                                        handleAnswer(
                                                            card.id,
                                                            "maybe"
                                                        )
                                                    }
                                                    disabled={
                                                        disableYesMaybe ||
                                                        processing
                                                    }
                                                    className="flex items-center justify-center w-14 h-14 rounded-2xl border border-white/60 text-xl font-bold bg-white/5 text-white/80 hover:bg-white/10 hover:scale-110 transition-transform"
                                                >
                                                    ?
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        handleAnswer(
                                                            card.id,
                                                            "no"
                                                        )
                                                    }
                                                    disabled={processing}
                                                    className="flex items-center justify-center w-14 h-14 rounded-2xl border border-white/60 bg-white/5 hover:bg-white/10 hover:scale-110 transition-transform"
                                                >
                                                    <span className="text-red-500 text-xl font-bold">
                                                        ✕
                                                    </span>
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        handleAnswer(
                                                            card.id,
                                                            "yes"
                                                        )
                                                    }
                                                    disabled={
                                                        disableYesMaybe ||
                                                        processing
                                                    }
                                                    className="flex items-center justify-center w-14 h-14 rounded-2xl border border-white/60 bg-white/5 hover:bg-white/10 hover:scale-110 transition-transform"
                                                >
                                                    <span className="text-green-500 text-xl font-bold">
                                                        ✓
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </section>
                                );
                            })}

                            {/* RIGHT ARROW */}
                            <button
                                onClick={() => handleNext()}
                                disabled={
                                    !isCurrentAnswered ||
                                    currentCardIndex >=
                                        Math.max(
                                            0,
                                            categorys.length - displayCount
                                        )
                                }
                                className={`
      nav-circle 
      w-10 h-10 sm:w-[50px] sm:h-[50px]
      mr-0 sm:-mr-8
      ${!isCurrentAnswered ? "opacity-40" : "hover:scale-110"}
    `}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 512 512"
                                    width="28"
                                    height="28"
                                    className="sm:w-[60px] sm:h-[30px]"
                                >
                                    <circle
                                        cx="256"
                                        cy="256"
                                        r="240"
                                        fill="#060b3d"
                                    />
                                    <path
                                        d="M160 256h150 M256 176l96 80-96 80"
                                        fill="none"
                                        stroke="#fff"
                                        strokeWidth="40"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* PROGRESS */}
                        <div className="mt-8 w-full max-w-xs mx-auto">
                            <div className="flex items-center justify-between text-xs text-white/80 mb-2">
                                <span className="font-semibold tracking-wide">
                                    Progress
                                </span>
                                <span className="font-semibold text-[--accent]">
                                    {progressPercent}%
                                </span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${progressPercent}%`,
                                        background:
                                            "linear-gradient(270deg, var(--accent), #1cd3a2, #0ae2ff)",
                                    }}
                                />
                            </div>
                            <div className="text-center text-[10px] text-white/60 mt-2">
                                {answeredIds.length} of {totalSteps} answered
                            </div>
                        </div>
                    </main>

                    <Footer />

                    {/* MODAL */}
                    {isModalOpen && currentWork && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 sm:px-0">
                            <div className="relative w-full max-w-2xl sm:max-w-2xl">
                                {/* Vertical Progress (hidden on mobile) */}
                                <div className="hidden sm:block absolute top-24 right-2 w-1 h-[75%] bg-gray-200 rounded-full overflow-hidden z-50">
                                    <div
                                        className="bg-blue-500 w-full transition-all duration-200"
                                        style={{ height: `${scrollPercent}%` }}
                                    />
                                </div>

                                {/* Modal Card */}
                                <div className="bg-white text-black rounded-3xl w-full p-5 sm:p-6 relative shadow-xl">
                                    {/* Close Button */}
                                    <button
                                        onClick={closeModal}
                                        className="absolute top-3 right-3 w-9 h-9 bg-white border border-gray-300 rounded-full
                     flex items-center justify-center text-gray-700 text-xl hover:bg-gray-100 transition"
                                    >
                                        ×
                                    </button>

                                    {/* Title */}
                                    <div>
                                        <p className="text-gray-500 text-base font-medium">
                                            Do you want to work in the
                                        </p>
                                        <h3 className="text-2xl sm:text-3xl font-black leading-snug mt-1 text-black">
                                            {currentWork.name}
                                        </h3>

                                        {currentWork.modal_image && (
                                            <img
                                                src={currentWork.modal_image}
                                                className="rounded-xl mt-4 w-full max-h-48 object-cover border border-gray-200"
                                            />
                                        )}
                                    </div>

                                    {/* Scrollable content */}
                                    <div
                                        ref={scrollRef}
                                        onScroll={updateScroll}
                                        className="mt-4 text-sm leading-relaxed text-gray-700 overflow-y-auto hide-scrollbar pr-2"
                                        style={{ maxHeight: "250px" }}
                                        dangerouslySetInnerHTML={{
                                            __html:
                                                sanitizeHtml(currentWork.modal_description || ""),
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    function handleNext() {
        if (!currentCard || !answeredIds.includes(currentCard.id)) return;
        setCurrentCardIndex((i) =>
            Math.min(categorys.length - displayCount, i + displayCount)
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}
