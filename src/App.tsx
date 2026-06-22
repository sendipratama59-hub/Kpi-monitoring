import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/features/Dashboard';
import { ExcelUploader } from './components/features/ExcelUploader';
import { AIQueryInput } from './components/features/AIQueryInput';
import { SetupDatabase } from './components/features/SetupDatabase';
import SurveyChannel from './components/features/SurveyChannel/index';
import SurveyLcd from './components/features/SurveyLcd';
import MapsAnalyzer from './components/features/MapsAnalyzer';
import FormCodTempo from './components/features/FormCodTempo';
import { SalesmanCustomerDB } from './components/features/SalesmanCustomerDB';
import { DatabaseBarangDB } from './components/features/DatabaseBarangDB';
import { SalesmanKpiReport } from './components/features/SalesmanKpiReport';
import { KpiTargetSetup } from './components/features/KpiTargetSetup';
import { Documentation } from './components/features/Documentation';
import { ReportLCD } from './components/features/ReportLCD';
import { CustomerTargetReport } from './components/features/CustomerTargetReport';
import { ReturBarang } from './components/features/ReturBarang/index';
import { SalesmanAnalysis } from './components/features/SalesmanAnalysis';
import { CustomerAnalysis } from './components/features/CustomerAnalysis';
import { VisitPlanning } from './components/features/VisitPlan';
import { TeamPointConfig } from './components/features/TeamPointConfig';
import { FormBuilder } from './components/features/FormBuilder';
import DynamicExcelManager from './components/features/DynamicExcelManager';
import { LcdCatalogViewer } from './components/features/LcdCatalog/CustomerView';
import { AdminLcdCatalog } from './components/features/LcdCatalog/AdminView';
import { LcdCompare } from './components/features/LcdCompare';
import { DataValidation } from './components/features/DataValidation';
import { AlertCircle, Lock } from 'lucide-react';
import { AlertProvider } from './components/ui/AlertModal';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-xl m-4 border border-red-200">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-lg font-semibold text-red-700 mb-2">Terjadi Kesalahan Component</h2>
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
  const initialView = urlParams.get('view') || localStorage.getItem('app_last_view') || 'setup';
  const isShared = urlParams.get('shared') === 'true';

  const [currentView, setCurrentView] = useState(initialView);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    if (currentView === 'catalog-lcd') {
      document.title = 'Pricelist LCD Vivan dan Xpas';
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📱</text></svg>";
      }
    } else if (currentView === 'retur-barang') {
      document.title = 'Retur Barang';
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📦</text></svg>";
      }
    } else {
      document.title = 'Survey Data Channel & Target';
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📋</text></svg>";
      }
    }

    if (currentView) {
      localStorage.setItem('app_last_view', currentView);
    }
  }, [currentView]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  useEffect(() => {
    const authStatus = localStorage.getItem('app_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'sendi81457' && password === 'sendi123') {
      setIsAuthenticated(true);
      localStorage.setItem('app_authenticated', 'true');
      setLoginError('');
    } else {
      setLoginError('Username atau password salah.');
    }
  };

  const isSurveyShared = currentView === 'survey' && isShared;
  const isSurveyLcdShared = currentView === 'survey-lcd' && isShared;
  const isLcdShared = currentView === 'catalog-lcd' && isShared;
  const isReturShared = currentView === 'retur-barang' && isShared;

  if (!isAuthenticated && !isSurveyShared && !isSurveyLcdShared && !isLcdShared && !isReturShared) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
              <Lock className="w-8 h-8 text-white -rotate-3" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            {currentView === 'dashboard' || currentView === 'setup' ? 'Login Admin' : 'Login Salesman'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            {currentView === 'dashboard' || currentView === 'setup'
              ? 'Akses terbatas hanya untuk admin '
              : 'Silakan masukkan kredensial Salesman Anda untuk '}
            KPI & Survey Dashboard.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
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
                  Username
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign in
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AlertProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => setCurrentView('dashboard')}>
        <Layout currentView={currentView} onChangeView={setCurrentView} isShared={isShared}>
          {currentView === 'setup' && <SetupDatabase />}
          {currentView === 'survey' && <SurveyChannel />}
          {currentView === 'survey-lcd' && <SurveyLcd />}
          {currentView === 'maps-analyzer' && <MapsAnalyzer />}
          {currentView === 'form-cod' && <FormCodTempo />}
          {currentView === 'db-sales-customer' && <SalesmanCustomerDB />}
          {currentView === 'db-barang' && <DatabaseBarangDB />}
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'upload' && <ExcelUploader />}
          {currentView === 'kpi-report' && <SalesmanKpiReport />}
          {currentView === 'report-lcd' && <ReportLCD />}
          {currentView === 'retur-barang' && <ReturBarang isShared={isShared} />}
          {currentView === 'salesman-analysis' && <SalesmanAnalysis />}
          {currentView === 'customer-analysis' && <CustomerAnalysis />}
          {currentView === 'visit-plan' && <VisitPlanning />}
          {currentView === 'validasi-data' && <DataValidation />}
          {currentView === 'catalog-lcd' && <LcdCatalogViewer />}
          {currentView === 'admin-lcd' && <AdminLcdCatalog />}
          {currentView === 'lcd-compare' && <LcdCompare />}
          {currentView === 'customer-report' && <CustomerTargetReport />}
          {currentView === 'kpi-targets' && <KpiTargetSetup />}
          {currentView === 'team-config' && <TeamPointConfig />}
          {currentView === 'insights' && <AIQueryInput />}
          {currentView === 'form-builder' && <FormBuilder />}
          {currentView === 'dynamic-excel' && <DynamicExcelManager />}
          {currentView === 'docs' && <Documentation />}
        </Layout>
      </ErrorBoundary>
    </AlertProvider>
  );
}

