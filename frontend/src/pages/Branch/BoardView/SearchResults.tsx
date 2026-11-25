import { useEffect, useRef } from "react";
import { Mail } from "lucide-react";
import type { Card } from "./types";

export interface SearchResult {
  card: Card;
  listTitle: string;
  sectionTitle: string;
}

interface SearchResultsProps {
  id: string;
  results: SearchResult[];
  totalCount: number;
  activeIndex: number;
  filtersApplied: boolean;
  onHover: (index: number) => void;
  onSelect: (card: Card) => void;
}

export default function SearchResults({
  id,
  results,
  totalCount,
  activeIndex,
  filtersApplied,
  onHover,
  onSelect,
}: SearchResultsProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[24rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
        <span className="font-semibold text-gray-700">
          {totalCount} {totalCount === 1 ? "card" : "cards"} found
        </span>
        <span className="flex items-center gap-3">
          {filtersApplied && <span className="text-amber-700">Filters are also applied</span>}
          {totalCount > results.length && <span>Showing first {results.length}</span>}
        </span>
      </div>

      {results.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-gray-500">No matching cards</p>
      ) : (
        <div id={id} role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
          {results.map(({ card, listTitle, sectionTitle }, index) => {
            const isActive = index === activeIndex;
            const name = `${card.first_name || ""} ${card.last_name || ""}`.trim();

            return (
              <button
                key={card.id}
                ref={isActive ? activeRef : null}
                id={`${id}-${index}`}
                type="button"
                role="option"
                aria-selected={isActive}
                tabIndex={-1}
                // Keep the search box focused so the click is not lost to a blur.
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => {
                  if (!isActive) onHover(index);
                }}
                onClick={() => onSelect(card)}
                className={`block w-full px-4 py-2.5 text-left ${isActive ? "bg-indigo-50" : ""}`}
              >
                <p className="text-sm font-bold text-indigo-700 break-words">
                  {`${card.invoice || `ID-${card.id}`} ${name}`.trim()}
                </p>
                <p className="mt-0.5 text-xs text-gray-600 break-words">
                  {sectionTitle} › {listTitle}
                </p>
                {card.contact_email && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <Mail size={11} className="shrink-0" />
                    <span className="truncate">{card.contact_email}</span>
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
