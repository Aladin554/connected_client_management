import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/plugins/autolink";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/skins/ui/oxide/content.min.css";
import "tinymce/skins/content/default/content.min.css";
import { Archive, BarChart3, Image as ImageIcon, Bell, Calendar, Check, Copy, CreditCard, FolderOpen, MessageSquare, MoreHorizontal, Paperclip, Plus, SquarePen, Star, Users, X } from "lucide-react";
import api from "../../../api/axios";
import "react-datepicker/dist/react-datepicker.css";
import type { Activity, Card, CardMember, Profile } from "./types";
import { DESCRIPTION_TEMPLATE, formatDateWithOrdinal, formatFileSize, formatISODateForInput, formatTimestamp } from "./utils";
import { Globe, Tag, CalendarDays } from 'lucide-react';
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

const LazyDatePicker = lazy(() => import("react-datepicker"));

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const hasHtmlMarkup = (value: string): boolean => /<\/?[a-z][\s\S]*>/i.test(value);

const normalizeDescriptionHtml = (value: string): string =>
  sanitizeHtml(value)
    .replace(/\sclass="[^"]*"/gi, "")
    .replace(/<br[^>]*>/gi, "<br>")
    .replace(/<div[^>]*>\s*<br\s*\/?>\s*<\/div>/gi, "<br>")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "<br>")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<\/div>/gi, "<br>")
    .replace(/(<br\s*\/?>\s*)+$/gi, "")
    .trim();

const getVisibleDescriptionText = (value: string): string =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();

const descriptionToHtml = (value: string): string => {
  const content = value.trim();
  if (!content) return "";

  if (hasHtmlMarkup(content)) {
    return normalizeDescriptionHtml(content);
  }

  return content
    .split("\n")
    .map((line) => (line.trim() ? escapeHtml(line) : "&nbsp;"))
    .join("<br>");
};

interface CardDetailModalProps {
  card: Card;
  listTitle: string;
  profile: Profile | null;
  onClose: () => void;
  setSelectedCard: React.Dispatch<React.SetStateAction<Card | null>>;
  fetchBoard: () => Promise<void>;
}

export default function CardDetailModal({
  card,
  listTitle,
  profile,
  onClose,
  setSelectedCard,
  fetchBoard,
}: CardDetailModalProps) {
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedCountryIds, setSelectedCountryIds] = useState<number[]>([]);
  const [selectedIntakeId, setSelectedIntakeId] = useState<number | null>(null);
  const [selectedServiceAreaIds, setSelectedServiceAreaIds] = useState<number[]>([]);
  const [activeLabelType, setActiveLabelType] = useState<"country" | "intake" | "serviceArea">("country");
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([]);
  const [intakes, setIntakes] = useState<{ id: number; name: string }[]>([]);
  const [serviceAreas, setServiceAreas] = useState<{ id: number; name: string }[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);

  // Description editing
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(
    card.description?.trim() ? card.description : DESCRIPTION_TEMPLATE
  );
  const [savingDescription, setSavingDescription] = useState(false);
  const descriptionSaveInFlightRef = useRef(false);

  // Due Date
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editedDueDate, setEditedDueDate] = useState(formatISODateForInput(card.due_date));
  const [savingDueDate, setSavingDueDate] = useState(false);
  const [isEditingCardIdentity, setIsEditingCardIdentity] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState(card.invoice || "");
  const [editedFirstName, setEditedFirstName] = useState(card.first_name || "");
  const [editedLastName, setEditedLastName] = useState(card.last_name || "");
  const [editedContactEmail, setEditedContactEmail] = useState(card.contact_email || "");
  const [savingCardIdentity, setSavingCardIdentity] = useState(false);
  const [paymentDone, setPaymentDone] = useState(Boolean(card.payment_done));
  const [dependantPaymentDone, setDependantPaymentDone] = useState(Boolean(card.dependant_payment_done));
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingDependantPayment, setSavingDependantPayment] = useState(false);
  const [savingArchive, setSavingArchive] = useState(false);
  const [showCardActionsMenu, setShowCardActionsMenu] = useState(false);
  const [showActivitySummary, setShowActivitySummary] = useState(false);
  const cardActionsMenuRef = useRef<HTMLDivElement | null>(null);

  // Activities and Comments
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [postingComment, setPostingComment] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<number | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersSaving, setMembersSaving] = useState(false);
  const [memberOptions, setMemberOptions] = useState<CardMember[]>([]);
  const [memberPreview, setMemberPreview] = useState<CardMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [membersError, setMembersError] = useState<string | null>(null);
  const [canManageMembers, setCanManageMembers] = useState(
    [1, 2, 3, 4].includes(Number(profile?.role_id))
  );

  // Google Drive folder
  const [driveEnabled, setDriveEnabled] = useState(false);
  // Not seeded from card.google_drive_folder_link - that's the root link and
  // is only safe to use once the backend confirms driveReady (see fetchDriveInfo).
  const [driveFolderLink, setDriveFolderLink] = useState<string | null>(null);
  const [driveReady, setDriveReady] = useState(false);
  const [driveMembers, setDriveMembers] = useState<CardMember[]>([]);
  const [driveOpening, setDriveOpening] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [copyingDriveLink, setCopyingDriveLink] = useState(false);
  const [driveLinkCopied, setDriveLinkCopied] = useState(false);
  // True only once we know Drive is enabled for this card but it isn't
  // ready yet - if Drive isn't enabled at all, leave the buttons clickable
  // instead of looking like they're stuck "preparing" forever.
  const drivePreparing = driveEnabled && !driveReady && !driveFolderLink;

  const canEditCardIdentity = [1, 2, 3].includes(Number(profile?.role_id));
  const canManagePaymentStatus = [1, 2, 3].includes(Number(profile?.role_id));

  // Sync when card changes
  useEffect(() => {
    const nextCountryIds = Array.isArray(card.country_label_ids)
      ? card.country_label_ids
      : card.country_label_id != null
      ? [card.country_label_id]
      : [];
    setSelectedCountryIds(nextCountryIds);
    setSelectedIntakeId(card.intake_label_id ?? null);
    const nextServiceAreaIds = Array.isArray(card.service_area_ids)
      ? card.service_area_ids
      : card.service_area_id != null
      ? [card.service_area_id]
      : [];
    setSelectedServiceAreaIds(nextServiceAreaIds);
    setActiveLabelType("country");
    setEditedDescription(card.description?.trim() ? card.description : DESCRIPTION_TEMPLATE);
    setEditedDueDate(formatISODateForInput(card.due_date));
    setIsEditingCardIdentity(false);
    setEditedInvoice(card.invoice || "");
    setEditedFirstName(card.first_name || "");
    setEditedLastName(card.last_name || "");
    setEditedContactEmail(card.contact_email || "");
    setPaymentDone(Boolean(card.payment_done));
    setDependantPaymentDone(Boolean(card.dependant_payment_done));
    setShowCardActionsMenu(false);
    setShowActivitySummary(false);
    setShowMembersModal(false);
    setMemberOptions([]);
    setMemberPreview([]);
    setSelectedMemberIds([]);
    setMemberSearchTerm("");
    setMembersError(null);
    setCanManageMembers([1, 2, 3, 4].includes(Number(profile?.role_id)));
    setDriveFolderLink(null);
    setDriveReady(false);
    setDriveMembers([]);
    fetchActivities();
    void fetchCardMembers();
    void fetchDriveInfo();
  }, [card, profile?.role_id]);

  useEffect(() => {
    void Promise.all([fetchCountryOptions(), fetchIntakeOptions(), fetchServiceAreaOptions()]);
  }, [card.id]);

  useEffect(() => {
    const handleEscClose = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showCardActionsMenu) {
        setShowCardActionsMenu(false);
        return;
      }
      if (isEditingCardIdentity) {
        setIsEditingCardIdentity(false);
        setEditedInvoice(card.invoice || "");
        setEditedFirstName(card.first_name || "");
        setEditedLastName(card.last_name || "");
        setEditedContactEmail(card.contact_email || "");
        return;
      }
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleEscClose);
    return () => window.removeEventListener("keydown", handleEscClose);
  }, [onClose, showCardActionsMenu, isEditingCardIdentity, card.invoice, card.first_name, card.last_name, card.contact_email]);

  useEffect(() => {
    if (!showCardActionsMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!cardActionsMenuRef.current) return;
      if (!cardActionsMenuRef.current.contains(event.target as Node)) {
        setShowCardActionsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showCardActionsMenu]);

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/cards/${card.id}/activities`);
      setActivities(res.data || []);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() && !commentAttachment) return;
    setPostingComment(true);
    try {
      const formData = new FormData();
      if (newComment.trim()) {
        formData.append("details", newComment.trim());
      }
      if (commentAttachment) {
        formData.append("attachment", commentAttachment);
      }

      await api.post(`/cards/${card.id}/activities`, formData);
      setNewComment("");
      setCommentAttachment(null);
      setAttachmentInputKey((prev) => prev + 1);
      await fetchActivities();
    } catch (err) {
      console.error("Failed to post comment:", err);
      alert("Could not post comment / attachment.");
    } finally {
      setPostingComment(false);
    }
  };

  const handleOpenAttachment = async (activity: Activity) => {
    try {
      setOpeningAttachmentId(activity.id);
      const res = await api.get(`/activities/${activity.id}/attachment`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: activity.attachment_mime || res.headers["content-type"] || "application/octet-stream",
      });
      const blobUrl = URL.createObjectURL(blob);

      const popup = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = activity.attachment_name || "attachment";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      console.error("Failed to open attachment:", err);
      alert("Could not open attachment.");
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const getMemberDisplayName = (member: CardMember): string => {
    const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();
    return fullName || member.email || `User #${member.id}`;
  };

  const getMemberInitials = (member: CardMember): string => {
    const first = (member.first_name || "").trim().charAt(0);
    const last = (member.last_name || "").trim().charAt(0);
    const fallback = (member.email || "").trim().charAt(0);
    const initials = `${first}${last}`.trim() || fallback;
    return (initials || "U").toUpperCase();
  };

  const fetchCardMembers = async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const res = await api.get(`/cards/${card.id}/members`);
      const fallbackCanManage = [1, 2, 3, 4].includes(Number(profile?.role_id));
      const canManageFromApi =
        typeof res.data?.can_manage === "boolean" ? Boolean(res.data.can_manage) : fallbackCanManage;
      const members: CardMember[] = res.data?.members || [];
      const optionsFromApi: CardMember[] = Array.isArray(res.data?.options)
        ? res.data.options
        : [];
      const options: CardMember[] = optionsFromApi.length > 0 ? optionsFromApi : members;

      setCanManageMembers(canManageFromApi);
      setMemberPreview(members);
      setSelectedMemberIds(members.map((member) => member.id));
      setMemberOptions(options);
    } catch (err) {
      console.error("Failed to fetch card members:", err);
      setCanManageMembers([1, 2, 3, 4].includes(Number(profile?.role_id)));
      setMembersError("Could not load members.");
    } finally {
      setMembersLoading(false);
    }
  };

  const handleOpenMembersModal = async () => {
    setShowMembersModal(true);
    await fetchCardMembers();
  };

  const fetchDriveInfo = async (): Promise<{
    link: string | null;
    enabled: boolean;
    ready: boolean;
    error: string | null;
  }> => {
    try {
      const res = await api.get(`/cards/${card.id}/drive-info`);
      const enabled = Boolean(res.data?.enabled);
      const ready = Boolean(res.data?.ready);
      const link = res.data?.folder_link || null;
      const error = res.data?.error || null;
      setDriveEnabled(enabled);
      setDriveReady(ready);
      setDriveFolderLink(link);
      setDriveMembers(Array.isArray(res.data?.members) ? res.data.members : []);
      setDriveError(error);
      return { link, enabled, ready, error };
    } catch (err) {
      console.error("Failed to fetch Google Drive info:", err);
      const error = "Could not reach the server to check Google Drive status.";
      setDriveError(error);
      return { link: null, enabled: driveEnabled, ready: driveReady, error };
    }
  };

  const handleOpenDrive = async () => {
    if (driveOpening) return;

    if (driveFolderLink) {
      window.open(driveFolderLink, "_blank", "noopener,noreferrer");
      return;
    }

    setDriveOpening(true);
    try {
      const { link, enabled, ready, error } = await fetchDriveInfo();
      if (link) {
        window.open(link, "_blank", "noopener,noreferrer");
      } else if (!enabled) {
        alert("Google Drive integration is not enabled for this app yet.");
      } else if (!ready) {
        alert(
          "Google Drive folder is still being prepared (creating folders and uploading template files). Please try again in a few minutes."
        );
      } else {
        alert(
          `Google Drive folder could not be created/found.\n\nSource: Google Drive API\nReason: ${
            error || "Unknown error"
          }\n\nCheck: does the configured root folder still exist in Google Drive, and is it shared with the service account?`
        );
      }
    } finally {
      setDriveOpening(false);
    }
  };

  const handleCopyDriveLink = async () => {
    if (copyingDriveLink) return;

    setCopyingDriveLink(true);
    try {
      const { link, ready } = driveFolderLink
        ? { link: driveFolderLink, ready: driveReady }
        : await fetchDriveInfo();
      if (!link) {
        alert(
          ready
            ? "Google Drive folder is not available for this card yet."
            : "Google Drive folder is still being prepared (creating folders and uploading template files). Please try again in a few minutes."
        );
        return;
      }
      await navigator.clipboard.writeText(link);
      setDriveLinkCopied(true);
      window.setTimeout(() => setDriveLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy Google Drive link:", err);
      alert("Could not copy the Google Drive link.");
    } finally {
      setCopyingDriveLink(false);
    }
  };

  const handleToggleMember = (userId: number) => {
    if (!canManageMembers || membersSaving) return;

    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveMembers = async () => {
    if (!canManageMembers) return;

    setMembersSaving(true);
    setMembersError(null);
    try {
      await api.put(`/cards/${card.id}/members`, {
        user_ids: selectedMemberIds,
      });
      await fetchCardMembers();
      await fetchActivities();
      await fetchBoard();
      void fetchDriveInfo();
      setShowMembersModal(false);
    } catch (err: any) {
      console.error("Failed to save members:", err);
      setMembersError(err?.response?.data?.message || "Could not save members.");
    } finally {
      setMembersSaving(false);
    }
  };

  const filteredMemberOptions = useMemo(() => {
    const query = memberSearchTerm.trim().toLowerCase();
    if (!query) return memberOptions;

    return memberOptions.filter((member) => {
      const haystack = `${member.first_name || ""} ${member.last_name || ""} ${member.email || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [memberOptions, memberSearchTerm]);

  const activitySummary = useMemo(() => {
    const summary = {
      total: activities.length,
      comments: 0,
      attachments: 0,
      labelUpdates: 0,
      paymentUpdates: 0,
      latestAt: activities[0]?.created_at || null,
    };

    for (const activity of activities) {
      if (activity.action === "commented") {
        summary.comments += 1;
      }
      if (activity.attachment_path || activity.attachment_url) {
        summary.attachments += 1;
      }
      if (activity.action.includes("label")) {
        summary.labelUpdates += 1;
      }
      if (activity.action.includes("payment")) {
        summary.paymentUpdates += 1;
      }
    }

    return summary;
  }, [activities]);

  const normalizeLabelOptions = (payload: any): { id: number; name: string }[] => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const fetchCountryOptions = async () => {
    setLoadingLabels(true);
    try {
      const countryRes = await api.get("/country-labels");
      setCountries(normalizeLabelOptions(countryRes.data));
    } catch (err) {
      console.error("Failed to load country labels", err);
      alert("Could not load country labels.");
    } finally {
      setLoadingLabels(false);
    }
  };

  const fetchIntakeOptions = async () => {
    setLoadingLabels(true);
    try {
      const intakeRes = await api.get("/intake-labels");
      setIntakes(normalizeLabelOptions(intakeRes.data));
    } catch (err) {
      console.error("Failed to load intake labels", err);
      alert("Could not load intake labels.");
    } finally {
      setLoadingLabels(false);
    }
  };

  const fetchServiceAreaOptions = async () => {
    setLoadingLabels(true);
    try {
      const serviceRes = await api.get("/service-areas");
      setServiceAreas(normalizeLabelOptions(serviceRes.data));
    } catch (err) {
      console.error("Failed to load service areas", err);
      alert("Could not load service areas.");
    } finally {
      setLoadingLabels(false);
    }
  };

  const handleOpenLabelModal = async (type: "country" | "intake" | "serviceArea") => {
    setActiveLabelType(type);
    setShowLabelModal(true);

    if (type === "country") {
      await fetchCountryOptions();
    } else if (type === "intake") {
      await fetchIntakeOptions();
    } else {
      await fetchServiceAreaOptions();
    }
  };

  const toggleMultiSelection = (
    targetId: number,
    setIds: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
    setIds((prev) =>
      prev.includes(targetId) ? prev.filter((id) => id !== targetId) : [...prev, targetId]
    );
  };

  const handleSaveLabels = async () => {
    try {
      const normalizedCountryIds = [...new Set(selectedCountryIds)];
      const normalizedServiceAreaIds = [...new Set(selectedServiceAreaIds)];
      const payload = {
        country_label_id: normalizedCountryIds[0] ?? null,
        country_label_ids: normalizedCountryIds,
        intake_label_id: selectedIntakeId ?? null,
        service_area_id: normalizedServiceAreaIds[0] ?? null,
        service_area_ids: normalizedServiceAreaIds,
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

  const handleSaveDescription = async (nextContent?: string) => {
    if (descriptionSaveInFlightRef.current) return;

    const normalized = normalizeDescriptionHtml(nextContent ?? editedDescription);
    const nextDescription = getVisibleDescriptionText(normalized) ? normalized : "";
    const currentDescription = normalizeDescriptionHtml(descriptionToHtml(card.description || ""));
    if (nextDescription === currentDescription) {
      setIsEditingDescription(false);
      return;
    }

    descriptionSaveInFlightRef.current = true;
    setSavingDescription(true);
    try {
      await api.put(`/cards/${card.id}/description`, { description: nextDescription || null });
      setSelectedCard((prev) =>
        prev && prev.id === card.id ? { ...prev, description: nextDescription || undefined } : prev
      );
      await fetchBoard();
      await fetchActivities(); // Refresh activities after update
      setIsEditingDescription(false);
    } catch (err) {
      console.error("Failed to save description:", err);
      alert("Could not save description.");
    } finally {
      setSavingDescription(false);
      descriptionSaveInFlightRef.current = false;
    }
  };

  const openDescriptionEditor = () => {
    setEditedDescription(descriptionToHtml(card.description?.trim() ? card.description : DESCRIPTION_TEMPLATE));
    setIsEditingDescription(true);
  };

  const openCardIdentityEditor = () => {
    if (!canEditCardIdentity) return;
    setEditedInvoice(card.invoice || "");
    setEditedFirstName(card.first_name || "");
    setEditedLastName(card.last_name || "");
    setEditedContactEmail(card.contact_email || "");
    setIsEditingCardIdentity(true);
  };

  const handleSaveCardIdentity = async () => {
    if (!canEditCardIdentity || savingCardIdentity) return;

    const nextInvoice = editedInvoice.trim();
    const nextFirstName = editedFirstName.trim();
    const nextLastName = editedLastName.trim();
    const nextContactEmail = editedContactEmail.trim();

    if (!nextInvoice) {
      alert("Invoice is required.");
      return;
    }

    if (nextContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextContactEmail)) {
      alert("Please enter a valid email address.");
      return;
    }

    const invoiceUnchanged = (card.invoice || "") === nextInvoice;
    const firstNameUnchanged = (card.first_name || "") === nextFirstName;
    const lastNameUnchanged = (card.last_name || "") === nextLastName;
    const contactEmailUnchanged = (card.contact_email || "") === nextContactEmail;

    if (invoiceUnchanged && firstNameUnchanged && lastNameUnchanged && contactEmailUnchanged) {
      setIsEditingCardIdentity(false);
      return;
    }

    setSavingCardIdentity(true);
    try {
      await api.put(`/board-lists/${card.board_list_id}/cards/${card.id}`, {
        invoice: nextInvoice,
        first_name: nextFirstName || null,
        last_name: nextLastName || null,
        contact_email: nextContactEmail || null,
      });

      setSelectedCard((prev) =>
        prev && prev.id === card.id
          ? {
              ...prev,
              invoice: nextInvoice,
              first_name: nextFirstName || undefined,
              last_name: nextLastName || undefined,
              contact_email: nextContactEmail || null,
            }
          : prev
      );

      await fetchBoard();
      await fetchActivities();
      if (!contactEmailUnchanged) {
        void fetchDriveInfo();
      }
      setIsEditingCardIdentity(false);
    } catch (err: any) {
      console.error("Failed to update card identity:", err);
      const apiMessage =
        err?.response?.data?.errors?.invoice?.[0] ||
        err?.response?.data?.errors?.contact_email?.[0] ||
        err?.response?.data?.message;
      alert(apiMessage || "Could not update card details.");
    } finally {
      setSavingCardIdentity(false);
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

  const handleTogglePayment = async () => {
    if (!canManagePaymentStatus || savingPayment) return;

    setSavingPayment(true);
    const nextStatus = !paymentDone;
    try {
      await api.put(`/cards/${card.id}/payment`, { payment_done: nextStatus });
      setPaymentDone(nextStatus);
      setSelectedCard((prev) =>
        prev && prev.id === card.id ? { ...prev, payment_done: nextStatus } : prev
      );
      await fetchBoard();
      await fetchActivities();
    } catch (err: any) {
      console.error("Failed to update payment status:", err);
      alert(err?.response?.data?.message || "Could not update payment status.");
      await fetchBoard();
    } finally {
      setSavingPayment(false);
    }
  };

  const handleToggleDependantPayment = async () => {
    if (!canManagePaymentStatus || savingDependantPayment) return;

    setSavingDependantPayment(true);
    const nextStatus = !dependantPaymentDone;
    try {
      await api.put(`/cards/${card.id}/dependant-payment`, {
        dependant_payment_done: nextStatus,
      });
      setDependantPaymentDone(nextStatus);
      setSelectedCard((prev) =>
        prev && prev.id === card.id ? { ...prev, dependant_payment_done: nextStatus } : prev
      );
      await fetchBoard();
      await fetchActivities();
    } catch (err: any) {
      console.error("Failed to update dependant payment status:", err);
      alert(err?.response?.data?.message || "Could not update dependant payment status.");
      await fetchBoard();
    } finally {
      setSavingDependantPayment(false);
    }
  };

  const handleToggleArchive = async () => {
    if (savingArchive) return;

    setSavingArchive(true);
    const nextStatus = !Boolean(card.is_archived);

    try {
      await api.put(`/cards/${card.id}/archive`, { is_archived: nextStatus });
      setSelectedCard((prev) =>
        prev && prev.id === card.id ? { ...prev, is_archived: nextStatus } : prev
      );
      await fetchBoard();

      if (nextStatus) {
        onClose();
        return;
      }

      await fetchActivities();
    } catch (err: any) {
      console.error("Failed to update archive status:", err);
      alert(err?.response?.data?.message || "Could not update archive status.");
    } finally {
      setSavingArchive(false);
    }
  };

  const getCountryName = () => {
    if (selectedCountryIds.length === 0) return "Country";
    const names = selectedCountryIds
      .map((id) => countries.find((country) => country.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    return names.length > 0 ? names.join(", ") : "Country";
  };
  const getIntakeName = () => intakes.find((i) => i.id === selectedIntakeId)?.name || "Intake";
  const getServiceAreaName = () => {
    if (selectedServiceAreaIds.length === 0) return "Extra Service";
    const names = selectedServiceAreaIds
      .map((id) => serviceAreas.find((serviceArea) => serviceArea.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    return names.length > 0 ? names.join(", ") : "Service";
  };
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/gi;
  const isUrlText = (value: string) => /^(?:https?:\/\/|www\.)[^\s]+$/i.test(value);
  const toHref = (value: string) =>
    /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const renderTextWithLinks = (value?: string) => {
    if (!value) return null;

    const lines = value.split(/\r?\n/);

    return lines.map((line, lineIndex) => (
      <React.Fragment key={`line-${lineIndex}`}>
        {line.split(urlRegex).map((part, partIndex) => {
          if (!part) return null;

          if (!isUrlText(part)) {
            return (
              <React.Fragment key={`text-${lineIndex}-${partIndex}`}>
                {part}
              </React.Fragment>
            );
          }

          const match = part.match(/^(.*?)([.,!?)]*)$/);
          const cleanUrl = match?.[1] || part;
          const trailing = match?.[2] || "";

          return (
            <React.Fragment key={`link-${lineIndex}-${partIndex}`}>
              <a
                href={toHref(cleanUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline break-all"
              >
                {cleanUrl}
              </a>
              {trailing}
            </React.Fragment>
          );
        })}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </React.Fragment>
    ));
  };

  const getLabelChangeLineTone = (line: string) => {
    const normalized = line.trim().toLowerCase();
    if (normalized.startsWith("country:")) {
      return {
        label: "Country",
        badgeClass:
          "inline-flex items-center rounded-full border border-[#8f53c6] bg-[#8f53c6] px-2 py-0.5 text-xs font-semibold text-white",
        valueClass: "text-[#5f3a8c]",
      };
    }
    if (normalized.startsWith("intake:")) {
      return {
        label: "Intake",
        badgeClass:
          "inline-flex items-center rounded-full border border-[#f2b205] bg-[#f2b205] px-2 py-0.5 text-xs font-semibold text-[#4a2b00]",
        valueClass: "text-[#7a4a00]",
      };
    }
    if (normalized.startsWith("service area:")) {
      return {
        label: "Service Area",
        badgeClass:
          "inline-flex items-center rounded-full border border-[#d63a3a] bg-[#d63a3a] px-2 py-0.5 text-xs font-semibold text-white",
        valueClass: "text-[#8f2a2a]",
      };
    }
    return null;
  };

  const isLabelChangeActivity = (action?: string, details?: string) => {
    if ((action || "").toLowerCase().includes("label")) return true;
    if (!details) return false;

    return details
      .split(/\r?\n/)
      .some((line) => !!getLabelChangeLineTone(line));
  };

  const renderLabelChangeDetails = (details?: string) => {
    if (!details) return null;

    const lines = details
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return null;

    return (
      <div className="space-y-1.5">
        {lines.map((line, lineIndex) => {
          const tone = getLabelChangeLineTone(line);
          if (!tone) {
            return (
              <div key={`label-change-plain-${lineIndex}`} className="text-sm text-gray-700">
                {renderTextWithLinks(line)}
              </div>
            );
          }

          const separatorIndex = line.indexOf(":");
          const value = separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : line;

          return (
            <div key={`label-change-row-${lineIndex}`} className="flex flex-wrap items-start gap-2">
              <span className={tone.badgeClass}>{tone.label}</span>
              <span className={`min-w-0 text-sm ${tone.valueClass}`}>
                {renderTextWithLinks(value || "None")}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const parseDescriptionChangeDetails = (
    details?: string
  ): { before: string; after: string } | null => {
    if (!details) return null;

    const lines = details.split(/\r?\n/);
    const descriptionLine = lines.find((line) => line.trim().toLowerCase().startsWith("description:"));
    if (!descriptionLine) return null;

    const payload = descriptionLine.trim().slice("Description:".length).trim();
    const separator = '" -> "';
    if (!payload.startsWith('"') || !payload.endsWith('"') || !payload.includes(separator)) {
      return null;
    }

    const separatorIndex = payload.indexOf(separator);
    if (separatorIndex <= 0) return null;

    const before = payload.slice(1, separatorIndex);
    const after = payload.slice(separatorIndex + separator.length, payload.length - 1);

    return {
      before: before.trim() || "[empty]",
      after: after.trim() || "[empty]",
    };
  };

  const computeInlineDiff = (before: string, after: string) => {
    let start = 0;
    const maxPrefix = Math.min(before.length, after.length);
    while (start < maxPrefix && before[start] === after[start]) {
      start += 1;
    }

    let beforeEnd = before.length - 1;
    let afterEnd = after.length - 1;
    while (beforeEnd >= start && afterEnd >= start && before[beforeEnd] === after[afterEnd]) {
      beforeEnd -= 1;
      afterEnd -= 1;
    }

    return {
      prefix: before.slice(0, start),
      beforeChanged: before.slice(start, beforeEnd + 1),
      afterChanged: after.slice(start, afterEnd + 1),
      suffix: before.slice(beforeEnd + 1),
    };
  };

  const renderDescriptionDiffText = (
    prefix: string,
    changed: string,
    suffix: string,
    highlightClass: string
  ) => (
    <>
      {prefix}
      {changed ? <mark className={`rounded px-0.5 ${highlightClass}`}>{changed}</mark> : null}
      {suffix}
    </>
  );

  const descriptionTextFromHtml = (value: string): string => {
    const html = descriptionToHtml(value).replace(/<br\s*\/?>/gi, "\n");

    if (typeof document === "undefined") {
      return getVisibleDescriptionText(html);
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return (wrapper.textContent || "").trim();
  };

  const collectFormattedDescriptionSegments = (value: string) => {
    if (typeof document === "undefined") return [];

    const wrapper = document.createElement("div");
    wrapper.innerHTML = descriptionToHtml(value);
    const segments: { text: string; bold: boolean; italic: boolean; underline: boolean }[] = [];

    const walk = (node: Node, format = { bold: false, italic: false, underline: false }) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.replace(/\s+/g, " ").trim();
        if (text) {
          segments.push({ text, ...format });
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      const style = element.getAttribute("style") || "";
      const nextFormat = {
        bold: format.bold || tagName === "b" || tagName === "strong" || /font-weight:\s*(bold|[6-9]00)/i.test(style),
        italic: format.italic || tagName === "i" || tagName === "em" || /font-style:\s*italic/i.test(style),
        underline: format.underline || tagName === "u" || /text-decoration[^;]*underline/i.test(style),
      };

      Array.from(element.childNodes).forEach((child) => walk(child, nextFormat));
    };

    Array.from(wrapper.childNodes).forEach((child) => walk(child));
    return segments;
  };

  const getFormattingChanges = (before: string, after: string) => {
    const beforeSegments = collectFormattedDescriptionSegments(before);
    const afterSegments = collectFormattedDescriptionSegments(after);

    return afterSegments
      .map((afterSegment) => {
        const beforeSegment = beforeSegments.find((segment) => segment.text === afterSegment.text);
        if (!beforeSegment) return null;

        const changes = [
          afterSegment.bold && !beforeSegment?.bold ? "Bold" : null,
          afterSegment.italic && !beforeSegment?.italic ? "Italic" : null,
          afterSegment.underline && !beforeSegment?.underline ? "Underline" : null,
        ].filter((change): change is string => Boolean(change));

        return changes.length > 0 ? { ...afterSegment, changes } : null;
      })
      .filter((change): change is { text: string; bold: boolean; italic: boolean; underline: boolean; changes: string[] } =>
        Boolean(change)
      );
  };

  const renderDescriptionChangeDetails = (details?: string) => {
    const parsed = parseDescriptionChangeDetails(details);
    if (!parsed) return null;

    const previousHtml = descriptionToHtml(parsed.before);
    const presentHtml = descriptionToHtml(parsed.after);

    return (
      <div className="space-y-2">
        <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Previous</p>
          {previousHtml ? (
            <div
              className="mt-1 break-words text-sm leading-relaxed text-rose-900 [&_p]:m-0 [&_div]:m-0 [&_br]:block [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: previousHtml }}
            />
          ) : (
            <p className="mt-1 text-sm text-rose-900">[empty]</p>
          )}
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Present</p>
          {presentHtml ? (
            <div
              className="mt-1 break-words text-sm leading-relaxed text-emerald-900 [&_p]:m-0 [&_div]:m-0 [&_br]:block [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: presentHtml }}
            />
          ) : (
            <p className="mt-1 text-sm text-emerald-900">[empty]</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-gray-200/50">
        {/* HEADER */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50/60 to-white flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100/80 text-indigo-800 rounded-lg text-sm font-bold border border-indigo-200 shadow-sm">
              {listTitle}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={cardActionsMenuRef}>
              <button
                type="button"
                onClick={() => setShowCardActionsMenu((prev) => !prev)}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
              >
                <MoreHorizontal size={17} className="text-gray-600" />
              </button>

              {showCardActionsMenu && (
                <div className="absolute right-0 mt-2 w-60 rounded-lg border border-gray-200 bg-white shadow-lg p-1.5 z-20">
                  {canManagePaymentStatus && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCardActionsMenu(false);
                          void handleTogglePayment();
                        }}
                        disabled={savingPayment}
                        className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition ${
                          savingPayment
                            ? "text-gray-400 cursor-not-allowed"
                            : paymentDone
                            ? "text-emerald-700 hover:bg-emerald-50"
                            : "text-rose-700 hover:bg-rose-50"
                        }`}
                      >
                        <CreditCard size={15} />
                        {savingPayment ? "Saving..." : paymentDone ? "Visa Payment Done" : "Mark Visa Payment Done"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowCardActionsMenu(false);
                          void handleToggleDependantPayment();
                        }}
                        disabled={savingDependantPayment}
                        className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition ${
                          savingDependantPayment
                            ? "text-gray-400 cursor-not-allowed"
                            : dependantPaymentDone
                            ? "text-emerald-700 hover:bg-emerald-50"
                            : "text-amber-700 hover:bg-amber-50"
                        }`}
                      >
                        <CreditCard size={15} />
                        {savingDependantPayment
                          ? "Saving..."
                          : dependantPaymentDone
                          ? "Dependant Payment Done"
                          : "Mark Dependant Payment Done"}
                      </button>

                      <div className="my-1 border-t border-gray-100" />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowCardActionsMenu(false);
                      void handleToggleArchive();
                    }}
                    disabled={savingArchive}
                    className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition ${
                      savingArchive
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-amber-700 hover:bg-amber-50"
                    }`}
                  >
                    <Archive size={15} />
                    {savingArchive ? "Saving..." : card.is_archived ? "Restore Card" : "Archive Card"}
                  </button>
                </div>
              )}
            </div>
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
            <div className="flex items-start gap-3.5 pb-1">
              {/* <div className="mt-1.5 h-5 w-5 rounded-full border-2 border-gray-500 shrink-0" /> */}
              {isEditingCardIdentity ? (
                <div className="w-full rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      value={editedInvoice}
                      onChange={(e) => setEditedInvoice(e.target.value)}
                      placeholder="Invoice"
                      className="h-10 rounded-md border border-indigo-200 bg-white px-3 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      value={editedFirstName}
                      onChange={(e) => setEditedFirstName(e.target.value)}
                      placeholder="First name"
                      className="h-10 rounded-md border border-indigo-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      value={editedLastName}
                      onChange={(e) => setEditedLastName(e.target.value)}
                      placeholder="Last name"
                      className="h-10 rounded-md border border-indigo-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <input
                    type="email"
                    value={editedContactEmail}
                    onChange={(e) => setEditedContactEmail(e.target.value)}
                    placeholder="Email (for Google Drive folder access)"
                    className="h-10 w-full rounded-md border border-indigo-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveCardIdentity()}
                      disabled={savingCardIdentity}
                      className="px-4 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingCardIdentity ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingCardIdentity(false);
                        setEditedInvoice(card.invoice || "");
                        setEditedFirstName(card.first_name || "");
                        setEditedLastName(card.last_name || "");
                        setEditedContactEmail(card.contact_email || "");
                      }}
                      disabled={savingCardIdentity}
                      className="px-4 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <span className="text-xs text-gray-500">
                      Created on {formatDateWithOrdinal(card.created_at)}
                    </span>
                  </div>
                </div>
              ) : (
                <h2
                  className={`text-2xl font-extrabold text-gray-900 truncate leading-tight ${
                    canEditCardIdentity ? "cursor-text hover:text-indigo-700" : ""
                  }`}
                  onClick={openCardIdentityEditor}
                  title={canEditCardIdentity ? "Click to edit invoice and name" : undefined}
                >
                  {card.invoice || `ID-${card.id}`} {card.first_name} {card.last_name} •{" "}
                  {formatDateWithOrdinal(card.created_at)}
                </h2>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
  {/* Country */}
  <button
    type="button"
    onClick={() => void handleOpenLabelModal("country")}
    className="h-10 min-w-[100px] px-3 rounded-md bg-[#8f53c6] text-white text-sm font-bold border border-[#8f53c6] hover:brightness-95 transition flex items-center justify-center gap-1.5"
  >
    <Globe size={15} strokeWidth={2.2} className="text-white/90" />
    {getCountryName()}
  </button>

  {/* Intake */}
  <button
    type="button"
    onClick={() => void handleOpenLabelModal("intake")}
    className="h-10 min-w-[100px] px-3 rounded-md bg-[#f2b205] text-[#4a2b00] text-sm font-bold border border-[#f2b205] hover:brightness-95 transition flex items-center justify-center gap-1.5"
  >
    <Tag size={15} strokeWidth={2.2} className="text-[#4a2b00]/90" />
    {getIntakeName()}
  </button>

  {/* Service Area */}
  <button
    type="button"
    onClick={() => void handleOpenLabelModal("serviceArea")}
    className="h-10 px-3 rounded-md bg-[#d63a3a] text-white text-sm font-bold border border-[#d63a3a] hover:brightness-95 transition flex items-center gap-1.5"
  >
    <Plus size={14} className="text-white/90" />
    {getServiceAreaName()}
  </button>

  {/* Due Date */}
  <button
    type="button"
    onClick={handleDatesButtonClick}
    className="h-10 px-3 rounded-md bg-[#4f46e5] text-white text-sm font-bold border border-[#4f46e5] hover:brightness-95 transition flex items-center gap-1.5"
  >
    <CalendarDays size={15} strokeWidth={2.2} className="text-white/90" />
    {card.due_date ? formatDateWithOrdinal(card.due_date) : "Due Dates"}
  </button>

  {/* Google Drive folder - disabled until every folder/file for this card
      has finished building and the contact has been shared on it
      (driveReady from /drive-info), so a link is never handed out before
      it's actually accessible. Only applies once we know Drive is enabled -
      otherwise leave the button clickable so it can surface the "not
      enabled" message instead of looking like it's forever "preparing". */}
  <button
    type="button"
    onClick={() => void handleOpenDrive()}
    disabled={driveOpening || drivePreparing}
    title={drivePreparing ? "Drive folder is still being prepared" : "Open the Google Drive folder for this card"}
    className="h-10 px-3 rounded-md bg-[#0f9d58] text-white text-sm font-bold border border-[#0f9d58] hover:brightness-95 transition flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
  >
    <FolderOpen size={15} strokeWidth={2.2} className="text-white/90" />
    {driveOpening ? "Opening..." : drivePreparing ? "Preparing..." : "Google Drive"}
  </button>

  <button
    type="button"
    onClick={() => void handleCopyDriveLink()}
    disabled={copyingDriveLink || drivePreparing}
    title={drivePreparing ? "Drive folder is still being prepared" : "Copy Google Drive folder link"}
    aria-label="Copy Google Drive folder link"
    className={`h-10 px-3 rounded-md text-sm font-bold border transition flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${
      driveLinkCopied
        ? "bg-[#0f9d58] border-[#0f9d58] text-white"
        : "bg-[#0e8a76] border-[#0e8a76] text-white hover:brightness-95"
    }`}
  >
    {driveLinkCopied ? <Check size={15} className="text-white/90" /> : <Copy size={15} className="text-white/90" />}
    {driveLinkCopied ? "Copied" : copyingDriveLink ? "Copying..." : drivePreparing ? "Preparing..." : "Drive link"}
  </button>
</div>

            {/* Members + Labels + Meta */}
            <div className="space-y-6">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2.5">Members</p>
                <div className="flex items-center gap-2">
                  {memberPreview.slice(0, 3).map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={handleOpenMembersModal}
                      title={getMemberDisplayName(member)}
                      className="h-10 w-10 rounded-full bg-sky-600 text-white text-sm font-bold flex items-center justify-center hover:brightness-110 transition"
                    >
                      {getMemberInitials(member)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleOpenMembersModal}
                    className="h-10 w-10 rounded-full bg-gray-200 text-gray-700 text-xl flex items-center justify-center hover:bg-gray-300 transition"
                    title="Manage members"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {driveEnabled && driveFolderLink && (
                  <p className="mt-2 text-xs text-gray-500">
                    {driveMembers.length > 0
                      ? `Shared on Google Drive with ${driveMembers.length} member${driveMembers.length === 1 ? "" : "s"}.`
                      : "Add members to share this card's Google Drive folder with them."}
                  </p>
                )}
                {driveEnabled && !driveFolderLink && driveError && (
                  <p className="mt-2 text-xs text-rose-600" title={driveError}>
                    Google Drive folder unavailable: {driveError}
                  </p>
                )}
              </div>

            </div>

            {/* Description */}
            <div className="bg-gray-50/70 border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b bg-white/60">
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={18} className="text-indigo-600" />
                  <h3 className="font-bold text-gray-800">Description</h3>
                </div>

                {isEditingDescription ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsEditingDescription(false);
                        setEditedDescription(
                          card.description?.trim() ? card.description : DESCRIPTION_TEMPLATE
                        );
                      }}
                      className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                      disabled={savingDescription}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleSaveDescription()}
                      className={`px-5 py-1.5 text-sm font-bold rounded text-white ${
                        savingDescription ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                      disabled={savingDescription}
                    >
                      {savingDescription ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={openDescriptionEditor}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-bold transition"
                  >
                    <SquarePen size={14} />
                    Edit
                  </button>
                )}
              </div>

              {isEditingDescription ? (
                <div className="p-5">
                  <Editor
                    disabled={savingDescription}
                    value={editedDescription}
                    onEditorChange={(content) => setEditedDescription(content)}
                    onBlur={(_event, editor) => void handleSaveDescription(editor.getContent())}
                    init={{
                      license_key: "gpl",
                      height: 300,
                      menubar: false,
                      branding: false,
                      promotion: false,
                      statusbar: false,
                      skin: false,
                      content_css: false,
                      plugins: ["autolink", "link", "lists"],
                      toolbar:
                        "undo redo | fontfamily fontsize | bold italic underline | forecolor backcolor | bullist numlist | link removeformat",
                      font_family_formats:
                        "Arial=arial,helvetica,sans-serif; Times New Roman=times new roman,times,serif; Georgia=georgia,palatino,serif; Verdana=verdana,geneva,sans-serif; Courier New=courier new,courier,monospace",
                      font_size_formats: "12px 14px 16px 18px 24px 36px",
                      content_style:
                        "body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6; } p { margin: 0 0 8px; }",
                    }}
                  />
                </div>
              ) : (
                <div
                  onClick={openDescriptionEditor}
                  className="px-5 py-5 text-sm text-gray-800 leading-relaxed cursor-pointer hover:bg-white/40 transition [&_p]:m-0 [&_div]:m-0 [&_br]:block [&_a]:text-indigo-600 [&_a]:underline"
                  title="Click to edit description"
                >
                  {card.description && card.description.trim() ? (
                    <div dangerouslySetInnerHTML={{ __html: descriptionToHtml(card.description) }} />
                  ) : (
                    DESCRIPTION_TEMPLATE.split("\n").map((line, i) => (
                      <p key={i} className="text-gray-500">
                        {line || "\u00A0"}
                      </p>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT – Comments & Activity */}
          <div className="w-full sm:w-[360px] bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b bg-white/80 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Comments & Activity</h3>
              <button
                type="button"
                onClick={() => setShowActivitySummary(true)}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <BarChart3 size={14} />
                 Summary
              </button>
            </div>

            <div className="flex-1 p-5 space-y-6 overflow-y-auto overflow-x-hidden">
              {/* Comment input */}
              <div className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                />

                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer">
                    <Paperclip size={14} className="text-gray-600" />
                    <span>Attach file</span>
                    <input
                      key={attachmentInputKey}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setCommentAttachment(file);
                      }}
                    />
                  </label>
                  {commentAttachment && (
                    <button
                      type="button"
                      onClick={() => {
                        setCommentAttachment(null);
                        setAttachmentInputKey((prev) => prev + 1);
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove file
                    </button>
                  )}
                </div>

                {commentAttachment && (
                  <div className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <span className="font-bold">{commentAttachment.name}</span>
                    <span className="ml-2 text-gray-500">{formatFileSize(commentAttachment.size)}</span>
                  </div>
                )}

                <button
                  onClick={handlePostComment}
                  disabled={postingComment || (!newComment.trim() && !commentAttachment)}
                  className={`w-full py-2 text-sm font-bold rounded-lg text-white ${
                    postingComment ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {postingComment ? "Posting..." : "Post Update"}
                </button>
              </div>

              {/* Activities list */}
              <div className="space-y-6">
                {activities.length === 0 ? (
                  <p className="text-center text-gray-500">No activities yet</p>
                ) : (
                  activities.map((activity) => {
                    const hasLabelChangeDetails = isLabelChangeActivity(activity.action, activity.details);
                    const hasDescriptionChangeDetails = !!parseDescriptionChangeDetails(activity.details);

                    return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="w-9 h-9 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {(activity.user_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-sm leading-relaxed">
                          <strong className="text-gray-900">{activity.user_name || "User"}</strong> {activity.action}
                        </p>
                        {activity.details && activity.action !== "commented" ? (
                          <div
                            className={`mt-1 text-sm leading-relaxed ${
                              hasLabelChangeDetails
                                ? "rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 text-gray-700"
                                : hasDescriptionChangeDetails
                                ? "rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 text-gray-700"
                                : "text-gray-700"
                            }`}
                          >
                            {hasLabelChangeDetails
                              ? renderLabelChangeDetails(activity.details)
                              : hasDescriptionChangeDetails
                              ? renderDescriptionChangeDetails(activity.details)
                              : renderTextWithLinks(activity.details)}
                          </div>
                        ) : null}
                        <p className="text-xs text-gray-500">{formatTimestamp(activity.created_at)}</p>
                        {activity.action === "commented" && activity.details && (
                          <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap break-words">
                            {renderTextWithLinks(activity.details)}
                          </div>
                        )}
                        {(activity.attachment_path || activity.attachment_url) && (
                          <button
                            type="button"
                            onClick={() => void handleOpenAttachment(activity)}
                            disabled={openingAttachmentId === activity.id}
                            className="mt-2 inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                          >
                            <Paperclip size={14} />
                            <span>
                              {openingAttachmentId === activity.id
                                ? "Opening..."
                                : (activity.attachment_name || "Attachment")}
                            </span>
                            {activity.attachment_size ? (
                              <span className="text-xs text-gray-500">({formatFileSize(activity.attachment_size)})</span>
                            ) : null}
                          </button>
                        )}
                        <button className="text-xs text-gray-500 hover:text-gray-700 underline mt-1 transition">
                          Reply
                        </button>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showActivitySummary && (
        <div className="fixed inset-0 bg-black/45 z-[65] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-900">Activity Summary</h4>
              <button
                type="button"
                onClick={() => setShowActivitySummary(false)}
                className="h-8 w-8 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-bold text-gray-900">Total activities:</span> {activitySummary.total}
              </p>
              <p>
                <span className="font-bold text-gray-900">Comments:</span> {activitySummary.comments}
              </p>
              <p>
                <span className="font-bold text-gray-900">Attachments:</span> {activitySummary.attachments}
              </p>
              <p>
                <span className="font-bold text-gray-900">Label updates:</span> {activitySummary.labelUpdates}
              </p>
              <p>
                <span className="font-bold text-gray-900">Payment updates:</span> {activitySummary.paymentUpdates}
              </p>
              <p>
                <span className="font-bold text-gray-900">Last activity:</span>{" "}
                {activitySummary.latestAt ? formatTimestamp(activitySummary.latestAt) : "No activity yet"}
              </p>
            </div>

            <div className="px-5 py-4 border-t bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowActivitySummary(false)}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATE PICKER POPUP */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Select Due Date</h3>
              <button
                onClick={() => setShowDatePicker(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <Suspense fallback={<div className="py-8 text-center text-gray-500">Loading calendar...</div>}>
              <div className="flex justify-center mb-4">
                <LazyDatePicker
                  inline
                  selected={editedDueDate ? new Date(editedDueDate) : null}
                  onChange={(date: Date | null) => {
                    setEditedDueDate(date ? date.toISOString().split("T")[0] : "");
                  }}
                  dateFormat="yyyy-MM-dd"
                />
              </div>
            </Suspense>

            {editedDueDate ? (
              <div className="mb-4 text-sm text-gray-600">
                {`Selected: ${formatDateWithOrdinal(editedDueDate)}`}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditedDueDate("")}
                className="px-5 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                disabled={savingDueDate}
              >
                Clear
              </button>
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
                className={`px-6 py-2 text-sm font-bold text-white rounded-lg ${
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

      {/* MEMBERS MODAL */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Card Members</h3>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-600">
                If no members are selected, everyone with board access can see this card.
              </p>

              {canManageMembers && (
                <input
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              )}

              {membersError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {membersError}
                </div>
              )}

              {membersLoading ? (
                <div className="text-center py-10 text-gray-500">Loading members...</div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {filteredMemberOptions.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                      No eligible users found.
                    </div>
                  ) : (
                    <div className="max-h-[330px] overflow-y-auto divide-y">
                      {filteredMemberOptions.map((member) => {
                        const checked = selectedMemberIds.includes(member.id);

                        return (
                          <label
                            key={member.id}
                            className={`flex items-center gap-3 px-4 py-3 ${
                              canManageMembers ? "cursor-pointer hover:bg-gray-50" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canManageMembers || membersSaving}
                              onChange={() => handleToggleMember(member.id)}
                              className="h-4 w-4 rounded text-indigo-600"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">
                                {getMemberDisplayName(member)}
                              </p>
                              {member.email ? (
                                <p className="text-xs text-gray-500 truncate">{member.email}</p>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowMembersModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              {canManageMembers && (
                <button
                  onClick={handleSaveMembers}
                  disabled={membersSaving || membersLoading}
                  className={`px-6 py-2.5 rounded-lg text-white font-bold ${
                    membersSaving || membersLoading
                      ? "bg-indigo-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {membersSaving ? "Saving..." : "Save Members"}
                </button>
              )}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleOpenLabelModal("country")}
                      className={`px-3 py-1.5 rounded-md text-sm font-bold border transition ${
                        activeLabelType === "country"
                          ? "bg-[#8f53c6] text-white border-[#8f53c6]"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Country
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleOpenLabelModal("intake")}
                      className={`px-3 py-1.5 rounded-md text-sm font-bold border transition ${
                        activeLabelType === "intake"
                          ? "bg-[#f2b205] text-[#4a2b00] border-[#f2b205]"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Intake
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleOpenLabelModal("serviceArea")}
                      className={`px-3 py-1.5 rounded-md text-sm font-bold border transition ${
                        activeLabelType === "serviceArea"
                          ? "bg-[#d63a3a] text-white border-[#d63a3a]"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Service Area
                    </button>
                  </div>

                  {activeLabelType === "country" ? (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Country (multi-select)
                      </label>
                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                        {countries.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-gray-500 text-center">No countries found</div>
                        ) : (
                          countries.map((country) => {
                            const checked = selectedCountryIds.includes(country.id);
                            return (
                              <label
                                key={country.id}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    toggleMultiSelection(country.id, setSelectedCountryIds)
                                  }
                                  className="h-4 w-4 rounded text-indigo-600"
                                />
                                <span className="text-sm text-gray-800">{country.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : activeLabelType === "intake" ? (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Intake / Semester</label>
                      <select
                        value={selectedIntakeId ?? ""}
                        onChange={(e) => setSelectedIntakeId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select an intake</option>
                        {intakes.map((intake) => (
                          <option key={intake.id} value={intake.id}>
                            {intake.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Service Area (multi-select)
                      </label>
                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                        {serviceAreas.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-gray-500 text-center">No service areas found</div>
                        ) : (
                          serviceAreas.map((serviceArea) => {
                            const checked = selectedServiceAreaIds.includes(serviceArea.id);
                            return (
                              <label
                                key={serviceArea.id}
                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    toggleMultiSelection(
                                      serviceArea.id,
                                      setSelectedServiceAreaIds
                                    )
                                  }
                                  className="h-4 w-4 rounded text-indigo-600"
                                />
                                <span className="text-sm text-gray-800">{serviceArea.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
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
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
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
