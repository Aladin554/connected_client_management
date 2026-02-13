import { Link } from "react-router-dom";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import PageMeta from "../../components/common/PageMeta";

export default function Home() {
  return (
    <>
      <PageMeta
        title="React.js Ecommerce Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Ecommerce Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />

      {/* ✅ Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 text-white rounded-2xl p-6 shadow-lg">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            👋 Welcome to your Dashboard!
          </h1>
          {/* <p className="text-white/90 text-sm md:text-base">
            Monitor your users, departments, industry and reports insights all in one place.
          </p> */}
        </div>

        {/* ✅ View Reports Button with Link */}
        {/* <div className="mt-4 md:mt-0">
          <Link
            to="/dashboard/users-report"
            className="bg-white text-blue-600 px-[1.75rem] py-2 rounded-lg font-medium hover:bg-blue-50 hover:shadow-md transition-all duration-200"
          >
            View Reports
          </Link>
        </div> */}
      </div>

      {/* ✅ Dashboard Content */}
      <div className="grid grid-cols-12 gap-3 md:gap-6">
        <div className="col-span-12 space-y-10 xl:col-span-9">
          <EcommerceMetrics />
          {/* <MonthlySalesChart /> */}
        </div>

        {/* <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        <div className="col-span-12">
          <StatisticsChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <DemographicCard />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentOrders />
        </div> */}
      </div>
    </>
  );
}
