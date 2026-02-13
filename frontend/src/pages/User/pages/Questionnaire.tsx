// src/pages/User/pages/Questionnaire.tsx
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Header from "../Header";
import Footer from "../Footer";
import Loader from "../../Loader/Loader";
import { getMeCached } from "../../../utils/me";

interface Question {
  id: number;
  title: string;
  details: string;
  first_option: string;
  second_option: string;
}

interface SavedAnswer {
  question_id: string | number;
  selected_option: string;
}

export default function Questionnaire() {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerOrder, setAnswerOrder] = useState<number[]>([]);
  const [selected, setSelected] = useState<{ [key: number]: number | null }>({});
  const [scrollToQuestionId, setScrollToQuestionId] = useState<number | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ✅ ID-based refs (IMPORTANT)
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // ================= FETCH DATA =================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const me = await getMeCached();
        setUserName(`${me.first_name} ${me.last_name}`);

        const questionsRes = await api.get("/question-answers");
        const fetchedQuestions: Question[] = questionsRes.data.data || [];
        setQuestions(fetchedQuestions);

        let savedAnswers: SavedAnswer[] = [];
        try {
          const savedRes = await api.get("/user-submitted-answers");
          savedAnswers = savedRes.data.data || [];
        } catch {}

        const initialSelected: { [key: number]: number | null } = {};

        fetchedQuestions.forEach((q) => {
          const saved = savedAnswers.find(
            (a) => Number(a.question_id) === q.id
          );

          if (saved) {
            if (saved.selected_option === q.first_option)
              initialSelected[q.id] = 1;
            else if (saved.selected_option === q.second_option)
              initialSelected[q.id] = 2;
            else initialSelected[q.id] = null;
          } else {
            initialSelected[q.id] = null;
          }
        });

        setSelected(initialSelected);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ================= HANDLE SELECT =================
  const handleSelect = (questionId: number, option: number) => {
    setSelected((prev) => ({ ...prev, [questionId]: option }));

    setAnswerOrder((prevOrder) => {
      if (prevOrder.includes(questionId)) return prevOrder;

      const newOrder = [...prevOrder, questionId];

      setQuestions((prevQuestions) => {
        const answered = newOrder
          .map((id) => prevQuestions.find((q) => q.id === id))
          .filter(Boolean) as Question[];

        const unanswered = prevQuestions.filter(
          (q) => !newOrder.includes(q.id)
        );

        return [...answered, ...unanswered];
      });

      // ✅ scroll by QUESTION ID (not index)
      setScrollToQuestionId(questionId);
      return newOrder;
    });
  };

  // ================= SCROLL AFTER RENDER =================
  useEffect(() => {
    if (!scrollToQuestionId) return;

    const el = questionRefs.current[scrollToQuestionId];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    setScrollToQuestionId(null);
  }, [questions, scrollToQuestionId]);

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    const unanswered = questions.filter((q) => selected[q.id] === null);
    if (unanswered.length > 0) {
      setShowWarningModal(true);
      return;
    }

    try {
      await api.post("/question-answers/submit", {
        answers: questions.map((q) => ({
          question_id: q.id,
          selected_option:
            selected[q.id] === 1 ? q.first_option : q.second_option,
        })),
      });

      setShowSuccessModal(true);
    } catch {
      setShowWarningModal(true);
    }
  };

  const totalQuestions = questions.length;
  const answeredCount = Object.values(selected).filter((v) => v !== null).length;

  if (loading) return <Loader message="Fetching questions..." />;

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
        }
      `}</style>

      <div className="text-white bg-[#0a0f50] min-h-screen flex flex-col">
        <Header
          userName={userName}
          onLogout={() => {
            localStorage.clear();
            navigate("/signin");
          }}
        />

        <main className="flex-1 flex flex-col items-center px-6 py-16 items-start">
          <div className="w-full max-w-4xl space-y-10 mt-6">
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              ref={(el) => {
                questionRefs.current[q.id] = el;
              }}
              className="p-8 rounded-2xl shadow-lg"
              style={{
                background: "linear-gradient(135deg, #0a104e, #3a3fc1)",
              }}
            >
              <p className="text-sm mb-2">Question {idx + 1}</p>
              <h2 className="text-2xl font-bold mb-4">{q.title}</h2>
              <p className="mb-6">{q.details}</p>

              {[1, 2].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSelect(q.id, opt)}
                  className={`w-full mb-3 px-4 py-3 rounded-xl font-semibold transition flex items-center justify-center text-center whitespace-normal break-words
                    ${
                      selected[q.id] === opt
                        ? "bg-lime-400 text-black"
                        : "bg-white/20 hover:bg-white/30"
                    }`}
                >
                  {opt === 1 ? q.first_option : q.second_option}
                </button>
              ))}


            </motion.div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={answeredCount < totalQuestions}
            className={`w-full py-4 rounded-xl font-bold
              ${
                answeredCount === totalQuestions
                  ? "bg-lime-400 text-black"
                  : "bg-gray-400 text-gray-700"
              }`}
          >
            Submit Answers ({answeredCount}/{totalQuestions})
          </button>
        </div>
      </main>

      <Footer />

      {showWarningModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white text-black p-8 rounded-2xl">
            <p>Please answer all questions.</p>
            <button
              onClick={() => setShowWarningModal(false)}
              className="mt-4 px-6 py-2 bg-lime-400 rounded"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border-2 border-lime-400 bg-white p-8 shadow-2xl font-inter">

              {/* H1 – Inter Extra Bold */}
              <h3 className="mb-3 text-2xl font-extrabold text-[#01da8b]">
                Success!
              </h3>

              {/* Paragraph – Inter Regular */}
              <p className="mb-6 text-gray-600 font-normal">
                Your answers have been submitted successfully.
              </p>

              {/* Button – No background, black border */}
              <button
                onClick={() => navigate("/process-done")}
                className="rounded-full border-2 border-black px-6 py-3 font-bold text-black transition"
              >
                Continue
              </button>

            </div>
          </div>

        )}
    </div>
    </>
  );
}
