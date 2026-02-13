// src/pages/Branch/BoardView.tsx
import { useState, useEffect, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import Loader from "../Loader/Loader";
import api from "../../api/axios";
import { Image as ImageIcon } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import { getMeCached } from "../../utils/me";

const LazyDatePicker = lazy(() => import("react-datepicker"));

import {
  Star,
  MoreHorizontal,
  Users,
  LayoutGrid,
  ChevronDown,
  Bell,
  HelpCircle,
  Plus,
  SquarePen,
  X,
  Calendar,
  Tag,
  MessageSquare,
  Paperclip,
  CheckSquare,
} from "lucide-react";

/* ================= DND ================= */
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ================= TYPES ================= */
interface Card {
  id: number;
  board_list_id: number;
  title: string | null;
  invoice?: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  checked: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  country_label_id?: number | null;
  intake_label_id?: number | null;
  due_date?: string | null;
}

interface List {
  id: number;
  board_id: number;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
  cards: Card[];
}

interface Board {
  id: number;
  name: string;
  city_id: number;
  created_at: string;
  updated_at: string;
  lists: List[];
}

interface Activity {
  id: number;
  card_id?: number; // For card-specific activities; null for list activities
  list_id?: number; // For list-specific activities
  user_name: string;
  action: string; // e.g., "created card", "moved card", "updated due_date", "created list", "commented"
  details?: string; // e.g., "from List A to List B", or comment text
  created_at: string;
}

interface Profile {
  first_name?: string | null;
}

/* ================= HELPERS ================= */
function formatDateWithOrdinal(dateStr: string | null | undefined): string {
  if (!dateStr) return "No date set";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Invalid date";

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();

  let ordinal = "th";
  if (day === 1 || day === 21 || day === 31) ordinal = "st";
  else if (day === 2 || day === 22) ordinal = "nd";
  else if (day === 3 || day === 23) ordinal = "rd";

  return `${day}${ordinal} ${month} ${year}`;
}

function formatISODateForInput(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (value.includes("T")) return value.split("T")[0];
    return "";
  }

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }

  return "";
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* ================= DRAGGABLE CARD ================= */
function DraggableCard({
  card,
  listTitle,
  onClick,
}: {
  card: Card;
  listTitle: string;
  onClick: (card: Card) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const invoiceDisplay = card.invoice || `ID-${card.id}`;
  const displayText = `${invoiceDisplay} ${card.first_name || ""} ${card.last_name || ""}`.trim();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm cursor-pointer hover:shadow-md transition-shadow select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-indigo-700">{displayText}</p>
          <p className="text-xs text-gray-500 mt-1">{formatDateWithOrdinal(card.created_at)}</p>
        </div>
        <button className="p-1.5 rounded-md hover:bg-gray-100 shrink-0">
          <SquarePen size={16} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
}

/* ================= DROPPABLE LIST ================= */
function DroppableList({ list, children }: { list: List; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `list-${list.id}` });

  return (
    <div
      ref={setNodeRef}
      className="w-80 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md flex flex-col min-h-[120px]"
    >
      {children}
    </div>
  );
}

/* ================= CARD DETAIL MODAL ================= */
interface CardDetailModalProps {
  card: Card;
  listTitle: string;
  onClose: () => void;
  setSelectedCard: React.Dispatch<React.SetStateAction<Card | null>>;
  fetchBoard: () => Promise<void>;
}

function CardDetailModal({
  card,
  listTitle,
  onClose,
  setSelectedCard,
  fetchBoard,
}: CardDetailModalProps) {
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedIntakeId, setSelectedIntakeId] = useState<number | null>(null);
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([]);
  const [intakes, setIntakes] = useState<{ id: number; name: string }[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);

  // Description editing
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(card.description || "");
  const [savingDescription, setSavingDescription] = useState(false);

  // Due Date
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editedDueDate, setEditedDueDate] = useState(formatISODateForInput(card.due_date));
  const [savingDueDate, setSavingDueDate] = useState(false);

  // Activities and Comments
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Sync when card changes
  useEffect(() => {
    setSelectedCountryId(card.country_label_id ?? null);
    setSelectedIntakeId(card.intake_label_id ?? null);
    setEditedDescription(card.description || "");
    setEditedDueDate(formatISODateForInput(card.due_date));
    fetchActivities();
  }, [card]);

  // Preload labels once
  useEffect(() => {
    const fetchLabelsOnce = async () => {
      if (countries.length > 0 && intakes.length > 0) return;
      try {
        const [countryRes, intakeRes] = await Promise.all([
          api.get("/country-labels"),
          api.get("/intake-labels"),
        ]);
        setCountries(countryRes.data);
        setIntakes(intakeRes.data);
      } catch (err) {
        console.error("Failed to preload labels", err);
      }
    };
    fetchLabelsOnce();
  }, [countries.length, intakes.length]);

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/cards/${card.id}/activities`);
      setActivities(res.data || []);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      await api.post(`/cards/${card.id}/activities`, {
        action: "commented",
        details: newComment.trim(),
      });
      setNewComment("");
      await fetchActivities();
    } catch (err) {
      console.error("Failed to post comment:", err);
      alert("Could not post comment.");
    } finally {
      setPostingComment(false);
    }
  };

  const handleSaveLabels = async () => {
    try {
      const payload = {
        country_label_id: selectedCountryId ?? null,
        intake_label_id: selectedIntakeId ?? null,
      };
      await api.put(`/cards/${card.id}/labels`, payload);
      setSelectedCard((prev) =>
        prev && prev.id === card.id ? { ...prev, ...payload } : prev
      );
      await fetchBoard();
      await fetchActivities(); // Refresh activities after update
      setShowLabelModal(false);
    } catch (err) {
      console.error("Failed to save labels:", err);
      alert("Could not save labels. Please try again.");
    }
  };

  const handleSaveDescription = async () => {
    const trimmed = editedDescription.trim();
    if (trimmed === (card.description || "")) {
      setIsEditingDescription(false);
      return;
    }
    setSavingDescription(true);
    try {
      await api.put(`/cards/${card.id}/description`, { description: trimmed || null });
      setSelectedCard((prev) =>
        prev && prev.id === card.id ? { ...prev, description: trimmed || undefined } : prev
      );
      await fetchBoard();
      await fetchActivities(); // Refresh activities after update
      setIsEditingDescription(false);
    } catch (err) {
      console.error("Failed to save description:", err);
      alert("Could not save description.");
    } finally {
      setSavingDescription(false);
    }
  };

  const handleSaveDueDate = async () => {
    setSavingDueDate(true);
    try {
      const dueDateToSend = editedDueDate.trim() || null;

      await api.put(`/cards/${card.id}/due-date`, {
        due_date: dueDateToSend,
      });

      setSelectedCard((prev) =>
        prev && prev.id === card.id
          ? { ...prev, due_date: dueDateToSend ?? undefined }
          : prev
      );

      await fetchBoard();
      await fetchActivities(); // Refresh activities after update
      setShowDatePicker(false);
    } catch (err) {
      console.error("Failed to save due date:", err);
      alert("Could not save due date.");
      await fetchBoard();
    } finally {
      setSavingDueDate(false);
    }
  };

  const handleDatesButtonClick = () => {
    setShowDatePicker(true);
  };

  const getCountryName = () => countries.find((c) => c.id === selectedCountryId)?.name || "None";
  const getIntakeName = () => intakes.find((i) => i.id === selectedIntakeId)?.name || "None";

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-200/50">
        {/* HEADER */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50/60 to-white flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100/80 text-indigo-800 rounded-lg text-sm font-semibold border border-indigo-200 shadow-sm">
              {listTitle}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
              <Bell size={17} className="text-gray-600" />
            </button>
            <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
              <ImageIcon size={17} className="text-gray-600" />
            </button>
            <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
              <Star size={17} className="text-gray-600" />
            </button>
            <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
              <MoreHorizontal size={17} className="text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT – Main info */}
          <div className="flex-1 overflow-y-auto p-6 space-y-7 bg-white">
            <h2 className="text-2xl font-bold text-gray-900 truncate leading-tight">
              {card.invoice || "28223"} {card.first_name} {card.last_name} • {formatDateWithOrdinal(card.created_at)}
            </h2>

            <div className="flex flex-wrap gap-2.5">
              {[
                { Icon: Plus, label: "Add" },
                { Icon: Calendar, label: "Dates", onClick: handleDatesButtonClick },
                { Icon: CheckSquare, label: "Checklist" },
                { Icon: Users, label: "Members" },
                { Icon: Paperclip, label: "Attachment" },
              ].map(({ Icon, label, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-all"
                >
                  <Icon size={16} className="text-gray-600" />
                  {label}
                </button>
              ))}
            </div>

            {/* Labels + Due Date display */}
            <div className="flex flex-wrap gap-10">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2.5">Labels</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-md text-sm font-medium">
                      {getCountryName()}
                    </span>
                    
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-md text-sm font-medium">
                      {getIntakeName()}
                    </span>
                    
                  </div>

                  <button
                    onClick={() => setShowLabelModal(true)}
                    className="h-8 w-8 flex items-center justify-center border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Due Date display */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2.5">Due Date</p>
                <div className="flex items-center gap-3">
                  <span className="bg-indigo-50 text-indigo-800 px-3 py-1 rounded-md text-sm font-medium">
                    {card.due_date ? formatDateWithOrdinal(card.due_date) : "Not set"}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-50/70 border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b bg-white/60">
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={18} className="text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">Description</h3>
                </div>

                {isEditingDescription ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsEditingDescription(false);
                        setEditedDescription(card.description || "");
                      }}
                      className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                      disabled={savingDescription}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDescription}
                      className={`px-5 py-1.5 text-sm font-medium rounded text-white ${
                        savingDescription ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                      disabled={savingDescription}
                    >
                      {savingDescription ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingDescription(true)}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
                  >
                    <SquarePen size={14} />
                    Edit
                  </button>
                )}
              </div>

              {isEditingDescription ? (
                <div className="p-5">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-y min-h-[160px] focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                    placeholder="Student’s Phone, Parent’s Phone, Budget, Education level, Field of study, Notes..."
                    autoFocus
                  />
                </div>
              ) : (
                <div className="px-5 py-5 text-sm text-gray-800 space-y-2 leading-relaxed">
                  {card.description && card.description.trim() ? (
                    card.description.split("\n").map((line, i) => <p key={i}>{line}</p>)
                  ) : (
                    <p className="text-gray-500 italic">No description added yet...</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT – Comments & Activity */}
          <div className="w-full sm:w-[360px] bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b bg-white/80 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Comments & Activity</h3>
              <button className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                Show details
              </button>
            </div>

            <div className="flex-1 p-5 space-y-6 overflow-y-auto">
              {/* Comment input */}
              <div className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                />
                <button
                  onClick={handlePostComment}
                  disabled={postingComment || !newComment.trim()}
                  className={`w-full py-2 text-sm font-medium rounded-lg text-white ${
                    postingComment ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {postingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>

              {/* Activities list */}
              <div className="space-y-6">
                {activities.length === 0 ? (
                  <p className="text-center text-gray-500">No activities yet</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="w-9 h-9 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {activity.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-sm leading-relaxed">
                          <strong className="text-gray-900">{activity.user_name}</strong> {activity.action}
                          {activity.details ? ` ${activity.details}` : ""}
                        </p>
                        <p className="text-xs text-gray-500">{formatTimestamp(activity.created_at)}</p>
                        {activity.action === "commented" && activity.details && (
                          <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                            {activity.details}
                          </div>
                        )}
                        <button className="text-xs text-gray-500 hover:text-gray-700 underline mt-1 transition">
                          Reply
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DATE PICKER POPUP */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Due Date</h3>
              <button
                onClick={() => setShowDatePicker(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <Suspense fallback={<div className="py-8 text-center text-gray-500">Loading calendar...</div>}>
              <LazyDatePicker
                selected={editedDueDate ? new Date(editedDueDate) : null}
                onChange={(date: Date | null) => {
                  setEditedDueDate(date ? date.toISOString().split("T")[0] : "");
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
                placeholderText="Select a date"
                dateFormat="yyyy-MM-dd"
                autoFocus
              />
            </Suspense>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDatePicker(false);
                  setEditedDueDate(formatISODateForInput(card.due_date));
                }}
                className="px-5 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                disabled={savingDueDate}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDueDate}
                className={`px-6 py-2 text-sm font-medium text-white rounded-lg ${
                  savingDueDate ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
                disabled={savingDueDate}
              >
                {savingDueDate ? "Saving..." : "Save Date"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LABEL SELECTION MODAL */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Select Labels</h3>
              <button
                onClick={() => setShowLabelModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-8">
              {loadingLabels ? (
                <div className="text-center py-10 text-gray-500">Loading labels...</div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <select
                      value={selectedCountryId ?? ""}
                      onChange={(e) => setSelectedCountryId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select a country (optional)</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Intake / Semester</label>
                    <select
                      value={selectedIntakeId ?? ""}
                      onChange={(e) => setSelectedIntakeId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select an intake (optional)</option>
                      {intakes.map((intake) => (
                        <option key={intake.id} value={intake.id}>
                          {intake.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t flex justify-end gap-4">
              <button
                onClick={() => setShowLabelModal(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLabels}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  const [activeCardListId, setActiveCardListId] = useState<number | null>(null);
  const [newCardFirstName, setNewCardFirstName] = useState("");
  const [newCardLastName, setNewCardLastName] = useState("");
  const [newCardDescription, setNewCardDescription] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const fetchBoard = async () => {
    try {
      const res = await api.get(`/boards/${boardId}`, { params: { with: "lists.cards" } });
      const data = res.data.data || res.data;

      data.lists = [...(data.lists || [])].sort((a: List, b: List) => a.position - b.position);
      data.lists.forEach((l: List) => {
        l.cards = [...(l.cards || [])].sort((a, b) => a.position - b.position);
      });

      setBoard(data);
    } catch (err) {
      console.error("Fetch board failed", err);
    }
  };

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const [, me] = await Promise.all([fetchBoard(), getMeCached()]);
        setProfile(me as any);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [boardId]);

  const getListTitleForCard = (card: Card): string => {
    if (!board) return "Unknown";
    const list = board.lists.find((l) => l.id === card.board_list_id);
    return list?.title || "Unknown";
  };

  const logActivity = async (action: string, details?: string, cardId?: number, listId?: number) => {
    try {
      await api.post("/activities", {
        card_id: cardId ?? null,
        list_id: listId ?? null,
        action,
        details,
      });
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
  };

  const handleCreateList = async () => {
    if (!newListTitle.trim() || !board) return;

    const position = board.lists.length + 1;
    const tempList: List = {
      id: Date.now(),
      board_id: board.id,
      title: newListTitle.trim(),
      position,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cards: [],
    };

    setBoard((prev) => (prev ? { ...prev, lists: [...prev.lists, tempList] } : null));

    setNewListTitle("");
    setIsAddListOpen(false);

    try {
      const res = await api.post(`/boards/${board.id}/lists`, { title: tempList.title, position });
      const newListId = res.data.id; // Assume backend returns the created list
      await logActivity("created list", `List: ${tempList.title}`, undefined, newListId);
      await fetchBoard();
    } catch (err) {
      console.error("Create list failed", err);
      await fetchBoard();
    }
  };

  const handleCreateCard = async (listId: number) => {
    const payload = {
      first_name: newCardFirstName.trim() || undefined,
      last_name: newCardLastName.trim() || undefined,
      description: newCardDescription.trim() || undefined,
    };

    try {
      const res = await api.post(`/board-lists/${listId}/cards`, payload);
      const newCardId = res.data.id; // Assume backend returns the created card
      await logActivity("created card", `Card: ${payload.first_name} ${payload.last_name}`, newCardId);
      setNewCardFirstName("");
      setNewCardLastName("");
      setNewCardDescription("");
      setActiveCardListId(null);
      await fetchBoard();
    } catch (err) {
      console.error("Create card failed", err);
    }
  };

  const cancelAddCard = () => {
    setNewCardFirstName("");
    setNewCardLastName("");
    setNewCardDescription("");
    setActiveCardListId(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!board) return;
    const cardId = Number(event.active.id);
    for (const list of board.lists) {
      const found = list.cards.find((c) => c.id === cardId);
      if (found) {
        setActiveCard(found);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    if (!board || !event.over) return;

    const cardId = Number(event.active.id);
    let fromList: List | undefined;
    let movedCard: Card | undefined;

    for (const list of board.lists) {
      const found = list.cards.find((c) => c.id === cardId);
      if (found) {
        fromList = list;
        movedCard = found;
        break;
      }
    }

    if (!fromList || !movedCard) return;

    let toList: List | undefined;

    if (String(event.over.id).startsWith("list-")) {
      const listId = Number(String(event.over.id).replace("list-", ""));
      toList = board.lists.find((l) => l.id === listId);
    } else {
      toList = board.lists.find((l) => l.cards.some((c) => c.id === Number(event.over.id)));
    }

    if (!toList || fromList.id === toList.id) return;

    // Optimistic UI update
    fromList.cards = fromList.cards.filter((c) => c.id !== movedCard!.id);
    movedCard!.position = toList.cards.length + 1;
    toList.cards.push(movedCard!);

    setBoard({ ...board });

    try {
      await api.post("/cards/move", {
        card_id: movedCard!.id,
        to_list_id: toList.id,
        position: movedCard!.position,
      });
      await logActivity(
        "moved card",
        `from ${fromList.title} to ${toList.title}`,
        movedCard!.id
      );
      await fetchBoard();
    } catch (err) {
      console.error("Move card failed", err);
      await fetchBoard();
    }
  };

  if (loading) return <Loader message="Loading board..." />;
  if (!board) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* TOP BAR */}
      <header className="h-14 bg-white border-b shadow-sm flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="h-8 flex items-center">
            <img
              src="/images/logo/connected_logo.png"
              alt="Connected Logo"
              className="h-8 w-auto object-contain"
            />
          </div>
          {/* <span className="font-semibold">{board.name}</span>
          <Star size={16} className="text-amber-500 fill-amber-500" /> */}
        </div>

        <div className="flex-1 max-w-2xl mx-6">
          <input
            placeholder="Search invoices, clients..."
            className="w-full h-9 px-4 rounded-lg bg-gray-100 border text-sm focus:ring-2 focus:ring-indigo-400/40 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddListOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm rounded-lg shadow-md"
          >
            <Plus size={16} /> New List
          </button>
          {/* <Bell size={20} />
          <HelpCircle size={20} /> */}
          <div className="h-8 px-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold flex items-center justify-center shadow-sm">
            {profile?.first_name || "User"}
          </div>
        </div>
      </header>

      {/* BOARD */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl shadow-inner m-4">
        <div className="h-16 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between px-6 rounded-t-xl">
          <div className="flex items-center gap-4">
            <LayoutGrid size={20} />
            <h1 className="text-xl font-bold">{board.name}</h1>
            <ChevronDown size={20} />
          </div>
          <div className="flex items-center gap-3">
            <Users size={20} />
            <button className="px-4 py-1.5 bg-white/20 rounded-lg text-sm">Share</button>
            <MoreHorizontal size={20} />
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto p-6">
            <div className="flex gap-6 min-w-max items-start">
              {board.lists.map((list) => (
                <DroppableList key={list.id} list={list}>
                  <div className="p-4 pb-2">
                    <div className="flex justify-between mb-3">
                      <h3 className="font-semibold text-lg">{list.title}</h3>
                      <MoreHorizontal size={18} />
                    </div>

                    <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {list.cards.map((card) => (
                          <DraggableCard
                            key={card.id}
                            card={card}
                            listTitle={list.title}
                            onClick={() => setSelectedCard(card)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>

                  <div className="p-3 pt-0">
                    {activeCardListId === list.id ? (
                      <div className="bg-white rounded-lg border p-3 shadow-sm">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <input
                            value={newCardFirstName}
                            onChange={(e) => setNewCardFirstName(e.target.value)}
                            placeholder="First name"
                            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                          />
                          <input
                            value={newCardLastName}
                            onChange={(e) => setNewCardLastName(e.target.value)}
                            placeholder="Last name"
                            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                          />
                        </div>

                        <textarea
                          value={newCardDescription}
                          onChange={(e) => setNewCardDescription(e.target.value)}
                          placeholder="Description / notes (optional)..."
                          rows={3}
                          className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-indigo-400 outline-none mb-3"
                        />

                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => handleCreateCard(list.id)}
                            className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm font-medium"
                          >
                            Add card
                          </button>
                          <button
                            onClick={cancelAddCard}
                            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveCardListId(list.id)}
                        className="w-full flex items-center gap-2 text-gray-600 hover:bg-gray-100 rounded-lg px-2 py-2 text-sm"
                      >
                        <Plus size={16} /> Add a card
                      </button>
                    )}
                  </div>
                </DroppableList>
              ))}

              {/* ADD ANOTHER LIST */}
              <div className="w-80 shrink-0">
                {isAddListOpen ? (
                  <div className="bg-white rounded-xl p-4 border shadow-md">
                    <input
                      autoFocus
                      value={newListTitle}
                      onChange={(e) => setNewListTitle(e.target.value)}
                      placeholder="Enter list title..."
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    />
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={handleCreateList}
                        className="bg-indigo-600 text-white px-4 py-1.5 rounded-md"
                      >
                        Add list
                      </button>
                      <button
                        onClick={() => setIsAddListOpen(false)}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddListOpen(true)}
                    className="w-full h-12 bg-white/60 hover:bg-white rounded-xl border border-dashed flex items-center gap-2 justify-center text-gray-600"
                  >
                    <Plus size={16} /> Add list
                  </button>
                )}
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="w-80 bg-white rounded-xl p-3 shadow-2xl border border-gray-200">
                <p className="text-sm font-bold text-indigo-700">
                  {activeCard.invoice || `ID-${activeCard.id}`} {activeCard.first_name || ""} {activeCard.last_name || ""}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDateWithOrdinal(activeCard.created_at)}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {selectedCard && (
          <CardDetailModal
            card={selectedCard}
            listTitle={getListTitleForCard(selectedCard)}
            onClose={() => setSelectedCard(null)}
            setSelectedCard={setSelectedCard}
            fetchBoard={fetchBoard}
          />
        )}
      </main>
    </div>
  );
}
