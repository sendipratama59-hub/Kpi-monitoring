import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Database, Copy, CheckCircle2, AlertTriangle, Play, Loader2, HardDrive, RefreshCw } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { RPC_SCRIPT, SQL_SCRIPT } from './sql-scripts';

export function SetupDatabase() {
  const [copiedRpc, setCopiedRpc] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{success: boolean, message: string} | null>(null);

  const [isFetchingStats, setIsFetchingStats] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchDbStats = async () => {
    setIsFetchingStats(true);
    setStatsError(null);
    try {
      const { data, error } = await supabase.rpc('get_db_stats');
      if (error) throw new Error(error.message);
      
      // Sort tables by total_bytes descending
      if (data && data.table_stats) {
        data.table_stats.sort((a: any, b: any) => b.total_bytes - a.total_bytes);
      }
      setDbStats(data);
    } catch (err: any) {
      console.error(err);
      setStatsError(`Gagal mengambil data: ${err.message}. Pastikan Anda telah menjalankan "Eksekusi Query Sekarang" untuk membuat fungsi get_db_stats() di Supabase.`);
    } finally {
      setIsFetchingStats(false);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Assume Supabase free tier size limit is 500 MB (500 * 1024 * 1024 = 524288000 bytes).
  // We'll calculate the percentage of 500MB used.
  const MAX_STORAGE_BYTES = 524288000;

  const handleCopyRpc = async () => {
    try {
      await navigator.clipboard.writeText(RPC_SCRIPT);
      setCopiedRpc(true);
      setTimeout(() => setCopiedRpc(false), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const executeSetupSql = async () => {
    setIsExecuting(true);
    setExecResult(null);
    try {
      const { error } = await supabase.rpc('exec_sql', { query_text: SQL_SCRIPT });
      if (error) {
        throw new Error(error.message);
      }
      setExecResult({ success: true, message: 'Berhasil membuat semua tabel di Supabase!' });
    } catch (err: any) {
      console.error(err);
      setExecResult({ success: false, message: `Gagal menjalankan SQL: ${err.message}. Pastikan Fungsi exec_sql sudah dibuat!` });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-2 text-amber-800">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
        <div>
          <h3 className="text-sm font-bold mb-1">Langkah 1: Setup Eksekutor SQL di Supabase</h3>
          <p className="text-xs">
            Salin dan jalankan fungsi di bawah ini <b>sekali saja</b> di SQL Editor Supabase Anda. 
            Fungsi ini (RPC <code>exec_sql</code>) bertugas sebagai pintu belakang agar aplikasi ini bisa menjalankan <code>CREATE TABLE</code> melalui backend Supabase.
          </p>
          
          <div className="mt-2 relative">
            <pre className="bg-amber-900 text-amber-50 p-2.5 rounded text-[10px] custom-scrollbar overflow-x-auto">
              <code>{RPC_SCRIPT}</code>
            </pre>
            <Button 
              onClick={handleCopyRpc} 
              size="sm" 
              variant="default"
              className="absolute top-2 right-2 h-8 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {copiedRpc ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copiedRpc ? "Disalin" : "Salin"}
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 bg-slate-50 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            <div>
              <CardTitle>Langkah 2: Eksekusi Skema Tabel</CardTitle>
              <p className="text-[10px] text-slate-500 mt-0.5">Jika Step 1 sudah dilakukan, klik eksekusi di bawah ini</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(SQL_SCRIPT);
                  const btn = document.getElementById('copy-sql-btn');
                  if (btn) {
                    btn.innerHTML = 'Tersalin!';
                    setTimeout(() => { if (btn) btn.innerHTML = 'Salin Manual' }, 2000);
                  }
                } catch(e) {}
              }} 
              variant="outline"
              className="text-xs bg-white text-slate-600 hover:bg-slate-50 w-full sm:w-auto"
              id="copy-sql-btn"
            >
              <Copy className="w-3 h-3 mr-1" /> Salin Manual
            </Button>
            <Button 
              onClick={executeSetupSql} 
              disabled={isExecuting}
              className="bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all w-full sm:w-auto"
            >
              {isExecuting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eksekusi...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Eksekusi Query</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {execResult && (
            <div className={`p-3 border-b text-xs font-medium flex items-start gap-2 ${execResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {execResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {execResult.message}
            </div>
          )}
          <pre className="custom-scrollbar bg-slate-900 text-slate-50 p-4 text-[10px] overflow-x-auto min-h-[200px] max-h-[350px] border-t-0 rounded-b-md">
            <code>{SQL_SCRIPT}</code>
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-500" />
            <div>
              <CardTitle>Langkah 3: Cek Pemakaian Memori Database</CardTitle>
              <p className="text-[10px] text-slate-500 mt-0.5">Lihat kapasitas penyimpanan tabel dan sisa kuota (Asumsi Kuota Free Tier: 500 MB)</p>
            </div>
          </div>
          <Button 
            onClick={fetchDbStats} 
            disabled={isFetchingStats}
            variant="outline"
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            {isFetchingStats ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memuat...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" /> Cek Memori</>
            )}
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {statsError && (
            <div className="mb-4 p-3 border-l-4 border-red-500 bg-red-50 text-red-700 font-medium text-sm rounded">
              {statsError}
            </div>
          )}

          {dbStats && (
            <div className="space-y-6">
              {/* Storage Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Total Penyimpanan Digunakan</div>
                  <div className="text-2xl font-bold text-slate-800">{dbStats.database_size_pretty}</div>
                  <div className="text-xs text-slate-400 mt-1">{dbStats.database_size_bytes.toLocaleString('id-ID')} bytes</div>
                </div>
                
                {(() => {
                  const usedBytes = dbStats.database_size_bytes;
                  const remainingBytes = Math.max(0, MAX_STORAGE_BYTES - usedBytes);
                  const percentUsed = Math.min(100, (usedBytes / MAX_STORAGE_BYTES) * 100);
                  
                  return (
                    <>
                      <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="text-slate-500 text-xs font-semibold uppercase mb-1">Estimasi Sisa Kuota (500 MB)</div>
                        <div className="text-2xl font-bold text-emerald-600">{formatBytes(remainingBytes)}</div>
                        <div className="text-xs text-slate-400 mt-1">{remainingBytes.toLocaleString('id-ID')} bytes</div>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-4 shadow-sm flex flex-col justify-center">
                        <div className="text-slate-500 text-xs font-semibold uppercase mb-2">Persentase Penggunaan</div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1">
                          <div className={`h-2.5 rounded-full ${percentUsed > 80 ? 'bg-red-600' : percentUsed > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentUsed}%` }}></div>
                        </div>
                        <div className="text-right text-xs font-medium text-slate-700">{percentUsed.toFixed(2)}%</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Table Sizes */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Ukuran Per Tabel (Urut dari Terbesar)</h4>
                <div className="overflow-x-auto w-full border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b text-slate-600 font-medium">
                      <tr>
                        <th className="px-4 py-3">Nama Tabel</th>
                        <th className="px-4 py-3">Schema</th>
                        <th className="px-4 py-3 text-right">Ukuran (Bytes)</th>
                        <th className="px-4 py-3 text-right">Ukuran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700 bg-white">
                      {dbStats.table_stats && dbStats.table_stats.length > 0 ? (
                        dbStats.table_stats.map((table: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{table.table_name}</td>
                            <td className="px-4 py-3 text-slate-500">{table.schema_name}</td>
                            <td className="px-4 py-3 text-right">{table.total_bytes.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-right font-medium">{table.total_size_pretty}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-500">Tidak ada data tabel.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
