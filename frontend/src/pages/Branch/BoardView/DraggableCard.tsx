import type { MouseEvent as ReactMouseEvent } from "react";
import { CheckCircle2, Loader2, Mail, SquarePen, Tag } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card, CardLabelBadge } from "./types";
import { formatDateWithOrdinal, getMemberInitials, MEMBER_SHORTCUT_COLORS } from "./utils";

interface DraggableCardProps {
  card: Card;
  onClick: (card: Card) => void;
  labelBadges?: CardLabelBadge[];
  dragDisabled?: boolean;
  showActions?: boolean;
  disableActions?: boolean;
  onOpenActions?: (card: Card, position: { x: number; y: number }) => void;
}

export default function DraggableCard({
  card,
  onClick,
  labelBadges = [],
  dragDisabled = false,
  showActions = false,
  disableActions = false,
  onOpenActions,
}: DraggableCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({
    id: card.id,
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const invoiceDisplay = card.invoice || `ID-${card.id}`;
  const displayText = `${invoiceDisplay} ${card.first_name || ""} ${card.last_name || ""}`.trim();
  const previewLabelBadges = labelBadges.filter(
    (label) => label.kind === "country" || label.kind === "intake"
  );
  // Drive folder build runs in the background after card creation - surface
  // its progress right on the tile instead of leaving it silent until
  // someone opens the card.
  const driveCreating = Boolean(card.google_drive_folder_id) && !card.google_drive_ready_at;
  const driveReady = Boolean(card.google_drive_ready_at);

  const stopEventPropagation = (event: ReactMouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!showActions || disableActions || !onOpenActions) return;
    event.preventDefault();
    event.stopPropagation();
    onOpenActions(card, { x: event.clientX, y: event.clientY });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
      onContextMenu={handleContextMenu}
      className={`relative bg-white rounded-xl border border-gray-200 px-4 py-4 shadow-sm transition-shadow select-none ${
        dragDisabled ? "cursor-default" : "cursor-pointer hover:shadow-md"
      }`}
    >
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        <button
          type="button"
          onMouseDown={stopEventPropagation}
          onPointerDown={stopEventPropagation}
          onClick={(event) => {
            event.stopPropagation();
            onClick(card);
          }}
          className="p-1.5 rounded-md shrink-0 text-gray-600 hover:bg-gray-100"
          title="Edit card"
          aria-label="Edit card"
        >
          <SquarePen size={16} />
        </button>
      </div>

      <div className="min-w-0">
        <div className="pr-10">
          <p className="text-sm font-bold text-indigo-700">{displayText}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatDateWithOrdinal(card.created_at)}
          </p>
          {card.contact_email && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 truncate">
              <Mail size={11} className="shrink-0" />
              <span className="truncate">{card.contact_email}</span>
            </p>
          )}
        </div>

        {(previewLabelBadges.length > 0 ||
          (card.members && card.members.length > 0) ||
          driveCreating ||
          driveReady) && (
          <div className="mt-4 flex w-full items-start gap-2">
            {previewLabelBadges.length > 0 ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar pr-1">
                <Tag size={12} className="shrink-0 text-gray-500" />
                {previewLabelBadges.map((label, index) => (
                  <span
                    key={`${label.kind}-${label.name}-${index}`}
                    className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      label.kind === "country"
                        ? "bg-[#8f53c6] text-white"
                        : "bg-[#f2b205] text-[#4a2b00]"
                    }`}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            <div className="ml-auto -mr-1 flex shrink-0 items-center gap-2">
              {driveCreating && (
                <span
                  className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-amber-600"
                  title="Google Drive folders are being created"
                >
                  <Loader2 size={11} className="animate-spin" />
                  Creating...
                </span>
              )}
              {driveReady && (
                <span
                  className="flex shrink-0 items-center"
                  title="Google Drive folder ready"
                  aria-label="Google Drive folder ready"
                >
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </span>
              )}

              {card.members && card.members.length > 0 ? (
                <div className="flex shrink-0 flex-row-reverse items-center justify-end -space-x-1 space-x-reverse">
                  {card.members.slice(0, 3).map((member, index) => (
                    <div
                      key={`card-${card.id}-member-${member.id}`}
                      className={`h-5 w-5 rounded-full border border-white text-white text-[9px] font-semibold flex items-center justify-center ${
                        MEMBER_SHORTCUT_COLORS[(member.id + index) % MEMBER_SHORTCUT_COLORS.length]
                      }`}
                      title={`${member.first_name || ""} ${member.last_name || ""}`.trim() || "Member"}
                    >
                      {getMemberInitials(member)}
                    </div>
                  ))}
                  {card.members.length > 3 && (
                    <div className="mr-1 text-[10px] font-semibold text-gray-500">
                      +{card.members.length - 3}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
