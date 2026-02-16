import { Dispatch, SetStateAction, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Archive,
  Filter,
  MessageSquare,
  LayoutGrid,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Loader from "../Loader/Loader";
import api from "../../api/axios";
import { getMeCached } from "../../utils/me";
import CardDetailModal from "./BoardView/CardDetailModal";
import DraggableCard from "./BoardView/DraggableCard";
import DroppableList from "./BoardView/DroppableList";
import type { Board, BoardActivity, Card, CardLabelBadge, LabelOption, List, Profile } from "./BoardView/types";
import { formatDateWithOrdinal, formatFileSize, formatTimestamp, parseDateOnly } from "./BoardView/utils";
/* ================= MAIN COMPONENT ================= */
export default function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [newListCategory, setNewListCategory] = useState<0 | 1 | 2>(0);

  const [activeCardListId, setActiveCardListId] = useState<number | null>(null);
  const [newCardInvoice, setNewCardInvoice] = useState("");
  const [newCardFirstName, setNewCardFirstName] = useState("");
  const [newCardLastName, setNewCardLastName] = useState("");
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [editedListTitle, setEditedListTitle] = useState("");
  const [savingListId, setSavingListId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [moveBlockedMessage, setMoveBlockedMessage] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityTab, setActivityTab] = useState<"all" | "comment">("all");
  const [boardActivities, setBoardActivities] = useState<BoardActivity[]>([]);
  const [loadingBoardActivities, setLoadingBoardActivities] = useState(false);
  const [openingActivityAttachmentId, setOpeningActivityAttachmentId] = useState<number | null>(null);
  const [archivedCards, setArchivedCards] = useState<
    (Card & {
      boardList?: { id: number; title: string } | null;
      board_list?: { id: number; title: string } | null;
    })[]
  >([]);
  const [loadingArchivedCards, setLoadingArchivedCards] = useState(false);
  const [restoringCardId, setRestoringCardId] = useState<number | null>(null);
  const [selectedCountryFilterIds, setSelectedCountryFilterIds] = useState<number[]>([]);
  const [selectedIntakeFilterIds, setSelectedIntakeFilterIds] = useState<number[]>([]);
  const [selectedServiceAreaFilterIds, setSelectedServiceAreaFilterIds] = useState<number[]>([]);
  const [dueDateFilter, setDueDateFilter] = useState<"all" | "today" | "this_week" | "overdue">("all");
  const [countryFilterOptions, setCountryFilterOptions] = useState<LabelOption[]>([]);
  const [intakeFilterOptions, setIntakeFilterOptions] = useState<LabelOption[]>([]);
  const [serviceAreaFilterOptions, setServiceAreaFilterOptions] = useState<LabelOption[]>([]);
  const [countryLabelMap, setCountryLabelMap] = useState<Record<number, string>>({});
  const [intakeLabelMap, setIntakeLabelMap] = useState<Record<number, string>>({});
  const [serviceAreaMap, setServiceAreaMap] = useState<Record<number, string>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filterSearchInputRef = useRef<HTMLInputElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());
  const isSearching = deferredSearchTerm.length > 0;
  const showWildcardMatchCounts = deferredSearchTerm === "*";
  const hasActiveFilters =
    selectedCountryFilterIds.length > 0 ||
    selectedIntakeFilterIds.length > 0 ||
    selectedServiceAreaFilterIds.length > 0 ||
    dueDateFilter !== "all";
  const shouldShowMatchCounts = showWildcardMatchCounts || hasActiveFilters;

  const toggleFilterSelection = (
    id: number,
    setter: Dispatch<SetStateAction<number[]>>
  ) => {
    setter((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

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

  const fetchArchivedCards = async () => {
    if (!boardId) return;

    setLoadingArchivedCards(true);
    try {
      const res = await api.get(`/boards/${boardId}/archived-cards`);
      setArchivedCards(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch archived cards failed", err);
      alert("Could not load archived cards.");
    } finally {
      setLoadingArchivedCards(false);
    }
  };

  const openArchivedModal = async () => {
    setShowArchivedModal(true);
    await fetchArchivedCards();
  };

  const fetchBoardActivities = async (nextTab: "all" | "comment" = activityTab) => {
    if (!boardId) return;

    setLoadingBoardActivities(true);
    try {
      const res = await api.get(`/boards/${boardId}/activities`, {
        params: { tab: nextTab, limit: 300 },
      });
      const payload = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setBoardActivities(payload as BoardActivity[]);
    } catch (err) {
      console.error("Fetch board activities failed", err);
      alert("Could not load board activities.");
    } finally {
      setLoadingBoardActivities(false);
    }
  };

  const openActivityModal = () => {
    setShowActivityModal(true);
  };

  const handleRestoreArchivedCard = async (cardId: number) => {
    setRestoringCardId(cardId);
    try {
      await api.put(`/cards/${cardId}/archive`, { is_archived: false });
      setArchivedCards((prev) => prev.filter((card) => card.id !== cardId));
      await fetchBoard();
    } catch (err) {
      console.error("Restore archived card failed", err);
      alert("Could not restore card.");
    } finally {
      setRestoringCardId(null);
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

  useEffect(() => {
    const fetchLabelMaps = async () => {
      try {
        const [countryRes, intakeRes, serviceRes] = await Promise.all([
          api.get("/country-labels"),
          api.get("/intake-labels"),
          api.get("/service-areas"),
        ]);

        const toArray = (payload: any): LabelOption[] => {
          if (Array.isArray(payload?.data)) return payload.data;
          if (Array.isArray(payload)) return payload;
          return [];
        };

        const countries = toArray(countryRes.data);
        const intakes = toArray(intakeRes.data);
        const serviceAreas = toArray(serviceRes.data);

        setCountryFilterOptions(countries);
        setIntakeFilterOptions(intakes);
        setServiceAreaFilterOptions(serviceAreas);

        setCountryLabelMap(
          countries.reduce<Record<number, string>>((acc, item) => {
            acc[item.id] = item.name;
            return acc;
          }, {})
        );

        setIntakeLabelMap(
          intakes.reduce<Record<number, string>>((acc, item) => {
            acc[item.id] = item.name;
            return acc;
          }, {})
        );

        setServiceAreaMap(
          serviceAreas.reduce<Record<number, string>>((acc, item) => {
            acc[item.id] = item.name;
            return acc;
          }, {})
        );
      } catch (err) {
        console.error("Failed to load label maps", err);
      }
    };

    fetchLabelMaps();
  }, []);

  useEffect(() => {
    const focusFilterSearch = () => {
      window.setTimeout(() => {
        filterSearchInputRef.current?.focus();
        filterSearchInputRef.current?.select();
      }, 0);
    };

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const typing = isTypingTarget(event.target);

      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchTerm("");
        return;
      }

      if (event.key === "Escape" && showActivityModal) {
        setShowActivityModal(false);
        return;
      }

      if (event.key === "Escape" && showFilterMenu) {
        setShowFilterMenu(false);
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Trello-like: open filter panel by pressing f.
      if (!typing && key === "f") {
        event.preventDefault();
        setShowFilterMenu(true);
        focusFilterSearch();
        return;
      }

      // Trello-like quick wildcard: press * to match all cards and show counts.
      if (event.key === "*" || event.code === "NumpadMultiply") {
        if (typing && document.activeElement !== filterSearchInputRef.current) {
          return;
        }
        event.preventDefault();
        setShowFilterMenu(true);
        setSearchTerm("*");
        focusFilterSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showActivityModal, showFilterMenu]);

  useEffect(() => {
    if (!showFilterMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!filterMenuRef.current) return;
      if (!filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showFilterMenu]);

  useEffect(() => {
    if (!showActivityModal) return;
    void fetchBoardActivities(activityTab);
  }, [showActivityModal, activityTab, boardId]);

  const getListTitleForCard = (card: Card): string => {
    if (!board) return "Unknown";
    const list = board.lists.find((l) => l.id === card.board_list_id);
    return list?.title || "Unknown";
  };

  const getCardLabelBadges = (card: Card): CardLabelBadge[] => {
    const labels: CardLabelBadge[] = [];

    const countryIds =
      Array.isArray(card.country_label_ids) && card.country_label_ids.length > 0
        ? card.country_label_ids
        : card.country_label_id != null
        ? [card.country_label_id]
        : [];

    countryIds.forEach((countryId) => {
      labels.push({
        name: countryLabelMap[countryId] || `Country #${countryId}`,
        kind: "country",
      });
    });

    if (card.intake_label_id != null) {
      labels.push({
        name: intakeLabelMap[card.intake_label_id] || `Intake #${card.intake_label_id}`,
        kind: "intake",
      });
    }

    const serviceAreaIds =
      Array.isArray(card.service_area_ids) && card.service_area_ids.length > 0
        ? card.service_area_ids
        : card.service_area_id != null
        ? [card.service_area_id]
        : [];

    serviceAreaIds.forEach((serviceAreaId) => {
      labels.push({
        name: serviceAreaMap[serviceAreaId] || `Service Area #${serviceAreaId}`,
        kind: "serviceArea",
      });
    });

    return labels;
  };

  const getBoardActivityCardTitle = (activity: BoardActivity): string => {
    const card = activity.card;
    if (!card) {
      return activity.card_id ? `Card #${activity.card_id}` : "Card";
    }

    const fullName = `${card.first_name || ""} ${card.last_name || ""}`.trim();
    const invoice = card.invoice?.trim() || "";

    if (invoice && fullName) {
      return `${invoice} ${fullName}`;
    }
    if (invoice) {
      return invoice;
    }
    if (fullName) {
      return fullName;
    }

    return `Card #${card.id}`;
  };

  const getBoardActivityListTitle = (activity: BoardActivity): string => {
    if (activity.list?.title) return activity.list.title;
    if (activity.card?.boardList?.title) return activity.card.boardList.title;
    if (activity.card?.board_list?.title) return activity.card.board_list.title;
    if (activity.list_id) return `List #${activity.list_id}`;
    return "Board";
  };

  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/gi;
  const isUrlText = (value: string) => /^(?:https?:\/\/|www\.)[^\s]+$/i.test(value);
  const toHref = (value: string) =>
    /^https?:\/\//i.test(value) ? value : `https://${value}`;

  const renderTextWithLinks = (value?: string) => {
    if (!value) return null;

    const lines = value.split(/\r?\n/);

    return lines.map((line, lineIndex) => (
      <span key={`activity-line-${lineIndex}`}>
        {line.split(urlRegex).map((part, partIndex) => {
          if (!part) return null;

          if (!isUrlText(part)) {
            return <span key={`activity-text-${lineIndex}-${partIndex}`}>{part}</span>;
          }

          const match = part.match(/^(.*?)([.,!?)]*)$/);
          const cleanUrl = match?.[1] || part;
          const trailing = match?.[2] || "";

          return (
            <span key={`activity-link-${lineIndex}-${partIndex}`}>
              <a
                href={toHref(cleanUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline break-all"
              >
                {cleanUrl}
              </a>
              {trailing}
            </span>
          );
        })}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </span>
    ));
  };

  const handleOpenBoardActivityAttachment = async (activity: BoardActivity) => {
    if (!activity.attachment_path && !activity.attachment_url) return;

    try {
      setOpeningActivityAttachmentId(activity.id);
      const res = await api.get(`/activities/${activity.id}/attachment`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: activity.attachment_mime || res.headers["content-type"] || "application/octet-stream",
      });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.target = "_blank";
      if (activity.attachment_name) {
        link.download = activity.attachment_name;
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Open board activity attachment failed", err);
      alert("Could not open attachment.");
    } finally {
      setOpeningActivityAttachmentId(null);
    }
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
      category: newListCategory,
      position,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cards: [],
    };

    setBoard((prev) => (prev ? { ...prev, lists: [...prev.lists, tempList] } : null));

    setNewListTitle("");
    setNewListCategory(0);
    setIsAddListOpen(false);

    try {
      const res = await api.post(`/boards/${board.id}/lists`, {
        title: tempList.title,
        category: tempList.category ?? 0,
        position,
      });
      const newListId = res.data.id; // Assume backend returns the created list
      await logActivity("created list", `List: ${tempList.title}`, undefined, newListId);
      await fetchBoard();
    } catch (err) {
      console.error("Create list failed", err);
      await fetchBoard();
    }
  };

  const canEditListTitle = Number(profile?.role_id) === 1;

  const startEditListTitle = (list: List) => {
    if (!canEditListTitle || savingListId !== null) return;
    setEditingListId(list.id);
    setEditedListTitle(list.title);
  };

  const handleSaveListTitle = async (list: List) => {
    if (!board) return;

    const nextTitle = editedListTitle.trim();
    if (!nextTitle) {
      setEditedListTitle(list.title);
      setEditingListId(null);
      return;
    }

    if (nextTitle === list.title) {
      setEditingListId(null);
      return;
    }

    setSavingListId(list.id);
    try {
      await api.put(`/boards/${board.id}/lists/${list.id}`, { title: nextTitle });
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              lists: prev.lists.map((l) => (l.id === list.id ? { ...l, title: nextTitle } : l)),
            }
          : prev
      );
      setEditingListId(null);
    } catch (err) {
      console.error("Update list title failed", err);
      alert("Could not update list title.");
      setEditedListTitle(list.title);
    } finally {
      setSavingListId(null);
    }
  };

  const handleCreateCard = async (listId: number) => {
    if (!newCardInvoice.trim()) {
      alert("Invoice is required.");
      return;
    }

    const payload = {
      invoice: newCardInvoice.trim(),
      first_name: newCardFirstName.trim() || undefined,
      last_name: newCardLastName.trim() || undefined,
    };

    try {
      const res = await api.post(`/board-lists/${listId}/cards`, payload);
      const newCardId = res.data.id; // Assume backend returns the created card
      await logActivity(
        "created card",
        `Card: ${payload.invoice} ${payload.first_name || ""} ${payload.last_name || ""}`.trim(),
        newCardId
      );
      setNewCardInvoice("");
      setNewCardFirstName("");
      setNewCardLastName("");
      setActiveCardListId(null);
      await fetchBoard();
    } catch (err) {
      console.error("Create card failed", err);
      alert("Could not create card. Please check invoice uniqueness.");
    }
  };

  const cancelAddCard = () => {
    setNewCardInvoice("");
    setNewCardFirstName("");
    setNewCardLastName("");
    setActiveCardListId(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (isSearching || hasActiveFilters) return;
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
    if (isSearching || hasActiveFilters) return;
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

    const isMovingToVisa = (toList.category ?? 0) === 1;
    if (isMovingToVisa && !movedCard.payment_done) {
      setMoveBlockedMessage("This card is unpaid. Mark visa payment as done before moving it to Visa.");
      return;
    }

    const isMovingToDependantVisa = (toList.category ?? 0) === 2;
    if (isMovingToDependantVisa && !movedCard.dependant_payment_done) {
      setMoveBlockedMessage(
        "Dependant payment is pending. Mark dependant payment as done before moving it to Dependant Visa."
      );
      return;
    }

    const previousBoardState: Board = {
      ...board,
      lists: board.lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) => ({ ...card })),
      })),
    };

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
    } catch (err: any) {
      setBoard(previousBoardState);
      const message = err?.response?.data?.message;
      if (typeof message === "string" && message.toLowerCase().includes("payment")) {
        setMoveBlockedMessage(message);
      }
    }
  };

  type ListWithSearchMeta = List & {
    totalCards: number;
    matchedByTitle: boolean;
  };

  const { admissionLists, visaLists, dependantVisaLists, totalMatchedCards } = useMemo(() => {
    if (!board) {
      return {
        admissionLists: [] as ListWithSearchMeta[],
        visaLists: [] as ListWithSearchMeta[],
        dependantVisaLists: [] as ListWithSearchMeta[],
        totalMatchedCards: 0,
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay(); // 0 = Sun
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - daysSinceMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const isWildcardSearch = deferredSearchTerm === "*";
    const hasTextSearch = isSearching && !isWildcardSearch;
    const searchTerms = hasTextSearch
      ? deferredSearchTerm.split(/\s+/).filter(Boolean)
      : [];
    const hasPaymentTerm = searchTerms.some((term) =>
      ["paid", "done", "unpaid", "pending"].includes(term)
    );

    const cardMatchesDueDateFilter = (card: Card) => {
      if (dueDateFilter === "all") return true;

      const dueDate = parseDateOnly(card.due_date);
      if (!dueDate) return false;

      if (dueDateFilter === "today") {
        return dueDate.toDateString() === today.toDateString();
      }

      if (dueDateFilter === "this_week") {
        return dueDate >= weekStart && dueDate <= weekEnd;
      }

      if (dueDateFilter === "overdue") {
        return dueDate < today;
      }

      return true;
    };

    const cardMatchesFiltersAndSearch = (card: Card) => {
      const countryIds =
        Array.isArray(card.country_label_ids) && card.country_label_ids.length > 0
          ? card.country_label_ids
          : card.country_label_id != null
          ? [card.country_label_id]
          : [];

      const serviceAreaIds =
        Array.isArray(card.service_area_ids) && card.service_area_ids.length > 0
          ? card.service_area_ids
          : card.service_area_id != null
          ? [card.service_area_id]
          : [];

      if (
        selectedCountryFilterIds.length > 0 &&
        !countryIds.some((countryId) => selectedCountryFilterIds.includes(countryId))
      ) {
        return false;
      }
      if (
        selectedIntakeFilterIds.length > 0 &&
        (card.intake_label_id == null || !selectedIntakeFilterIds.includes(card.intake_label_id))
      ) {
        return false;
      }
      if (
        selectedServiceAreaFilterIds.length > 0 &&
        !serviceAreaIds.some((serviceAreaId) => selectedServiceAreaFilterIds.includes(serviceAreaId))
      ) {
        return false;
      }
      if (!cardMatchesDueDateFilter(card)) {
        return false;
      }

      if (!hasTextSearch) {
        return true;
      }

      const countryLabelName = countryIds
        .map((id) => countryLabelMap[id] || "")
        .filter(Boolean)
        .join(" ");
      const intakeLabelName =
        card.intake_label_id != null
          ? intakeLabelMap[card.intake_label_id] || ""
          : "";
      const serviceAreaName = serviceAreaIds
        .map((id) => serviceAreaMap[id] || "")
        .filter(Boolean)
        .join(" ");
      const paymentTerms = card.payment_done
        ? "visa payment paid done"
        : "visa payment unpaid pending";
      const dependantPaymentTerms = card.dependant_payment_done
        ? "dependant payment dependant-paid dependant-done"
        : "dependant payment dependant-unpaid dependant-pending";

      const haystack = [
        card.invoice,
        card.first_name,
        card.last_name,
        card.title,
        card.description,
        countryLabelName,
        intakeLabelName,
        serviceAreaName,
        paymentTerms,
        dependantPaymentTerms,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();

      return searchTerms.every((term) => {
        if (term === "paid" || term === "done") {
          return card.payment_done === true;
        }
        if (term === "unpaid" || term === "pending") {
          return card.payment_done !== true;
        }
        if (term === "dependant-paid" || term === "dependent-paid" || term === "dependant-done") {
          return card.dependant_payment_done === true;
        }
        if (
          term === "dependant-unpaid" ||
          term === "dependent-unpaid" ||
          term === "dependant-pending"
        ) {
          return card.dependant_payment_done !== true;
        }
        return haystack.includes(term);
      });
    };

    const filterLists = (source: List[]): ListWithSearchMeta[] => {
      return source
        .map((list) => {
          const totalCards = list.cards.length;

          if (!hasTextSearch && !hasActiveFilters) {
            return {
              ...list,
              cards: [...list.cards],
              totalCards,
              matchedByTitle: false,
            };
          }

          const matchedByTitle =
            hasTextSearch &&
            !hasActiveFilters &&
            !hasPaymentTerm &&
            list.title.toLowerCase().includes(deferredSearchTerm);
          const cards = list.cards.filter((card) => cardMatchesFiltersAndSearch(card));

          return {
            ...list,
            cards,
            totalCards,
            matchedByTitle,
          };
        })
        .filter((list) => {
          if (!hasTextSearch && !hasActiveFilters) return true;
          if (hasActiveFilters) return list.cards.length > 0;
          return list.matchedByTitle || list.cards.length > 0;
        });
    };

    const admissionSource = board.lists.filter((list) => (list.category ?? 0) === 0);
    const visaSource = board.lists.filter((list) => list.category === 1);
    const dependantVisaSource = board.lists.filter((list) => list.category === 2);

    const filteredAdmission = filterLists(admissionSource);
    const filteredVisa = filterLists(visaSource);
    const filteredDependantVisa = filterLists(dependantVisaSource);
    const allFiltered = [...filteredAdmission, ...filteredVisa, ...filteredDependantVisa];

    return {
      admissionLists: filteredAdmission,
      visaLists: filteredVisa,
      dependantVisaLists: filteredDependantVisa,
      totalMatchedCards: allFiltered.reduce((sum, list) => sum + list.cards.length, 0),
    };
  }, [
    board,
    deferredSearchTerm,
    isSearching,
    hasActiveFilters,
    dueDateFilter,
    selectedCountryFilterIds,
    selectedIntakeFilterIds,
    selectedServiceAreaFilterIds,
    countryLabelMap,
    intakeLabelMap,
    serviceAreaMap,
  ]);

  const addCardAllowedListId = useMemo(() => {
    if (!board || board.lists.length === 0) return null;
    const firstList = [...board.lists]
      .filter((list) => (list.category ?? 0) === 0)
      .sort((a, b) => a.position - b.position)[0];
    return firstList?.id ?? null;
  }, [board]);

  if (loading) return <Loader message="Loading board..." />;
  if (!board) return null;

  const renderListColumn = (list: ListWithSearchMeta, canAddCard: boolean) => (
    <DroppableList key={list.id} list={list}>
      <div className="p-4 pb-2">
        <div className="flex justify-between items-center gap-2 mb-3">
          {editingListId === list.id ? (
            <input
              autoFocus
              value={editedListTitle}
              onChange={(e) => setEditedListTitle(e.target.value)}
              onBlur={() => void handleSaveListTitle(list)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSaveListTitle(list);
                }
                if (e.key === "Escape") {
                  setEditedListTitle(list.title);
                  setEditingListId(null);
                }
              }}
              disabled={savingListId === list.id}
              className="h-9 w-full rounded-md border border-indigo-300 bg-white px-3 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          ) : (
            <h3
              className={`font-semibold text-lg truncate ${
                canEditListTitle ? "cursor-text hover:underline underline-offset-4" : ""
              } ${isSearching && list.matchedByTitle ? "text-indigo-700" : ""}`}
              onClick={() => startEditListTitle(list)}
              title={canEditListTitle ? "Click to edit list title" : undefined}
            >
              {list.title}
            </h3>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {shouldShowMatchCounts && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold whitespace-nowrap">
                {list.cards.length} {list.cards.length === 1 ? "card" : "cards"} match
              </span>
            )}
          </div>
        </div>

        <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {list.cards.map((card) => (
              <DraggableCard
                key={card.id}
                card={card}
                onClick={() => setSelectedCard(card)}
                labelBadges={getCardLabelBadges(card)}
                dragDisabled={isSearching || hasActiveFilters}
              />
            ))}
          </div>
        </SortableContext>
      </div>

      {canAddCard ? (
        <div className="p-3 pt-0">
          {activeCardListId === list.id ? (
            <div className="bg-white rounded-lg border p-3 shadow-sm">
              <input
                value={newCardInvoice}
                onChange={(e) => setNewCardInvoice(e.target.value)}
                placeholder="Invoice"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none mb-3"
              />

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
      ) : (
        <div className="h-12" />
      )}
    </DroppableList>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* TOP BAR */}
      <header className="h-14 bg-white border-b shadow-sm flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="h-8 flex items-center cursor-pointer"
            title="Go to home"
          >
            <img
              src="/images/logo/connected_logo.png"
              alt="Connected Logo"
              className="h-8 w-auto object-contain"
            />
          </button>
          {/* <span className="font-semibold">{board.name}</span>
          <Star size={16} className="text-amber-500 fill-amber-500" /> */}
        </div>

        <div className="flex-1 max-w-2xl mx-6">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cards, invoice, student, list title (Ctrl+K)"
              className="w-full h-9 pl-9 pr-9 rounded-lg bg-gray-100 border text-sm focus:ring-2 focus:ring-indigo-400/40 outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => setShowFilterMenu((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition ${
                hasActiveFilters
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter size={15} />
              Filter
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Card Filters</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCountryFilterIds([]);
                      setSelectedIntakeFilterIds([]);
                      setSelectedServiceAreaFilterIds([]);
                      setDueDateFilter("all");
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Reset
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Search
                  </label>
                  <input
                    ref={filterSearchInputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Type to filter cards, use * for all cards"
                    className="h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Country ({selectedCountryFilterIds.length})
                  </label>
                  <div className="max-h-28 overflow-y-auto rounded-md border border-gray-300 bg-white">
                    {countryFilterOptions.length === 0 ? (
                      <div className="px-2.5 py-2 text-xs text-gray-500">No options</div>
                    ) : (
                      countryFilterOptions.map((item) => (
                        <label
                          key={`country-filter-${item.id}`}
                          className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCountryFilterIds.includes(item.id)}
                            onChange={() => toggleFilterSelection(item.id, setSelectedCountryFilterIds)}
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>{item.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Intake ({selectedIntakeFilterIds.length})
                  </label>
                  <div className="max-h-28 overflow-y-auto rounded-md border border-gray-300 bg-white">
                    {intakeFilterOptions.length === 0 ? (
                      <div className="px-2.5 py-2 text-xs text-gray-500">No options</div>
                    ) : (
                      intakeFilterOptions.map((item) => (
                        <label
                          key={`intake-filter-${item.id}`}
                          className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIntakeFilterIds.includes(item.id)}
                            onChange={() => toggleFilterSelection(item.id, setSelectedIntakeFilterIds)}
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>{item.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Service ({selectedServiceAreaFilterIds.length})
                  </label>
                  <div className="max-h-28 overflow-y-auto rounded-md border border-gray-300 bg-white">
                    {serviceAreaFilterOptions.length === 0 ? (
                      <div className="px-2.5 py-2 text-xs text-gray-500">No options</div>
                    ) : (
                      serviceAreaFilterOptions.map((item) => (
                        <label
                          key={`service-filter-${item.id}`}
                          className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedServiceAreaFilterIds.includes(item.id)}
                            onChange={() => toggleFilterSelection(item.id, setSelectedServiceAreaFilterIds)}
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>{item.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                  <select
                    value={dueDateFilter}
                    onChange={(e) => setDueDateFilter(e.target.value as "all" | "today" | "this_week" | "overdue")}
                    className="h-9 w-full rounded-md border border-gray-300 px-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="all">Select</option>
                    <option value="this_week">This Week</option>
                    <option value="today">Today</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                {shouldShowMatchCounts && (
                  <div className="pt-1 text-xs font-medium text-gray-600">
                    {totalMatchedCards} {totalMatchedCards === 1 ? "card" : "cards"} match current filters
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={openActivityModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition ${
              showActivityModal
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Activity size={15} />
            Activity
          </button>

          <button
            type="button"
            onClick={() => void openArchivedModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Archive size={15} />
            Archived
          </button>

          <button
            onClick={() => setIsAddListOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm rounded-lg shadow-md"
          >
            <Plus size={16} /> New List
          </button>
          {/* <Bell size={20} />
          <HelpCircle size={20} /> */}
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="h-8 px-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold flex items-center justify-center shadow-sm hover:opacity-95"
            title="Edit profile"
          >
            {profile?.first_name || "User"}
          </button>
        </div>
      </header>

      {/* BOARD */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl shadow-inner m-4">
        <div className="h-16 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between px-6 rounded-t-xl">
          <div className="flex items-center gap-4">
            <LayoutGrid size={20} />
            <h1 className="text-xl font-bold">{board.name}</h1>
          </div>
          
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
            <div className="min-h-full p-6 flex gap-6 min-w-max">
              <div className="min-h-0 flex gap-6">
                <div className="min-w-[420px] flex flex-col gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wide">
                    Admission
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-6 min-w-max items-start pb-2 pr-2">
                      {admissionLists.length > 0 ? (
                        admissionLists.map((list) =>
                          renderListColumn(list, list.id === addCardAllowedListId)
                        )
                      ) : (
                        <div className="w-80 h-28 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 text-emerald-800 text-sm flex items-center justify-center">
                          {isSearching || hasActiveFilters ? "No matching cards in admission" : "No admission lists"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="self-stretch border-l-2 border-dotted border-indigo-300/70" />

                <div className="min-w-[420px] flex flex-col gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wide">
                    Visa
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-6 min-w-max items-start pb-2 pr-2">
                      {visaLists.length > 0 ? (
                        visaLists.map((list) =>
                          renderListColumn(list, list.id === addCardAllowedListId)
                        )
                      ) : (
                        <div className="w-80 h-28 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 text-amber-800 text-sm flex items-center justify-center">
                          {isSearching || hasActiveFilters ? "No matching cards in visa" : "No visa lists"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="self-stretch border-l-2 border-dotted border-indigo-300/70" />

                <div className="min-w-[420px] flex flex-col gap-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold uppercase tracking-wide">
                    Dependant Visa
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-6 min-w-max items-start pb-2 pr-2">
                      {dependantVisaLists.length > 0 ? (
                        dependantVisaLists.map((list) =>
                          renderListColumn(list, list.id === addCardAllowedListId)
                        )
                      ) : (
                        <div className="w-80 h-28 rounded-xl border border-dashed border-rose-300 bg-rose-50/50 text-rose-800 text-sm flex items-center justify-center">
                          {isSearching || hasActiveFilters ? "No matching cards in dependant visa" : "No dependant visa lists"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ADD ANOTHER LIST (opened from header button) */}
              {isAddListOpen && (
                <div className="w-80 shrink-0 self-start">
                  <div className="bg-white rounded-xl p-4 border shadow-md">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setNewListCategory(0)}
                        className={`h-9 rounded-md text-sm font-semibold border transition ${
                          newListCategory === 0
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        Admission
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewListCategory(1)}
                        className={`h-9 rounded-md text-sm font-semibold border transition ${
                          newListCategory === 1
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        Visa
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewListCategory(2)}
                        className={`h-9 rounded-md text-sm font-semibold border transition ${
                          newListCategory === 2
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        Dependant
                      </button>
                    </div>

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
                        onClick={() => {
                          setIsAddListOpen(false);
                          setNewListTitle("");
                          setNewListCategory(0);
                        }}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
            profile={profile}
            onClose={() => setSelectedCard(null)}
            setSelectedCard={setSelectedCard}
            fetchBoard={fetchBoard}
          />
        )}

        {showArchivedModal && (
          <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800">Archived Cards</h3>
                <button
                  onClick={() => setShowArchivedModal(false)}
                  className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4">
                {loadingArchivedCards ? (
                  <div className="py-10 text-center text-sm text-gray-500">Loading archived cards...</div>
                ) : archivedCards.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">No archived cards found.</div>
                ) : (
                  <div className="space-y-3">
                    {archivedCards.map((card) => {
                      const listTitle = card.boardList?.title || card.board_list?.title || "Unknown List";
                      const cardTitle = `${card.invoice || `ID-${card.id}`} ${card.first_name || ""} ${card.last_name || ""}`.trim();

                      return (
                        <div
                          key={card.id}
                          className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{cardTitle}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {listTitle} • Archived on {formatDateWithOrdinal(card.updated_at)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleRestoreArchivedCard(card.id)}
                            disabled={restoringCardId === card.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                              restoringCardId === card.id
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            <RotateCcw size={14} />
                            {restoringCardId === card.id ? "Restoring..." : "Restore"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => setShowArchivedModal(false)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showActivityModal && (
          <div className="fixed inset-0 z-[72] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Board Activity</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 pt-4 pb-3 border-b bg-white">
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setActivityTab("all")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      activityTab === "all"
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityTab("comment")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      activityTab === "comment"
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Comment
                  </button>
                </div>
              </div>

              <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
                {loadingBoardActivities ? (
                  <div className="py-12 text-center text-sm text-gray-500">Loading activity...</div>
                ) : boardActivities.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500">
                    No {activityTab === "comment" ? "comments" : "activities"} found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {boardActivities.map((activityItem) => (
                      <div
                        key={activityItem.id}
                        className="rounded-xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center shrink-0">
                            {(activityItem.user_name || "U").charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-gray-800">
                              <strong className="text-gray-900">
                                {activityItem.user_name || "User"}
                              </strong>{" "}
                              {activityItem.action}
                            </div>

                            {activityItem.details ? (
                              <div
                                className={`mt-1 text-sm leading-relaxed ${
                                  activityItem.action === "commented"
                                    ? "rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-700"
                                    : "text-gray-700"
                                }`}
                              >
                                {activityItem.action === "commented" ? (
                                  <div className="flex items-start gap-2">
                                    <MessageSquare size={14} className="mt-0.5 text-gray-500 shrink-0" />
                                    <div className="min-w-0">{renderTextWithLinks(activityItem.details)}</div>
                                  </div>
                                ) : (
                                  renderTextWithLinks(activityItem.details)
                                )}
                              </div>
                            ) : null}

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span>{formatTimestamp(activityItem.created_at)}</span>
                              {activityItem.card_id ? (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {getBoardActivityCardTitle(activityItem)}
                                </span>
                              ) : null}
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                {getBoardActivityListTitle(activityItem)}
                              </span>
                            </div>

                            {(activityItem.attachment_path || activityItem.attachment_url) && (
                              <button
                                type="button"
                                onClick={() => void handleOpenBoardActivityAttachment(activityItem)}
                                disabled={openingActivityAttachmentId === activityItem.id}
                                className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${
                                  openingActivityAttachmentId === activityItem.id
                                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                    : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                }`}
                              >
                                {openingActivityAttachmentId === activityItem.id
                                  ? "Opening..."
                                  : (activityItem.attachment_name || "Attachment")}
                                {activityItem.attachment_size ? (
                                  <span className="text-gray-500">
                                    ({formatFileSize(activityItem.attachment_size)})
                                  </span>
                                ) : null}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {moveBlockedMessage && (
          <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b bg-rose-50">
                <h3 className="text-lg font-semibold text-rose-800">Move Blocked</h3>
                <button
                  onClick={() => setMoveBlockedMessage(null)}
                  className="h-8 w-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-100 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-4 text-sm text-gray-700">
                {moveBlockedMessage}
              </div>

              <div className="px-5 py-4 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => setMoveBlockedMessage(null)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
