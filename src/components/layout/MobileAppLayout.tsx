import React, { useState, useEffect } from "react";
import {
  Home,
  BarChart2,
  Calendar,
  Wrench,
  ChevronRight,
  Package,
  Users,
  LogOut,
  MapPin,
  ArrowLeft,
  FileSpreadsheet,
  Search,
  Presentation
} from "lucide-react";
import { RevenueAnalysis } from "../features/RevenueAnalysis";
import { SalesmanKpiReport } from "../features/SalesmanKpiReport";
import { VisitPlanning } from "../features/VisitPlan";
import { CustomerTargetReport } from "../features/CustomerTargetReport";
import { ReturBarang } from "../features/ReturBarang";
import { BudgetDinas } from "../features/BudgetDinas";
import MapsAnalyzer from "../features/MapsAnalyzer";
import { LiveExcel } from "../features/LiveExcel";
import { CustomerAnalysis } from "../features/CustomerAnalysis";
import { MeetingReportExporter } from "../features/MeetingReportExporter";

interface MobileAppLayoutProps {
  onLogout: () => void;
}

export function MobileAppLayout({ onLogout }: MobileAppLayoutProps) {
  const [activeTab, setActiveTab] = useState("omset");
  const [activeTool, setActiveTool] = useState<"menu" | "customer" | "retur" | "budget" | "maps-preview" | "live-excel" | "ppt-export">("menu");

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tool) {
        setActiveTool(e.state.tool);
      } else {
        setActiveTool("menu");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleOpenTool = (tool: "customer" | "retur" | "budget" | "maps-preview" | "live-excel" | "ppt-export") => {
    window.history.pushState({ tool }, "");
    setActiveTool(tool);
  };

  const handleCloseTool = () => {
    if (activeTool !== "menu") {
      window.history.back();
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (activeTool !== "menu") {
      window.history.back();
    }
  };

  const salesmanCode = localStorage.getItem("salesman_code") || "Salesman";
  const salesmanName = localStorage.getItem("salesman_name") || salesmanCode;

  const getDisplayStyle = (isActive: boolean) => ({
    display: isActive ? undefined : 'none'
  });

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans flex flex-col relative">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-14 pt-4 px-2 safe-top">
        <div style={getDisplayStyle(activeTab === "omset")}>
          <RevenueAnalysis />
        </div>
        <div style={getDisplayStyle(activeTab === "kpi")}>
          <SalesmanKpiReport isMobile={true} />
        </div>
        <div style={getDisplayStyle(activeTab === "plan")}>
          <VisitPlanning />
        </div>
        <div style={getDisplayStyle(activeTab === "search")}>
          <div className="pb-24">
            <CustomerAnalysis isMobile={true} />
          </div>
        </div>
        <div style={getDisplayStyle(activeTab === "tools")}>
          <div style={getDisplayStyle(activeTool === "menu")} className="p-4 space-y-3 pb-20">
            <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase mb-4 px-1">Menu Lainnya</h2>
            <div
              onClick={() => handleOpenTool("customer")}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Laporan Customer</h3>
                  <p className="text-[10px] text-slate-500">Target customer bulan ini</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => handleOpenTool("live-excel")}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Live Excel</h3>
                  <p className="text-[10px] text-slate-500">Lihat data yang diupload</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => handleOpenTool("retur")}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Retur Barang</h3>
                  <p className="text-[10px] text-slate-500">Form pengajuan retur</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => handleOpenTool("budget")}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Budget Dinas</h3>
                  <p className="text-[10px] text-slate-500">Form pengajuan budget dinas</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => handleOpenTool("maps-preview")}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Database Customer LCD</h3>
                  <p className="text-[10px] text-slate-500">Preview & Download Aplikasi Kunjungan Offline</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={() => handleOpenTool("ppt-export")}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
                  <Presentation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Wook PPT Exporter</h3>
                  <p className="text-[10px] text-slate-500">Ekspor Laporan Kerja &amp; Plan Bulanan (PDF)</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div
              onClick={onLogout}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer active:scale-95 transition-all mt-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Keluar Akun</h3>
                  <p className="text-[10px] text-slate-500">Log out dari aplikasi</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div style={getDisplayStyle(activeTool === "customer")} className="pb-24">
            <CustomerTargetReport />
          </div>

          <div style={getDisplayStyle(activeTool === "retur")} className="pb-24">
            <ReturBarang />
          </div>

          <div style={getDisplayStyle(activeTool === "budget")} className="pb-24 print:pb-0">
            <BudgetDinas />
          </div>

          <div style={getDisplayStyle(activeTool === "live-excel")} className={`print:pb-0 ${activeTool === "live-excel" ? 'h-[100dvh] pb-0 flex flex-col overflow-hidden bg-slate-50' : 'pb-24'}`}>
            <div className="flex-1 overflow-hidden relative">
              <LiveExcel isMobile={true} />
            </div>
          </div>

          <div style={getDisplayStyle(activeTool === "maps-preview")} className="pb-24">
            <MapsAnalyzer isMobilePreviewOnly={true} />
          </div>

          <div style={getDisplayStyle(activeTool === "ppt-export")} className="pb-24">
            <MeetingReportExporter onBack={handleCloseTool} />
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className={`fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-200 px-4 py-1.5 items-center justify-between z-50 pb-safe print:hidden ${activeTool === 'live-excel' ? 'hidden' : 'flex'}`}>
        <button
          onClick={() => handleTabChange("omset")}
          className={`flex flex-1 flex-col items-center gap-0.5 transition-colors pt-1 ${activeTab === "omset" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1 rounded-md transition-all ${activeTab === "omset" ? "bg-indigo-50" : ""}`}>
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold">Omset</span>
        </button>

        <button
          onClick={() => handleTabChange("kpi")}
          className={`flex flex-1 flex-col items-center gap-0.5 transition-colors pt-1 ${activeTab === "kpi" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1 rounded-md transition-all ${activeTab === "kpi" ? "bg-indigo-50" : ""}`}>
            <BarChart2 className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold">KPI</span>
        </button>

        <button
          onClick={() => handleTabChange("search")}
          className={`flex flex-1 flex-col items-center gap-0.5 transition-colors pt-1 ${activeTab === "search" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1 rounded-md transition-all ${activeTab === "search" ? "bg-indigo-50" : ""}`}>
            <Search className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold">Cari</span>
        </button>

        <button
          onClick={() => handleTabChange("plan")}
          className={`flex flex-1 flex-col items-center gap-0.5 transition-colors pt-1 ${activeTab === "plan" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1 rounded-md transition-all ${activeTab === "plan" ? "bg-indigo-50" : ""}`}>
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold">Plan</span>
        </button>

        <button
          onClick={() => handleTabChange("tools")}
          className={`flex flex-1 flex-col items-center gap-0.5 transition-colors pt-1 ${activeTab === "tools" ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
        >
          <div className={`p-1 rounded-md transition-all ${activeTab === "tools" ? "bg-indigo-50" : ""}`}>
            <Wrench className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold">Tools</span>
        </button>
      </div>
    </div>
  );
}
