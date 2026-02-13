// src/pages/Branch/BranchLayout.tsx
import { Outlet } from "react-router-dom";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";
import RightPanel from "./components/RightPanel";

export default function BranchLayout() {
  return (
    <div className="h-screen bg-gray-50/70 flex flex-col text-gray-800 selection:bg-blue-100">
      <Topbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* CENTER (ONLY THIS CHANGES) */}
        <main className="flex-1 px-6 md:px-12 py-10 overflow-y-auto bg-gradient-to-b from-gray-50/40 to-transparent">
          <Outlet />
        </main>

        <RightPanel />
      </div>
    </div>
  );
}
