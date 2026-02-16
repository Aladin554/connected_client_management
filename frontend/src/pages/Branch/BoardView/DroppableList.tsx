import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type { List } from "./types";

interface DroppableListProps {
  list: List;
  children: ReactNode;
}

export default function DroppableList({ list, children }: DroppableListProps) {
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
