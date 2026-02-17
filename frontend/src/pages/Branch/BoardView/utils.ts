import type { CardMember } from "./types";

export const MEMBER_SHORTCUT_COLORS = [
  "bg-sky-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-rose-600",
  "bg-amber-600",
];

export function formatDateWithOrdinal(dateStr: string | null | undefined): string {
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

export function formatISODateForInput(value: any): string {
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

export function formatTimestamp(timestamp: string): string {
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

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;

  const normalized = value.trim().slice(0, 10);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day);
}

export function getMemberInitials(member: Pick<CardMember, "first_name" | "last_name" | "email">): string {
  const first = (member.first_name || "").trim().charAt(0);
  const last = (member.last_name || "").trim().charAt(0);
  const fallback = (member.email || "").trim().charAt(0);
  const initials = `${first}${last}`.trim() || fallback;
  return (initials || "U").toUpperCase();
}

export const DESCRIPTION_TEMPLATE = [
  "Student's Phone Number:",
  "Student's Email:",
  "Emergency Phone Number:",
  "Date of Birth:",
  "",
  "Education Background (Grades & Stream):",
  "Gap explanation if applicable:",
  "English Proficiency:",
  "",
  "Intended Level of Study:",
  "Interested Program Of Study:",
  "Institution/City Preference:",
  "Maximum Budget:",
  "",
  "Funding Details:",
  "Sponsor:",
  "Source of Income:",
  "Funds Breakdown:",
].join("\n");
