import React, { useState, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { supabase } from "./services/supabase";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./components/features/Dashboard";
import { ExcelUploader } from "./components/features/ExcelUploader";
import { AIQueryInput } from "./components/features/AIQueryInput";
import { SetupDatabase } from "./components/features/SetupDatabase";
import SurveyChannel from "./components/features/SurveyChannel/index";
import SurveyLcd from "./components/features/SurveyLcd";
import MapsAnalyzer from "./components/features/MapsAnalyzer";
import FormCodTempo from "./components/features/FormCodTempo";
import { SalesmanCustomerDB } from "./components/features/SalesmanCustomerDB";
import { DatabaseBarangDB } from "./components/features/DatabaseBarangDB";
import { IdleCustomerDB } from "./components/features/IdleCustomerDB";
import { SalesmanKpiReport } from "./components/features/SalesmanKpiReport";
import { KpiTargetSetup } from "./components/features/KpiTargetSetup";
import { Documentation } from "./components/features/Documentation";
import { ReportLCD } from "./components/features/ReportLCD";
import { CustomerTargetReport } from "./components/features/CustomerTargetReport";
import { ReturBarang } from "./components/features/ReturBarang/index";
import { SalesmanAnalysis } from "./components/features/SalesmanAnalysis";
import { CustomerAnalysis } from "./components/features/CustomerAnalysis";
import { RevenueAnalysis } from "./components/features/RevenueAnalysis";
import { SupabaseViewer } from "./components/features/SupabaseViewer";
import { VisitPlanning } from "./components/features/VisitPlan";
import { TeamPointConfig } from "./components/features/TeamPointConfig";
import { FormBuilder } from "./components/features/FormBuilder";
import DynamicExcelManager from "./components/features/DynamicExcelManager";
import { LcdCatalogViewer } from "./components/features/LcdCatalog/CustomerView";
import { AdminLcdCatalog } from "./components/features/LcdCatalog/AdminView";
import { LcdCompare } from "./components/features/LcdCompare";
import { DataValidation } from "./components/features/DataValidation";
import { SalesmanDashboard } from "./components/features/SalesmanDashboard";
import { MobileAppLayout } from "./components/layout/MobileAppLayout";
import { LiveExcel } from "./components/features/LiveExcel";
import { AlertCircle, Lock } from "lucide-react";
import { AlertProvider } from "./components/ui/AlertModal";

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-xl m-4 border border-red-200">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-lg font-semibold text-red-700 mb-2">
        Terjadi Kesalahan Component
      </h2>
      <p className="text-sm text-red-600 mb-4 max-w-md">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
      >
        Coba Lagi
      </button>
    </div>
  );
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialView =
    urlParams.get("view") || localStorage.getItem("app_last_view") || "setup";
  const isShared = urlParams.get("shared") === "true";

  const [currentView, setCurrentView] = useState(initialView);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setCurrentView(e.state.view);
      } else {
        const params = new URLSearchParams(window.location.search);
        const view = params.get("view");
        if (view) {
          setCurrentView(view);
        } else {
          setCurrentView(localStorage.getItem("app_last_view") || "setup");
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSetCurrentView = (view: string) => {
    if (view !== currentView) {
      window.history.pushState({ view }, "", "");
      setCurrentView(view);
    }
  };

  useEffect(() => {
    if (currentView === "catalog-lcd") {
      document.title = "Pricelist LCD Vivan dan Xpas";
      const link = document.querySelector(
        "link[rel~='icon']",
      ) as HTMLLinkElement;
      if (link) {
        link.href =
          "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📱</text></svg>";
      }
    } else if (currentView === "retur-barang") {
      document.title = "Retur Barang";
      const link = document.querySelector(
        "link[rel~='icon']",
      ) as HTMLLinkElement;
      if (link) {
        link.href =
          "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📦</text></svg>";
      }
    } else {
      document.title = "Survey Data Channel & Target";
      const link = document.querySelector(
        "link[rel~='icon']",
      ) as HTMLLinkElement;
      if (link) {
        link.href =
          "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📋</text></svg>";
      }
    }

    if (currentView) {
      localStorage.setItem("app_last_view", currentView);
    }
  }, [currentView]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changeUser, setChangeUser] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeError, setChangeError] = useState("");
  const [changeSuccess, setChangeSuccess] = useState("");
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);

  const [userRole, setUserRole] = useState(
    localStorage.getItem("user_role") || "admin",
  );

  useEffect(() => {
    const authStatus = localStorage.getItem("app_authenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }

    // Lazy check and create salesman_passwords table
    const ensureSalesmanPasswordsTable = async () => {
      try {
        await supabase.rpc('exec_sql', {
          query_text: `
            CREATE TABLE IF NOT EXISTS salesman_passwords (
              salesman_code TEXT PRIMARY KEY,
              password TEXT NOT NULL DEFAULT 'Wook123',
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'salesman_passwords' AND policyname = 'Allow all operations for salesman_passwords'
              ) THEN
                CREATE POLICY "Allow all operations for salesman_passwords" ON salesman_passwords FOR ALL USING (true) WITH CHECK (true);
              END IF;
            END $$;
            ALTER TABLE salesman_passwords ENABLE ROW LEVEL SECURITY;
          `
        });
      } catch (err) {
        console.warn("Lazy setup of salesman_passwords table failed/skipped:", err);
      }
    };
    ensureSalesmanPasswordsTable();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmittingLogin(true);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    try {
      // 1. Admin Login
      if (trimmedUser === "sendi81457" && trimmedPass === "sendi123") {
        setIsAuthenticated(true);
        localStorage.setItem("app_authenticated", "true");
        localStorage.setItem("user_role", "admin");
        localStorage.setItem("salesman_code", trimmedUser);
        localStorage.setItem("salesman_name", "Admin Sendi");
        setUserRole("admin");
        setLoginError("");
        setIsSubmittingLogin(false);
        return;
      }

      // 2. Salesman Login (Lookup in salesman_customer table)
      const { data: salesmanData, error: salesmanError } = await supabase
        .from("salesman_customer")
        .select("salesman_code, salesman_name")
        .ilike("salesman_code", trimmedUser)
        .limit(1);

      if (salesmanError) {
        throw new Error("Gagal memeriksa database salesman: " + salesmanError.message);
      }

      if (!salesmanData || salesmanData.length === 0) {
        setLoginError("Username (Salesman Code) tidak terdaftar di database.");
        setIsSubmittingLogin(false);
        return;
      }

      const matchedSalesman = salesmanData[0];

      // 3. Password Check (Check if modified, otherwise default is 'Wook123')
      const { data: passwordData, error: passwordError } = await supabase
        .from("salesman_passwords")
        .select("password")
        .ilike("salesman_code", trimmedUser)
        .limit(1);

      if (passwordError) {
        throw new Error("Gagal mengambil data password: " + passwordError.message);
      }

      let correctPassword = "Wook123";
      if (passwordData && passwordData.length > 0) {
        correctPassword = passwordData[0].password;
      }

      if (trimmedPass === correctPassword) {
        setIsAuthenticated(true);
        localStorage.setItem("app_authenticated", "true");
        localStorage.setItem("user_role", "salesman");
        localStorage.setItem("salesman_code", matchedSalesman.salesman_code);
        localStorage.setItem("salesman_name", matchedSalesman.salesman_name);
        setUserRole("salesman");
        setLoginError("");
      } else {
        setLoginError("Password salah.");
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || "Gagal melakukan proses login.");
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError("");
    setChangeSuccess("");
    setIsSubmittingChange(true);

    const trimmedUser = changeUser.trim();
    const trimmedOld = oldPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (trimmedUser.toLowerCase() === "sendi81457") {
      setChangeError("Password admin tidak dapat diubah dari form ini.");
      setIsSubmittingChange(false);
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setChangeError("Konfirmasi password baru tidak cocok.");
      setIsSubmittingChange(false);
      return;
    }

    if (!trimmedNew) {
      setChangeError("Password baru tidak boleh kosong.");
      setIsSubmittingChange(false);
      return;
    }

    try {
      // 1. Verify user exists in salesman_customer
      const { data: salesmanData, error: salesmanError } = await supabase
        .from("salesman_customer")
        .select("salesman_code, salesman_name")
        .ilike("salesman_code", trimmedUser)
        .limit(1);

      if (salesmanError) {
        throw new Error("Gagal verifikasi user: " + salesmanError.message);
      }

      if (!salesmanData || salesmanData.length === 0) {
        setChangeError("Username (Salesman Code) tidak ditemukan di database.");
        setIsSubmittingChange(false);
        return;
      }

      const matchedSalesman = salesmanData[0];

      // 2. Verify current password (either from database or default Wook123)
      const { data: passwordData } = await supabase
        .from("salesman_passwords")
        .select("password")
        .ilike("salesman_code", trimmedUser)
        .limit(1);

      let correctPassword = "Wook123";
      if (passwordData && passwordData.length > 0) {
        correctPassword = passwordData[0].password;
      }

      if (trimmedOld !== correctPassword) {
        setChangeError("Password lama salah.");
        setIsSubmittingChange(false);
        return;
      }

      // 3. Upsert new password
      const { error: updateError } = await supabase
        .from("salesman_passwords")
        .upsert({
          salesman_code: matchedSalesman.salesman_code, // Save canonical code
          password: trimmedNew,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        throw new Error("Gagal menyimpan password baru: " + updateError.message);
      }

      setChangeSuccess("Password berhasil diubah! Mengarahkan ke halaman login...");
      setUsername(matchedSalesman.salesman_code);
      setPassword("");

      setChangeUser("");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setIsChangingPassword(false);
        setChangeSuccess("");
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setChangeError(err.message || "Gagal mengubah password.");
    } finally {
      setIsSubmittingChange(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("app_authenticated");
    localStorage.removeItem("user_role");
    localStorage.removeItem("salesman_code");
    localStorage.removeItem("salesman_name");
  };

  const isSurveyShared = currentView === "survey" && isShared;
  const isSurveyLcdShared = currentView === "survey-lcd" && isShared;
  const isLcdShared = currentView === "catalog-lcd" && isShared;
  const isReturShared = currentView === "retur-barang" && isShared;

  if (
    !isAuthenticated &&
    !isSurveyShared &&
    !isSurveyLcdShared &&
    !isLcdShared &&
    !isReturShared
  ) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
              <Lock className="w-8 h-8 text-white -rotate-3" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            {isChangingPassword ? "Ubah Password Salesman" : (currentView === "dashboard" || currentView === "setup" ? "Login Admin" : "Login Salesman")}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            {isChangingPassword 
              ? "Ubah password default Anda untuk mengamankan akses akun" 
              : (currentView === "dashboard" || currentView === "setup" ? "Akses terbatas hanya untuk admin" : "Silakan masukkan kredensial Salesman Anda untuk KPI & Survey Dashboard.")}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
            {!isChangingPassword ? (
              <form className="space-y-6" onSubmit={handleLogin}>
                {loginError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{loginError}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Username / Salesman Code
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan Kode Salesman Anda"
                      className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Default: Wook123"
                      className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(true);
                      setChangeError("");
                      setChangeSuccess("");
                      setChangeUser(username);
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                  >
                    Ubah Password default?
                  </button>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmittingLogin}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {isSubmittingLogin ? "Sedang login..." : "Sign in"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleChangePassword}>
                {changeError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3">
                    <p className="text-xs text-red-700 font-medium">{changeError}</p>
                  </div>
                )}

                {changeSuccess && (
                  <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3">
                    <p className="text-xs text-emerald-700 font-medium">{changeSuccess}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username / Salesman Code
                  </label>
                  <input
                    type="text"
                    required
                    value={changeUser}
                    onChange={(e) => setChangeUser(e.target.value)}
                    placeholder="Contoh: 83363"
                    className="appearance-none block w-full px-3 py-1.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password Lama
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Default password adalah Wook123"
                    className="appearance-none block w-full px-3 py-1.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru Anda"
                    className="appearance-none block w-full px-3 py-1.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi password baru Anda"
                    className="appearance-none block w-full px-3 py-1.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setChangeError("");
                      setChangeSuccess("");
                    }}
                    className="w-1/2 flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingChange}
                    className="w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {isSubmittingChange ? "Menyimpan..." : "Ubah Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (userRole === "salesman") {
    return (
      <AlertProvider>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <MobileAppLayout onLogout={handleLogout} />
        </ErrorBoundary>
      </AlertProvider>
    );
  }

  return (
    <AlertProvider>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => handleSetCurrentView("dashboard")}
      >
        <Layout
          currentView={currentView}
          onChangeView={handleSetCurrentView}
          isShared={isShared}
        >
          {currentView === "setup" && <SetupDatabase />}
          {currentView === "survey" && <SurveyChannel />}
          {currentView === "survey-lcd" && <SurveyLcd />}
          {currentView === "maps-analyzer" && <MapsAnalyzer />}
          {currentView === "form-cod" && <FormCodTempo />}
          {currentView === "db-sales-customer" && <SalesmanCustomerDB />}
          {currentView === "db-barang" && <DatabaseBarangDB />}
          {currentView === "db-idle-customer" && <IdleCustomerDB />}
          {currentView === "dashboard" && <Dashboard />}
          {currentView === "salesman-dashboard" && <SalesmanDashboard />}
          {currentView === "upload" && <ExcelUploader />}
          {currentView === "kpi-report" && <SalesmanKpiReport />}
          {currentView === "report-lcd" && <ReportLCD />}
          {currentView === "retur-barang" && (
            <ReturBarang isShared={isShared} />
          )}
          {currentView === "salesman-analysis" && <SalesmanAnalysis />}
          {currentView === "customer-analysis" && <CustomerAnalysis />}
          {currentView === "revenue-analysis" && <RevenueAnalysis />}
          {currentView === "supabase-viewer" && <SupabaseViewer />}
          {currentView === "visit-plan" && <VisitPlanning />}
          {currentView === "validasi-data" && <DataValidation />}
          {currentView === "catalog-lcd" && <LcdCatalogViewer />}
          {currentView === "admin-lcd" && <AdminLcdCatalog />}
          {currentView === "lcd-compare" && <LcdCompare />}
          {currentView === "customer-report" && <CustomerTargetReport />}
          {currentView === "kpi-targets" && <KpiTargetSetup />}
          {currentView === "team-config" && <TeamPointConfig />}
          {currentView === "insights" && <AIQueryInput />}
          {currentView === "form-builder" && <FormBuilder />}
          {currentView === "dynamic-excel" && <DynamicExcelManager />}
          {currentView === "live-excel" && <LiveExcel />}
          {currentView === "docs" && <Documentation />}
        </Layout>
      </ErrorBoundary>
    </AlertProvider>
  );
}
