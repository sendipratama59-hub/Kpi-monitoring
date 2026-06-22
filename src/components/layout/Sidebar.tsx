import React, { useState } from 'react';
import { LayoutDashboard, Upload, Sparkles, Database, ClipboardList, Users, ChevronDown, ChevronRight, Target, BookOpen, Undo2, Send, Map } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
}

export function Sidebar({ currentView, onChangeView }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['database-group']);

  const menuItems = [
    { id: 'setup', label: 'DB Setup', icon: Database },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'visit-plan', label: 'Planning Kunjungan', icon: Send },
    { id: 'customer-analysis', label: 'Analisa Customer', icon: Sparkles },
    { id: 'retur-barang', label: 'Retur Barang', icon: Undo2 },
    { id: 'customer-report', label: 'Laporan Target Cust', icon: ClipboardList },
    { id: 'kpi-report', label: 'KPI Report', icon: Sparkles },
    { id: 'salesman-analysis', label: 'Analisa Salesman', icon: Sparkles },
    { id: 'kpi-targets', label: 'Target KPI', icon: Target },
    { id: 'team-config', label: 'Konfigurasi Tim Poin', icon: Users },
    { 
      id: 'lcd-group', 
      label: 'Katalog LCD', 
      icon: LayoutDashboard,
      subItems: [
        { id: 'catalog-lcd', label: 'Brosur LCD' },
        { id: 'admin-lcd', label: 'Admin Katalog LCD' },
        { id: 'lcd-compare', label: 'Perbandingan Harga' }
      ]
    },
    { 
      id: 'database-group', 
      label: 'Database', 
      icon: Users,
      subItems: [
        { id: 'db-sales-customer', label: 'Database Sales & Customer' },
        { id: 'db-barang', label: 'Database Barang' }
      ]
    },
    { id: 'report-lcd', label: 'Report LCD', icon: ClipboardList },
    { id: 'survey', label: 'Survey Channel', icon: ClipboardList },
    { id: 'survey-lcd', label: 'Survey LCD', icon: ClipboardList },
    { id: 'maps-analyzer', label: 'Analisa Link Maps', icon: Map },
    { id: 'form-cod', label: 'Form COD/Tempo', icon: ClipboardList },
    { id: 'validasi-data', label: 'Validasi Data', icon: Database },
    { id: 'form-builder', label: 'Form Builder', icon: ClipboardList },
    { id: 'dynamic-excel', label: 'Dynamic Excel Manager', icon: Database },
    { id: 'upload', label: 'Upload Data', icon: Upload },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'docs', label: 'Dokumentasi', icon: BookOpen },
  ];

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  return (
    <aside className="w-52 bg-slate-900 h-full text-slate-300 flex flex-col overflow-hidden">
      <div className="h-10 flex items-center px-4 border-b border-slate-800 shrink-0">
        <h1 className="font-bold text-sm text-white">KPI Monitor</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 flex flex-col gap-0.5 px-2">
        {menuItems.map((item) => {
          if (item.subItems) {
            const isExpanded = expandedGroups.includes(item.id);
            const isChildActive = item.subItems.some(sub => sub.id === currentView);
            return (
              <div key={item.id} className="flex flex-col gap-0.5">
                <button
                  onClick={() => toggleGroup(item.id)}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-sm text-xs font-medium transition-colors w-full text-left",
                    isChildActive && !isExpanded ? "text-indigo-400" : "hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("w-3.5 h-3.5", isChildActive ? "text-indigo-400" : "")} />
                    <span className={cn(isChildActive ? "text-indigo-400 font-semibold" : "")}>{item.label}</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {isExpanded && (
                  <div className="ml-4 flex flex-col gap-0.5 border-l border-slate-700 pl-2 mt-0.5">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => onChangeView(subItem.id)}
                        className={cn(
                          "flex items-center px-2 py-1.5 rounded-sm text-xs font-medium transition-colors w-full text-left",
                          currentView === subItem.id 
                            ? "bg-indigo-600 text-white" 
                            : "hover:bg-slate-800 hover:text-slate-300"
                        )}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs font-medium transition-colors w-full text-left",
                currentView === item.id 
                  ? "bg-indigo-600 text-white" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-2 border-t border-slate-800">
        <div className="text-[10px] text-slate-500">
          Powered by Gemini AI & Supabase
        </div>
      </div>
    </aside>
  );
}
