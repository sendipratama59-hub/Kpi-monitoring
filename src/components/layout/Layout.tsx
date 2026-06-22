import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, LogOut, RefreshCcw } from 'lucide-react';
import { MenuGuide } from '../ui/MenuGuide';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onChangeView: (view: string) => void;
  isShared?: boolean;
}

export function Layout({ children, currentView, onChangeView, isShared }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('app_authenticated');
    window.location.reload();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 print:bg-white relative overflow-hidden print:overflow-visible">
      {/* Mobile Sidebar Overlay */}
      {!isShared && isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden print:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      {!isShared && (
        <div className={`fixed inset-y-0 left-0 z-50 w-52 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 print:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar 
            currentView={currentView} 
            onChangeView={(view) => {
              onChangeView(view);
              setIsSidebarOpen(false);
            }} 
          />
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden print:overflow-visible print:h-auto">
        {!isShared && (
          <header className="h-10 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <button 
                className="lg:hidden p-1 -ml-1 text-slate-500 hover:text-slate-800"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-sm font-semibold text-slate-800 capitalize truncate">
                {currentView === 'insights' ? 'AI Insights' : currentView.replace('-', ' ')}
              </h2>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 hover:text-indigo-600 transition-colors font-medium"
                title="Refresh Data"
              >
                <RefreshCcw className="w-3.5 h-3.5 sm:w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <div className="w-px h-4 bg-slate-200 hidden sm:block" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 hover:text-red-600 transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>
        )}
        <div id="main-scroll-container" className="p-2 flex-1 overflow-auto print:p-0 print:overflow-visible">
          <MenuGuide menuId={currentView} />
          {children}
        </div>
      </main>
    </div>
  );
}
