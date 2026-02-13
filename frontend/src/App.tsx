import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import RootRedirect from "./components/RootRedirect";

// Route-level code splitting for faster initial load.
const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/AuthPages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/AuthPages/ResetPassword"));
const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));

const UserProfiles = lazy(() => import("./pages/UserProfiles"));
const Videos = lazy(() => import("./pages/UiElements/Videos"));
const Images = lazy(() => import("./pages/UiElements/Images"));
const Alerts = lazy(() => import("./pages/UiElements/Alerts"));
const Badges = lazy(() => import("./pages/UiElements/Badges"));
const Avatars = lazy(() => import("./pages/UiElements/Avatars"));
const Buttons = lazy(() => import("./pages/UiElements/Buttons"));

const LineChart = lazy(() => import("./pages/Charts/LineChart"));
const BarChart = lazy(() => import("./pages/Charts/BarChart"));
const Calendar = lazy(() => import("./pages/Calendar"));
const BasicTables = lazy(() => import("./pages/Tables/BasicTables"));
const FormElements = lazy(() => import("./pages/Forms/FormElements"));
const Blank = lazy(() => import("./pages/Blank"));

const AppLayout = lazy(() => import("./layout/AppLayout"));
const Home = lazy(() => import("./pages/Dashboard/Home"));

const AdminUsers = lazy(() => import("./pages/Admin/AdminUsers"));
const AdminUserForm = lazy(() => import("./pages/Admin/AdminUserForm"));

const AdminBoards = lazy(() => import("./pages/Admin/Board/AdminCities.tsx"));
const AdminBoardForm = lazy(() => import("./pages/Admin/Board/AdminBoardForm"));

const UserDashboard = lazy(() => import("./pages/Dashboard/UserDashboard"));
const Profile = lazy(() => import("./pages/Profile/EditProfile"));

const Introduction = lazy(() => import("./pages/User/pages/Introduction"));
const MyReport = lazy(() => import("./pages/User/pages/MyReport.tsx"));
const IndustryData = lazy(() => import("./pages/User/pages/IndustryData.tsx"));

const Report = lazy(() => import("./pages/Admin/Report/Report.tsx"));
const ReportDetails = lazy(() => import("./pages/Admin/Report/ReportDetails.tsx"));

const ChooseDashboard = lazy(() => import("./components/auth/ChooseDashboard.tsx"));

const BranchBoards = lazy(() => import("./pages/Branch/BranchBoards.tsx"));
const BoardsPage = lazy(() => import("./pages/Branch/BoardsPage.tsx"));
const BoardView = lazy(() => import("./pages/Branch/BoardView.tsx"));

const CountryLabels = lazy(() => import("./pages/Admin/Label/CountryLabels.tsx"));
const IntakeLabels = lazy(() => import("./pages/Admin/Label/IntakeLabels.tsx"));

export default function App() {
  return (
    <Router>
      <ScrollToTop />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        toastStyle={{ zIndex: 100000 }}
      />

      <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <Routes>

        {/* ================= PUBLIC ROUTES ================= */}

        <Route path="/" element={<RootRedirect />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ================= DASHBOARD CHOOSER ================= */}

        <Route
          path="/choose-dashboard"
          element={
            <ProtectedRoute>
              <ChooseDashboard />
            </ProtectedRoute>
          }
        />

        {/* ================= USER ROUTES ================= */}

        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/industry-data"
          element={
            <ProtectedRoute>
              <IndustryData />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-report"
          element={
            <ProtectedRoute>
              <MyReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/introduction"
          element={
            <ProtectedRoute>
              <Introduction />
            </ProtectedRoute>
          }
        />

        {/* ================= PUBLIC / SEMI PUBLIC ================= */}

        <Route path="/branch/:branchId" element={<BranchBoards />} />
        <Route path="/boards" element={<BoardsPage />} />
        <Route path="/boards/:boardId" element={<BoardView />} />

        {/* ================= ADMIN DASHBOARD (LAYOUT) ================= */}

        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >

          <Route index element={<Home />} />

          <Route path="profile" element={<UserProfiles />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="blank" element={<Blank />} />

          <Route path="form-elements" element={<FormElements />} />
          <Route path="basic-tables" element={<BasicTables />} />

          <Route path="alerts" element={<Alerts />} />
          <Route path="avatars" element={<Avatars />} />
          <Route path="badges" element={<Badges />} />
          <Route path="buttons" element={<Buttons />} />
          <Route path="images" element={<Images />} />
          <Route path="videos" element={<Videos />} />

          <Route path="line-chart" element={<LineChart />} />
          <Route path="bar-chart" element={<BarChart />} />

          {/* ===== USERS ===== */}

          <Route path="admin-users" element={<AdminUsers />} />
          <Route path="admin-users/add" element={<AdminUserForm />} />
          <Route path="admin-users/:id/edit" element={<AdminUserForm />} />

          {/* ===== REPORTS ===== */}

          <Route path="users-report" element={<Report />} />
          <Route path="reports/:id" element={<ReportDetails />} />

          {/* ===== BOARDS ===== */}

          <Route path="admin-boards" element={<AdminBoards />} />
          <Route path="admin-boards/add" element={<AdminBoardForm />} />
          <Route path="admin-boards/:id/edit" element={<AdminBoardForm />} />

          {/* ===== LABELS ===== */}

          <Route path="country-labels" element={<CountryLabels />} />
          <Route path="intake-labels" element={<IntakeLabels />} />

        </Route>

        {/* ================= NOT FOUND ================= */}

        <Route path="*" element={<NotFound />} />

      </Routes>
      </Suspense>
    </Router>
  );
}
