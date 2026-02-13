import {
  LayoutGrid,
  Users,
  Settings,
} from "lucide-react";

export default function BoardsPage() {
  return (
    <main className="flex-1 px-8 py-8 bg-white">

      {/* ================= RECENTLY VIEWED ================= */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4 text-[15px] font-semibold text-gray-800">
          ⏱ Recently viewed
        </div>

        <div className="flex gap-4">
          <BoardCard
            title="check"
            image="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"
          />
          <BoardCard
            title="My Trello board"
            gradient
          />
        </div>
      </section>

      {/* ================= WORKSPACES ================= */}
      <section>

        <h2 className="text-sm font-bold text-gray-500 mb-4 uppercase">
          Your Workspaces
        </h2>

        {/* Workspace Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 text-white rounded flex items-center justify-center font-bold">
              T
            </div>
            <div className="text-lg font-semibold">
              Trello Workspace
            </div>
          </div>

          <div className="flex gap-2">
            <WorkspaceButton icon={<LayoutGrid size={16} />} label="Boards" active />
            <WorkspaceButton icon={<Users size={16} />} label="Members" />
            <WorkspaceButton icon={<Settings size={16} />} label="Settings" />
          </div>
        </div>

        {/* Boards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl">

          <BoardCard
            title="check"
            image="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"
          />

          <BoardCard
            title="My Trello board"
            gradient
          />

          {/* Create Board */}
          <div className="h-32 rounded-lg border bg-gray-100 hover:bg-gray-200 cursor-pointer flex items-center justify-center text-[15px] font-medium text-gray-700">
            Create new board
          </div>
        </div>

        <button className="mt-6 px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm font-medium">
          View all closed boards
        </button>

      </section>
    </main>
  );
}

/* ================= COMPONENTS ================= */

function BoardCard({
  title,
  image,
  gradient,
}: {
  title: string;
  image?: string;
  gradient?: boolean;
}) {
  return (
    <div className="h-32 rounded-lg overflow-hidden shadow-sm border cursor-pointer group">
      <div
        className={`h-20 ${
          gradient
            ? "bg-gradient-to-r from-purple-500 to-pink-500"
            : "bg-cover bg-center"
        }`}
        style={image ? { backgroundImage: `url(${image})` } : {}}
      />
      <div className="p-2 text-[15px] font-medium group-hover:underline">
        {title}
      </div>
    </div>
  );
}

function WorkspaceButton({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
      ${
        active
          ? "bg-gray-200 text-gray-900"
          : "bg-gray-100 hover:bg-gray-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
