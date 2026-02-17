import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import type { List } from "./types";

interface DroppableListRenderProps {
  dragHandleProps: Partial<DraggableAttributes & DraggableSyntheticListeners>;
  isDragging: boolean;
}

interface DroppableListProps {
  list: List;
  children: ReactNode | ((props: DroppableListRenderProps) => ReactNode);
  dragDisabled?: boolean;
}

export default function DroppableList({
  list,
  children,
  dragDisabled = false,
}: DroppableListProps) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id: `list-${list.id}`,
    disabled: {
      draggable: dragDisabled,
      droppable: false,
    },
    transition: {
      duration: 180,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps: Partial<DraggableAttributes & DraggableSyntheticListeners> = dragDisabled
    ? {}
    : { ...attributes, ...listeners };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-80 bg-white rounded-xl border border-gray-200 shadow-md flex flex-col min-h-[120px] will-change-transform ${
        isDragging ? "opacity-35" : ""
      }`}
    >
      {typeof children === "function" ? children({ dragHandleProps, isDragging }) : children}
    </div>
  );
}
