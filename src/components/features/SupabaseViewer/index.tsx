import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Database, Table as TableIcon, LayoutGrid, ChevronDown, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../../ui/Card';

const TABLES = [
  'profiles', 'upload_logs', 'sales_data', 'kpi_targets', 'survey_channel', 
  'salesman_customer', 'salesman_idle_customer', 'sales_survey_targets', 'dynamic_apps', 'dynamic_data', 
  'database_barang', 'retur_barang', 'lcd_catalog_products', 'lcd_catalog_content', 
  'salesman_kpi', 'salesman_kpi_targets', 'salesman_payments', 'report_lcd', 
  'program_bulanan', 'program_spu', 'app_guides', 'form_placeholders', 
  'form_configs', 'customer_kpi_targets', 'piutang_customer', 'visit_customer', 
  'salesman_manual_activities', 'kpi_teams', 'kpi_team_members', 
  'kpi_salesman_configs', 'deletion_logs', 'lcd_catalog_visitors', 
  'survey_lcd', 'form_cod_tempo', 'maps_analyzer', 'app_settings'
].sort();

export function SupabaseViewer() {
  const [selectedTable, setSelectedTable] = useState<string | null>(TABLES[0]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTableData = async (tableName: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from(tableName)
        .select('*')
        .limit(10);
        
      if (err) throw err;
      setTableData(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat data tabel');
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 text-center sm:text-left">
        <div className="w-full sm:w-auto">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2 justify-center sm:justify-start">
            <Database className="w-7 h-7 text-indigo-600" />
            Supabase Viewer
          </h2>
          <p className="text-sm text-slate-500 mt-1">Lihat struktur tabel dan preview 10 baris data dari database Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 shadow-sm border-slate-200 flex flex-col max-h-[800px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-500" />
            Daftar Tabel ({TABLES.length})
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            <div className="flex flex-col gap-1">
              {TABLES.map(table => (
                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={`px-3 py-2 text-left rounded-lg text-sm font-medium transition-colors flex items-center justify-between group ${
                    selectedTable === table 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate flex items-center gap-2">
                    <TableIcon className={`w-4 h-4 ${selectedTable === table ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    {table}
                  </span>
                  {selectedTable === table && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-3 shadow-sm border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
          {selectedTable ? (
            <>
              <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {selectedTable}
                  </h3>
                  <p className="text-sm text-slate-500">Preview max 10 baris data</p>
                </div>
                <button 
                  onClick={() => fetchTableData(selectedTable)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
              </div>

              <div className="flex-1 bg-slate-50/50 p-4 overflow-auto">
                {error ? (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3 border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold">Gagal memuat data</h4>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex justify-center items-center h-full min-h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : tableData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500">
                    <Database className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="font-medium text-slate-700">Tabel Kosong</p>
                    <p className="text-sm text-center mt-1">Tidak ada data di tabel ini.<br/>Struktur kolom tidak dapat ditampilkan.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            {columns.map(col => (
                              <th key={col} className="p-3 border-r border-slate-200 last:border-0 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tableData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              {columns.map(col => {
                                const val = row[col];
                                let displayVal = val;
                                if (val === null) displayVal = <span className="text-slate-400 italic">null</span>;
                                else if (typeof val === 'boolean') displayVal = <span className={val ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>{val ? 'true' : 'false'}</span>;
                                else if (typeof val === 'object') displayVal = <span className="text-slate-500 font-mono text-xs">{JSON.stringify(val)}</span>;
                                
                                return (
                                  <td key={col} className="p-3 border-r border-slate-100 last:border-0 max-w-[300px] truncate">
                                    {displayVal}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-slate-400 min-h-[300px]">
              <div className="text-center">
                <TableIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p>Pilih tabel dari daftar di samping untuk melihat isinya</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
