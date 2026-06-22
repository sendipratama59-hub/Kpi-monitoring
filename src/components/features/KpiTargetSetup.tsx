import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader2, Trash2, Save, FileSpreadsheet, Target, Users, Search, X, Check, Edit2, RefreshCw, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useAlert } from '../ui/AlertModal';
import { motion, AnimatePresence } from 'motion/react';

import { GenieModal } from '../ui/GenieModal';

export function KpiTargetSetup() {
  const { showAlert, showConfirm } = useAlert();
  const [targets, setTargets] = useState<any[]>([]);
  const [availableSalesmen, setAvailableSalesmen] = useState<{salesman_code: string, salesman_name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletionLogs, setDeletionLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [viewMode, setViewMode] = useState<'setup' | 'table'>('setup');
  const [teams, setTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // Mass Edit Modal State
  const [isMassEditOpen, setIsMassEditOpen] = useState(false);
  const [massEditField, setMassEditField] = useState('');
  const [massEditValue, setMassEditValue] = useState<number | string>('');

  useEffect(() => {
    fetchData();
    fetchDeletionLogs();
  }, []);

  const fetchDeletionLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('deletion_logs')
        .select('*')
        .eq('table_name', 'salesman_kpi_targets')
        .order('deleted_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setDeletionLogs(data || []);
    } catch (err) {
      console.error('Error fetching deletion logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: targetsData, error: targetsError } = await supabase.from('salesman_kpi_targets').select('*');
      if (targetsError) throw targetsError;
      
      const { data: teamsData } = await supabase.from('kpi_teams').select('*');
      const { data: membersData } = await supabase.from('kpi_team_members').select('*');
      
      setTeams(teamsData || []);
      setTeamMembers(membersData || []);
      
      const { data: salesmanData, error: salesmanError } = await supabase
        .from('salesman_customer')
        .select('salesman_code, salesman_name');
      if (salesmanError) throw salesmanError;
      
      const { data: kpiData, error: kpiError } = await supabase
        .from('salesman_kpi')
        .select('salesman_code, salesman_name');
      if (kpiError) throw kpiError;
      
      const allSalesmenMap = new Map<string, string>();
      
      salesmanData?.forEach(row => {
        if (row.salesman_code && row.salesman_name) {
          allSalesmenMap.set(row.salesman_code, row.salesman_name);
        }
      });
      
      kpiData?.forEach(row => {
        if (row.salesman_code && row.salesman_name) {
          allSalesmenMap.set(row.salesman_code, row.salesman_name);
        }
      });

      const uniqueSalesmen = Array.from(allSalesmenMap.entries()).map(([kode, nama]) => ({
        salesman_code: kode,
        salesman_name: nama || ''
      })).sort((a, b) => a.salesman_name.localeCompare(b.salesman_name));
      
      setAvailableSalesmen(uniqueSalesmen);
      setTargets(targetsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSalesman = (salesman: {salesman_code: string, salesman_name: string}) => {
    const existingIndex = targets.findIndex(t => t.salesman_code === salesman.salesman_code);
    
    if (existingIndex >= 0) {
      const newTargets = [...targets];
      newTargets.splice(existingIndex, 1);
      setTargets(newTargets);
    } else {
      setTargets([
        {
          salesman_code: salesman.salesman_code,
          salesman_name: salesman.salesman_name,
          target_omset_all_brand: 0,
          target_omset_lcd: 0,
          target_omset_redskull: 0,
          target_co_3c: 0,
          target_hydrogel_pcs: 0,
          target_tg_pcs: 0,
          target_new_customer: 0,
          target_idle_customer: 0,
          target_co_mesin_vqm: 0,
          target_co_tg: 0,
          target_omset_5jt: 0,
          target_payment_3c: 0,
          target_payment_3c_lcd: 0,
          target_program_bulanan: 0,
          target_spu: 0,
          target_perbaikan_display: 0,
          target_pemasangan_spanduk: 0,
          target_visit_customer: 0
        },
        ...targets
      ]);
    }
  };

  const isSalesmanSelected = (kode: string) => {
    return targets.some(t => t.salesman_code === kode);
  };

  const filteredSalesmen = useMemo(() => {
    if (!searchTerm) return availableSalesmen;
    return availableSalesmen.filter(s => 
      s.salesman_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.salesman_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableSalesmen, searchTerm]);

  const removeRow = (index: number, id: string | undefined, salesmanName: string) => {
    showConfirm({
      title: 'Konfirmasi Hapus Target',
      message: `Apakah Anda yakin ingin menghapus data target untuk ${salesmanName}? Aksi ini tidak dapat dibatalkan.`,
      type: 'warning',
      onConfirm: async () => {
        if (id) {
          try {
            // Log the deletion first
            const deletedTarget = targets[index];
            await supabase.from('deletion_logs').insert([{
              table_name: 'salesman_kpi_targets',
              record_id: id,
              deleted_data: deletedTarget,
              deleted_by: 'User' // In a real app, this would be the logged in user
            }]);

            const { error } = await supabase.from('salesman_kpi_targets').delete().eq('id', id);
            if (error) throw error;
          } catch (err: any) {
            showAlert(err.message || 'Gagal menghapus dari database', 'error');
            return;
          }
        }
        const newTargets = [...targets];
        newTargets.splice(index, 1);
        setTargets(newTargets);
        showAlert(`Target untuk ${salesmanName} berhasil dihapus dan riwayatnya telah dicatat.`, 'success');
        fetchDeletionLogs();
      }
    });
  };

  const handleChange = (index: number, field: string, value: any) => {
    const newTargets = [...targets];
    newTargets[index][field] = value;

    // Hitung otomatis jika salah satu komponen penjumlahan berubah
    if (field === 'target_payment_3c' || field === 'target_omset_lcd') {
      const payment3c = Number(newTargets[index].target_payment_3c) || 0;
      const omsetLcd = Number(newTargets[index].target_omset_lcd) || 0;
      newTargets[index].target_payment_3c_lcd = payment3c + omsetLcd;
    }

    setTargets(newTargets);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const validTargets = targets.filter(t => t.salesman_code && t.salesman_code.trim() !== '');
      if (validTargets.length === 0) {
        showAlert('Tidak ada data valid untuk disimpan. Pastikan kode salesman diisi.', 'warning');
        setIsSaving(false);
        return;
      }

      const payload = validTargets.map(t => {
        const item = { ...t };
        // If it's a new row (no id), let's ensure it has a temporary UUID or just let DB handle it.
        // However, if DB default is failing, we generate it here for safety.
        if (!item.id) {
          item.id = crypto.randomUUID();
        }
        
        // Remove created_at and updated_at if they are null to let DB handle defaults
        if (!item.created_at) item.created_at = new Date().toISOString();
        item.updated_at = new Date().toISOString();
        
        return item;
      });

      const { error } = await supabase.from('salesman_kpi_targets').upsert(payload, { onConflict: 'salesman_code' });
      if (error) throw error;

      showAlert('Berhasil menyimpan semua target KPI!', 'success');
      fetchData();
    } catch (err: any) {
      showAlert(err.message || 'Gagal menyimpan target', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMassEdit = () => {
    if (!massEditField) {
      showAlert('Pilih field target yang ingin diubah masal.', 'warning');
      return;
    }
    const val = Number(massEditValue);
    if (isNaN(val)) {
      showAlert('Nilai target tidak valid.', 'error');
      return;
    }

    const newTargets = targets.map(t => {
      const updated = { ...t, [massEditField]: val };
      if (massEditField === 'target_payment_3c' || massEditField === 'target_omset_lcd') {
        const payment3c = Number(updated.target_payment_3c) || 0;
        const omsetLcd = Number(updated.target_omset_lcd) || 0;
        updated.target_payment_3c_lcd = payment3c + omsetLcd;
      }
      return updated;
    });

    setTargets(newTargets);
    setIsMassEditOpen(false);
    setMassEditField('');
    setMassEditValue('');
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setIsUploading(true);

    try {
      const data = await new Promise<any[]>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const buffer = e.target?.result;
            const wb = XLSX.read(buffer, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });

      if (data.length > 0) {
        const mappedTargets = data.map(row => {
          const payment3c = Number(row.target_payment_3c) || 0;
          const omsetLcd = Number(row.target_omset_lcd) || 0;
          
          return {
            id: crypto.randomUUID(), // Generate ID for new imports
            salesman_code: row.salesman_code || row.kode_salesman || '',
            salesman_name: row.salesman_name || row.nama_salesman || row.salesman || '',
            target_omset_all_brand: Number(row.target_omset_all_brand) || 0,
            target_omset_lcd: omsetLcd,
            target_omset_redskull: Number(row.target_omset_redskull) || 0,
            target_co_3c: Number(row.target_co_3c) || 0,
            target_hydrogel_pcs: Number(row.target_hydrogel_pcs) || 0,
            target_tg_pcs: Number(row.target_tg_pcs) || 0,
            target_new_customer: Number(row.target_new_customer) || 0,
            target_idle_customer: Number(row.target_idle_customer) || 0,
            target_co_mesin_vqm: Number(row.target_co_mesin_vqm) || 0,
            target_co_tg: Number(row.target_co_tg) || 0,
            target_omset_5jt: Number(row.target_omset_5jt) || 0,
            target_payment_3c: payment3c,
            target_payment_3c_lcd: Number(row.target_payment_3c_lcd) || (payment3c + omsetLcd),
            target_program_bulanan: Number(row.target_program_bulanan) || 0,
            target_spu: Number(row.target_spu) || 0,
            target_perbaikan_display: Number(row.target_perbaikan_display) || 0,
            target_pemasangan_spanduk: Number(row.target_pemasangan_spanduk) || 0,
            target_visit_customer: Number(row.target_visit_customer) || 0
          };
        }).filter(t => t.salesman_code);

        if (mappedTargets.length > 0) {
          const { error } = await supabase.from('salesman_kpi_targets').upsert(mappedTargets, { onConflict: 'salesman_code' });
          if (error) throw error;
          showAlert(`Berhasil mengunggah ${mappedTargets.length} target KPI!`, 'success');
          fetchData();
        } else {
          showAlert('Tidak ada data yang valid ditemukan di file Excel (pastikan ada kolom salesman_code)', 'warning');
        }
      }
    } catch (err: any) {
      showAlert(err.message || 'Gagal memproses file Excel.', 'error');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const groupedTargets = useMemo(() => {
    if (viewMode !== 'table') return [];
    
    const teamGroups: any[] = [];
    
    // Group targets by team
    teams.forEach(team => {
      const members = teamMembers
        .filter(m => m.team_id === team.id)
        .map(m => m.salesman_code);
      
      // Ensure leader is included in codes if they have a target
      const codes = Array.from(new Set([...members, team.leader_code]));
      
      const teamTargets = targets.filter(t => codes.includes(t.salesman_code));
      
      if (teamTargets.length > 0) {
        // Sort: Leader first, then members
        const sortedTeamTargets = [...teamTargets].sort((a, b) => {
          if (a.salesman_code === team.leader_code) return -1;
          if (b.salesman_code === team.leader_code) return 1;
          return (a.salesman_name || '').localeCompare(b.salesman_name || '');
        });

        // Calculate Totals
        const totals = {
          target_omset_all_brand: sortedTeamTargets.reduce((sum, t) => sum + (t.target_omset_all_brand || 0), 0),
          target_omset_lcd: sortedTeamTargets.reduce((sum, t) => sum + (t.target_omset_lcd || 0), 0),
          target_omset_redskull: sortedTeamTargets.reduce((sum, t) => sum + (t.target_omset_redskull || 0), 0),
          target_co_3c: sortedTeamTargets.reduce((sum, t) => sum + (t.target_co_3c || 0), 0),
          target_hydrogel_pcs: sortedTeamTargets.reduce((sum, t) => sum + (t.target_hydrogel_pcs || 0), 0),
          target_tg_pcs: sortedTeamTargets.reduce((sum, t) => sum + (t.target_tg_pcs || 0), 0),
          target_new_customer: sortedTeamTargets.reduce((sum, t) => sum + (t.target_new_customer || 0), 0),
          target_idle_customer: sortedTeamTargets.reduce((sum, t) => sum + (t.target_idle_customer || 0), 0),
          target_co_mesin_vqm: sortedTeamTargets.reduce((sum, t) => sum + (t.target_co_mesin_vqm || 0), 0),
          target_co_tg: sortedTeamTargets.reduce((sum, t) => sum + (t.target_co_tg || 0), 0),
          target_omset_5jt: sortedTeamTargets.reduce((sum, t) => sum + (t.target_omset_5jt || 0), 0),
          target_payment_3c: sortedTeamTargets.reduce((sum, t) => sum + (t.target_payment_3c || 0), 0),
          target_payment_3c_lcd: sortedTeamTargets.reduce((sum, t) => sum + (t.target_payment_3c_lcd || 0), 0),
          target_program_bulanan: sortedTeamTargets.reduce((sum, t) => sum + (t.target_program_bulanan || 0), 0),
          target_spu: sortedTeamTargets.reduce((sum, t) => sum + (t.target_spu || 0), 0),
          target_perbaikan_display: sortedTeamTargets.reduce((sum, t) => sum + (t.target_perbaikan_display || 0), 0),
          target_pemasangan_spanduk: sortedTeamTargets.reduce((sum, t) => sum + (t.target_pemasangan_spanduk || 0), 0),
          target_visit_customer: sortedTeamTargets.length > 0 ? sortedTeamTargets.reduce((sum, t) => sum + (t.target_visit_customer || 0), 0) / sortedTeamTargets.length : 0,
        };

        teamGroups.push({
          teamName: team.name,
          leaderCode: team.leader_code,
          targets: sortedTeamTargets,
          totals
        });
      }
    });

    // Add orphans (salesmen not in any team)
    const allIncludedCodes = new Set();
    teamGroups.forEach(tg => tg.targets.forEach((t: any) => allIncludedCodes.add(t.salesman_code)));
    
    const orphans = targets.filter(t => !allIncludedCodes.has(t.salesman_code));
    if (orphans.length > 0) {
      teamGroups.push({
        teamName: 'Tanpa Tim',
        leaderCode: null,
        targets: orphans,
        totals: {
          target_omset_all_brand: orphans.reduce((sum, t) => sum + (t.target_omset_all_brand || 0), 0),
          target_omset_lcd: orphans.reduce((sum, t) => sum + (t.target_omset_lcd || 0), 0),
          target_omset_redskull: orphans.reduce((sum, t) => sum + (t.target_omset_redskull || 0), 0),
          target_co_3c: orphans.reduce((sum, t) => sum + (t.target_co_3c || 0), 0),
          target_hydrogel_pcs: orphans.reduce((sum, t) => sum + (t.target_hydrogel_pcs || 0), 0),
          target_tg_pcs: orphans.reduce((sum, t) => sum + (t.target_tg_pcs || 0), 0),
          target_new_customer: orphans.reduce((sum, t) => sum + (t.target_new_customer || 0), 0),
          target_idle_customer: orphans.reduce((sum, t) => sum + (t.target_idle_customer || 0), 0),
          target_co_mesin_vqm: orphans.reduce((sum, t) => sum + (t.target_co_mesin_vqm || 0), 0),
          target_co_tg: orphans.reduce((sum, t) => sum + (t.target_co_tg || 0), 0),
          target_omset_5jt: orphans.reduce((sum, t) => sum + (t.target_omset_5jt || 0), 0),
          target_payment_3c: orphans.reduce((sum, t) => sum + (t.target_payment_3c || 0), 0),
          target_payment_3c_lcd: orphans.reduce((sum, t) => sum + (t.target_payment_3c_lcd || 0), 0),
          target_program_bulanan: orphans.reduce((sum, t) => sum + (t.target_program_bulanan || 0), 0),
          target_spu: orphans.reduce((sum, t) => sum + (t.target_spu || 0), 0),
          target_perbaikan_display: orphans.reduce((sum, t) => sum + (t.target_perbaikan_display || 0), 0),
          target_pemasangan_spanduk: orphans.reduce((sum, t) => sum + (t.target_pemasangan_spanduk || 0), 0),
          target_visit_customer: orphans.length > 0 ? orphans.reduce((sum, t) => sum + (t.target_visit_customer || 0), 0) / orphans.length : 0,
        }
      });
    }

    return teamGroups;
  }, [viewMode, teams, teamMembers, targets]);

  const teamConsistencyData = useMemo(() => {
    return [];
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
        <p>Memuat pengaturan target KPI...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setViewMode('setup')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            viewMode === 'setup' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Edit2 className="w-4 h-4" /> Setup Target (Manual/Excel)
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            viewMode === 'table' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Tinjau Target (Tabel)
        </button>
      </div>

      {viewMode === 'setup' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Target className="mr-2 h-5 w-5 text-indigo-500" />
              Pengaturan Target KPI Salesman
            </CardTitle>
            <CardDescription>
              Pilih salesman dari dropdown atau unggah file excel untuk mengatur target mereka. Target akan dibandingkan dengan pencapaian aktual di halaman report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 mb-8 p-1">
              {/* Left Section: Salesman Selection */}
              <div className="flex flex-col space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Pilih / Cari Salesman</label>
                <div className="relative">
                  <Button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                    variant="outline" 
                    className="w-full lg:w-72 justify-between border-indigo-100 text-indigo-700 hover:bg-indigo-50 shadow-sm h-11"
                  >
                    <div className="flex items-center font-bold">
                      <Users className="w-4 h-4 mr-2 text-indigo-500" /> 
                      {targets.length > 0 ? `Terpilih (${targets.length})` : 'Pilih Salesman...'}
                    </div>
                  </Button>
                  
                  {isDropdownOpen && (
                    <div className="absolute top-full mt-2 left-0 w-full sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                      <div className="p-3 border-b border-slate-50 relative bg-slate-50/50">
                        <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Cari salesman..." 
                          className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white transition-all"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                        />
                        {searchTerm && (
                          <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2">
                            <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {filteredSalesmen.length === 0 ? (
                          <div className="p-4 text-sm text-center text-slate-400 italic">Tidak ada salesman ditemukan.</div>
                        ) : (
                          filteredSalesmen.map(salesman => {
                            const isSelected = isSalesmanSelected(salesman.salesman_code);
                            return (
                              <button
                                key={salesman.salesman_code}
                                onClick={() => toggleSalesman(salesman)}
                                className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between rounded-lg transition-all mb-1 ${
                                  isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold leading-tight">{salesman.salesman_name}</span>
                                  <span className="text-[10px] opacity-60 font-mono tracking-tight">{salesman.salesman_code}</span>
                                </div>
                                {isSelected && (
                                  <div className="bg-indigo-600 rounded-full p-0.5">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Middle Section: Tools & Actions */}
              <div className="flex flex-col space-y-2 flex-grow">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Alat Bantu & Import</label>
                <div className="flex flex-wrap items-stretch gap-2">
                  <Button 
                    onClick={() => setIsMassEditOpen(true)} 
                    variant="outline" 
                    className="border-blue-100 text-blue-700 hover:bg-blue-50 shadow-sm h-11 px-4 font-bold"
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Masal
                  </Button>
  
                  <div 
                    {...getRootProps()} 
                    className={`flex items-center px-4 h-11 border border-dashed rounded-lg text-sm font-bold cursor-pointer transition-all shadow-sm ${
                      isDragActive 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20' 
                        : 'border-slate-200 hover:border-indigo-300 bg-slate-50/50 text-slate-600 hover:text-indigo-600'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {isUploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengproses...</>
                    ) : (
                      <><FileSpreadsheet className="w-4 h-4 mr-2" /> Upload Excel</>
                    )}
                  </div>
  
                  <Button 
                    onClick={() => {
                      const templateData = [{
                        salesman_code: 'S001',
                        salesman_name: 'Nama Salesman',
                        target_omset_all_brand: 100000000,
                        target_omset_lcd: 10000000,
                        target_omset_redskull: 5000000,
                        target_co_3c: 50,
                        target_hydrogel_pcs: 200,
                        target_tg_pcs: 100,
                        target_new_customer: 5,
                        target_idle_customer: 10,
                        target_co_mesin_vqm: 2,
                        target_co_tg: 10,
                        target_omset_5jt: 5,
                        target_payment_3c: 50000000,
                        target_program_bulanan: 10,
                        target_spu: 5,
                        target_perbaikan_display: 5,
                        target_pemasangan_spanduk: 5,
                        target_visit_customer: 100
                      }];
                      const worksheet = XLSX.utils.json_to_sheet(templateData);
                      const workbook = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(workbook, worksheet, 'Target_KPI');
                      XLSX.writeFile(workbook, 'Template_Target_KPI.xlsx');
                    }} 
                    variant="outline" 
                    className="border-emerald-100 text-emerald-700 hover:bg-emerald-50 shadow-sm h-11 px-4 font-bold"
                  >
                    <Check className="w-4 h-4 mr-2" /> Template Excel
                  </Button>
                </div>
              </div>
              
              {/* Right Section: Global Save */}
              <div className="flex flex-col space-y-2 lg:items-end">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden lg:block">Simpan Perubahan</label>
                <Button 
                  onClick={handleSaveAll} 
                  disabled={isSaving} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 h-11 px-8 font-black uppercase tracking-wide transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Simpan Semua</>
                  )}
                </Button>
              </div>
            </div>
  
            <div className="space-y-6">
              {targets.length === 0 ? (
                <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-lg font-medium text-slate-700 mb-1">Belum ada target yang diatur</p>
                  <p className="text-sm">Silakan pilih salesman dari dropdown di atas untuk mulai mengatur target KPI.</p>
                </div>
              ) : (
                targets.map((t, idx) => {
                  const isExpanded = expandedIndex === idx;
                  return (
                    <div key={idx} className={`border rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md ${isExpanded ? 'ring-2 ring-indigo-500/20 border-indigo-200' : 'border-slate-200'}`}>
                      <div 
                        className={`px-4 py-3 flex justify-between items-center cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/80' : 'bg-slate-50/50 hover:bg-slate-100/50'}`}
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-white shadow-sm' : 'bg-indigo-100'}`}>
                            <Users className={`w-5 h-5 ${isExpanded ? 'text-indigo-600' : 'text-indigo-600'}`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg leading-tight">{t.salesman_name}</h3>
                            <p className="text-xs text-indigo-600 font-medium">{t.salesman_code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRow(idx, t.id, t.salesman_name);
                            }} 
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-bold"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Hapus Target
                          </Button>
                          <div className="p-1 rounded-full hover:bg-slate-200/50 transition-colors">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 md:p-6 border-t border-slate-100">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Omset All Brand (Rp)</label>
                                  <input type="number" value={t.target_omset_all_brand} onChange={(e) => handleChange(idx, 'target_omset_all_brand', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
                                
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Omset LCD (Rp)</label>
                                  <input type="number" value={t.target_omset_lcd} onChange={(e) => handleChange(idx, 'target_omset_lcd', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
                                
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Omset Redskull (Rp)</label>
                                  <input type="number" value={t.target_omset_redskull} onChange={(e) => handleChange(idx, 'target_omset_redskull', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target NOA 3C (Toko)</label>
                                  <input type="number" value={t.target_co_3c} onChange={(e) => handleChange(idx, 'target_co_3c', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Hydrogel (Pcs)</label>
                                  <input type="number" value={t.target_hydrogel_pcs} onChange={(e) => handleChange(idx, 'target_hydrogel_pcs', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target TG (Pcs)</label>
                                  <input type="number" value={t.target_tg_pcs} onChange={(e) => handleChange(idx, 'target_tg_pcs', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target NOO (Toko)</label>
                                  <input type="number" value={t.target_new_customer} onChange={(e) => handleChange(idx, 'target_new_customer', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Idle (Toko)</label>
                                  <input type="number" value={t.target_idle_customer} onChange={(e) => handleChange(idx, 'target_idle_customer', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target CO Mesin (Toko)</label>
                                  <input type="number" value={t.target_co_mesin_vqm} onChange={(e) => handleChange(idx, 'target_co_mesin_vqm', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target CO TG (Toko)</label>
                                  <input type="number" value={t.target_co_tg} onChange={(e) => handleChange(idx, 'target_co_tg', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Omset &gt; 5Jt (Toko)</label>
                                  <input type="number" value={t.target_omset_5jt} onChange={(e) => handleChange(idx, 'target_omset_5jt', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Payment 3C (Rp)</label>
                                  <input type="number" value={t.target_payment_3c} onChange={(e) => handleChange(idx, 'target_payment_3c', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Payment 3C + LCD (Rp)</label>
                                  <input type="number" value={t.target_payment_3c_lcd} onChange={(e) => handleChange(idx, 'target_payment_3c_lcd', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold bg-slate-50" placeholder="0" readOnly />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Program Bulanan</label>
                                  <input type="number" value={t.target_program_bulanan} onChange={(e) => handleChange(idx, 'target_program_bulanan', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target SPU (SKU)</label>
                                  <input type="number" value={t.target_spu} onChange={(e) => handleChange(idx, 'target_spu', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Perbaikan Display (Toko)</label>
                                  <input type="number" value={t.target_perbaikan_display} onChange={(e) => handleChange(idx, 'target_perbaikan_display', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Pemasangan Spanduk Stiker (Toko)</label>
                                  <input type="number" value={t.target_pemasangan_spanduk} onChange={(e) => handleChange(idx, 'target_pemasangan_spanduk', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-500 uppercase font-bold tracking-tight">Target Visit Customer (%)</label>
                                  <input type="number" value={t.target_visit_customer} onChange={(e) => handleChange(idx, 'target_visit_customer', Number(e.target.value))} className="w-full text-sm border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-md px-3 py-2 transition-all outline-none font-bold" placeholder="0" />
                                </div>
  
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg flex items-center">
                <FileSpreadsheet className="mr-2 h-5 w-5 text-indigo-500" />
                Tinjauan Target KPI (Tabel)
              </CardTitle>
              <CardDescription>
                Tampilan ringkasan target KPI per tim dan per salesman.
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                showConfirm({
                  title: 'Unduh Berkas?',
                  message: `Apakah Anda ingin mengunduh berkas tabel tinjauan target?`,
                  confirmLabel: 'UNDUH',
                  cancelLabel: 'BATAL',
                  type: 'info',
                  onConfirm: () => {
                    const fileName = `Tinjauan_Target_KPI_${new Date().toISOString().split('T')[0]}.xlsx`;
                    const exportData: any[] = [];
                    groupedTargets.forEach(group => {
                          // Add Team Header
                          exportData.push({ 'Salesman \\ KPI': `TIM: ${group.teamName}`, isHeader: true });
                          
                          // Add Targets
                          group.targets.forEach((t: any) => {
                            exportData.push({
                              'Salesman \\ KPI': `${t.salesman_name} (${t.salesman_code})`,
                              'Omset All brand': t.target_omset_all_brand,
                              'Omset LCD': t.target_omset_lcd,
                              'Omset Redskull': t.target_omset_redskull,
                              'NOA 3C': t.target_co_3c,
                              'Hydrogel (pcs)': t.target_hydrogel_pcs,
                              'TG (pcs)': t.target_tg_pcs,
                              'NOO': t.target_new_customer,
                              'Idle': t.target_idle_customer,
                              'Mesin': t.target_co_mesin_vqm,
                              'CO TG': t.target_co_tg,
                              'CO >5jt': t.target_omset_5jt,
                              'Payment 3C': t.target_payment_3c,
                              'Payment 3C+LCD': t.target_payment_3c_lcd,
                              'Program Bulanan': t.target_program_bulanan,
                              'SPU': t.target_spu,
                              'Display': t.target_perbaikan_display,
                              'Spanduk': t.target_pemasangan_spanduk,
                              'Visit (%)': t.target_visit_customer
                            });
                          });
                          
                          // Add Team Total
                          exportData.push({
                            'Salesman \\ KPI': `TOTAL TARGET ${group.teamName}`,
                            'Omset All brand': group.totals.target_omset_all_brand,
                            'Omset LCD': group.totals.target_omset_lcd,
                            'Omset Redskull': group.totals.target_omset_redskull,
                            'NOA 3C': group.totals.target_co_3c,
                            'Hydrogel (pcs)': group.totals.target_hydrogel_pcs,
                            'TG (pcs)': group.totals.target_tg_pcs,
                            'NOO': group.totals.target_new_customer,
                            'Idle': group.totals.target_idle_customer,
                            'Mesin': group.totals.target_co_mesin_vqm,
                            'CO TG': group.totals.target_co_tg,
                            'CO >5jt': group.totals.target_omset_5jt,
                            'Payment 3C': group.totals.target_payment_3c,
                            'Payment 3C+LCD': group.totals.target_payment_3c_lcd,
                            'Program Bulanan': group.totals.target_program_bulanan,
                            'SPU': group.totals.target_spu,
                            'Display': group.totals.target_perbaikan_display,
                            'Spanduk': group.totals.target_pemasangan_spanduk,
                            'Visit (%)': group.totals.target_visit_customer
                          });
                          
                          // Empty row for spacing
                          exportData.push({});
                        });

                    const worksheet = XLSX.utils.json_to_sheet(exportData);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tinjauan_Target');
                    XLSX.writeFile(workbook, fileName);
                  }
                });
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Download Excel
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-[11px] text-left border-collapse border-slate-200">
                <thead className="sticky top-0 bg-slate-900 text-white z-10">
                  <tr>
                    <th className="px-3 py-3 border border-slate-700 min-w-[200px] sticky left-0 bg-slate-900 z-20">Slsman \ KPI</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Omset All (jt)</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Omset LCD (jt)</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Redskull (jt)</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">NOA 3C</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Hydro (pcs)</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">TG (pcs)</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">NOO</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Idle</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Mesin</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">CO TG</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">CO &gt;5jt</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Pymt 3C (jt)</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Pymt LCD (jt)</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Prog Bulanan</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">SPU</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Display</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Spanduk</th>
                    <th className="px-3 py-3 border border-slate-700 text-center">Visit (%)</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {groupedTargets.map((group, groupIdx) => {
                    const leader = group.targets.find(t => t.salesman_code === group.leaderCode);
                    const members = group.targets.filter(t => t.salesman_code !== group.leaderCode);
                    
                    return (
                      <React.Fragment key={groupIdx}>
                        {/* Team Header Row */}
                        <tr className="bg-slate-900 text-white">
                          <td colSpan={19} className="px-3 py-3 font-black uppercase tracking-widest text-[10px]">
                            TIM: {group.teamName}
                          </td>
                        </tr>

                        {/* Team Leader Section */}
                        {leader && (
                          <>
                            <tr className="bg-amber-50">
                              <td colSpan={19} className="px-3 py-1.5 border-y border-amber-200 text-[9px] font-black text-amber-700 uppercase tracking-tighter">
                                ★ TEAM LEADER
                              </td>
                            </tr>
                            <tr className="hover:bg-amber-100/50 transition-colors bg-amber-50/30">
                              <td className="px-3 py-2.5 border border-slate-100 font-bold sticky left-0 bg-amber-50 z-10">
                                <div className="flex flex-col">
                                  <span className="text-slate-800 leading-tight">{leader.salesman_name}</span>
                                  <span className="text-[9px] text-slate-400 font-mono tracking-tight">{leader.salesman_code}</span>
                                </div>
                              </td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{(leader.target_omset_all_brand / 1000000).toLocaleString('id-ID')}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{(leader.target_omset_lcd / 1000000).toLocaleString('id-ID')}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{(leader.target_omset_redskull / 1000000).toLocaleString('id-ID')}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_co_3c}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_hydrogel_pcs}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_tg_pcs}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_new_customer}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_idle_customer}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_co_mesin_vqm}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_co_tg}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_omset_5jt}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{(leader.target_payment_3c / 1000000).toLocaleString('id-ID')}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{(leader.target_payment_3c_lcd / 1000000).toLocaleString('id-ID')}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_program_bulanan}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_spu}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_perbaikan_display}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_pemasangan_spanduk}</td>
                              <td className="px-2 py-2 border border-slate-100 text-center font-mono">{leader.target_visit_customer}%</td>
                            </tr>
                          </>
                        )}

                        {/* Members Section */}
                        {members.length > 0 && (
                          <>
                            <tr className="bg-slate-50">
                              <td colSpan={19} className="px-3 py-1.5 border-y border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                ● ANGGOTA TIM
                              </td>
                            </tr>
                            {members.map((t, tIdx) => (
                              <tr key={tIdx} className="hover:bg-indigo-50/50 transition-colors">
                                <td className="px-3 py-2.5 border border-slate-100 font-bold sticky left-0 bg-white z-10">
                                  <div className="flex flex-col">
                                    <span className="text-slate-800 leading-tight">{t.salesman_name}</span>
                                    <span className="text-[9px] text-slate-400 font-mono tracking-tight">{t.salesman_code}</span>
                                  </div>
                                </td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{(t.target_omset_all_brand / 1000000).toLocaleString('id-ID')}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{(t.target_omset_lcd / 1000000).toLocaleString('id-ID')}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{(t.target_omset_redskull / 1000000).toLocaleString('id-ID')}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_co_3c}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_hydrogel_pcs}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_tg_pcs}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_new_customer}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_idle_customer}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_co_mesin_vqm}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_co_tg}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_omset_5jt}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{(t.target_payment_3c / 1000000).toLocaleString('id-ID')}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{(t.target_payment_3c_lcd / 1000000).toLocaleString('id-ID')}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_program_bulanan}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_spu}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_perbaikan_display}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_pemasangan_spanduk}</td>
                                <td className="px-2 py-2 border border-slate-100 text-center font-mono">{t.target_visit_customer}%</td>
                              </tr>
                            ))}
                          </>
                        )}
                        
                        {/* Total Group Row */}
                        <tr className="bg-indigo-600 text-white font-black">
                          <td className="px-3 py-2.5 border border-indigo-700 sticky left-0 bg-indigo-600 z-10 text-[10px] uppercase tracking-wider">TOTAL TARGET {group.teamName}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{(group.totals.target_omset_all_brand / 1000000).toLocaleString('id-ID')}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{(group.totals.target_omset_lcd / 1000000).toLocaleString('id-ID')}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{(group.totals.target_omset_redskull / 1000000).toLocaleString('id-ID')}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_co_3c}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_hydrogel_pcs}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_tg_pcs}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_new_customer}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_idle_customer}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_co_mesin_vqm}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_co_tg}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_omset_5jt}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{(group.totals.target_payment_3c / 1000000).toLocaleString('id-ID')}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{(group.totals.target_payment_3c_lcd / 1000000).toLocaleString('id-ID')}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_program_bulanan}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_spu}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_perbaikan_display}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_pemasangan_spanduk}</td>
                          <td className="px-2 py-2 border border-indigo-700 text-center font-mono">{group.totals.target_visit_customer.toFixed(1)}%</td>
                        </tr>
                        <tr className="h-4 bg-white"><td colSpan={19}></td></tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>

              </table>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <p className="text-[10px] text-slate-500 font-medium">
                * Angka dalam kolom (jt) adalah dalam jutaan Rupiah. Contoh: 100 = 100.000.000.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Deletion History Section - keep it below both views */}
      <Card className="bg-slate-50/50 border-slate-200">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-slate-500" />
                Riwayat Hapus (Data Terakhir)
              </CardTitle>
              <CardDescription className="text-[10px]">
                Data target yang baru saja dihapus dicatat di sini untuk keperluan pemulihan manual
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchDeletionLogs} disabled={isLoadingLogs}>
              {isLoadingLogs ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-t border-slate-100">
              <thead className="bg-slate-100/50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Nama Salesman</th>
                  <th className="px-4 py-3">Data Terhapus (JSON)</th>
                  <th className="px-4 py-3">Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {deletionLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs italic">Belum ada riwayat penghapusan.</td>
                  </tr>
                ) : (
                  deletionLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-[10px] text-slate-500 font-mono">
                        {new Date(log.deleted_at).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">
                        {log.deleted_data?.salesman_name || 'Tidak diketahui'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate text-[9px] font-mono bg-slate-50 p-1 rounded border overflow-hidden" title={JSON.stringify(log.deleted_data)}>
                          {JSON.stringify(log.deleted_data)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-400 font-bold uppercase">
                        {log.deleted_by}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Click outside helper for dropdown */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsDropdownOpen(false)}></div>
      )}

      {/* Mass Edit Modal */}
      <GenieModal
        isOpen={isMassEditOpen}
        onClose={() => setIsMassEditOpen(false)}
        title="Edit Target Masal"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Pilih KPI</label>
              <select 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={massEditField}
                onChange={(e) => setMassEditField(e.target.value)}
              >
                <option value="">-- Pilih KPI yang ingin diubah --</option>
                <option value="target_omset_all_brand">Target Omset All Brand (Rp)</option>
                <option value="target_omset_lcd">Target Omset LCD (Rp)</option>
                <option value="target_omset_redskull">Target Omset Redskull (Rp)</option>
                <option value="target_co_3c">Target NOA 3C (Toko)</option>
                <option value="target_hydrogel_pcs">Target Hydrogel (Pcs)</option>
                <option value="target_tg_pcs">Target TG (Pcs)</option>
                <option value="target_new_customer">Target NOO (Toko)</option>
                <option value="target_idle_customer">Target Idle (Toko)</option>
                <option value="target_co_mesin_vqm">Target CO Mesin (Toko)</option>
                <option value="target_co_tg">Target CO TG (Toko)</option>
                <option value="target_omset_5jt">Target Omset &gt; 5Jt (Toko)</option>
                <option value="target_payment_3c">Target Payment 3C (Rp)</option>
                <option value="target_program_bulanan">Program Bulanan</option>
                <option value="target_spu">Target SPU (SKU)</option>
                <option value="target_perbaikan_display">Target Perbaikan Display (Toko)</option>
                <option value="target_pemasangan_spanduk">Target Pemasangan Spanduk Stiker (Toko)</option>
                <option value="target_visit_customer">Target Visit Customer (%)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Nilai Target</label>
              <input 
                type="number" 
                value={massEditValue}
                onChange={(e) => setMassEditValue(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Masukkan nilai target untuk semua salesman..."
              />
            </div>
            <p className="text-xs text-slate-500">
              Aksi ini akan mengubah target terpilih untuk <strong>semua</strong> salesman pada list di atas. Jangan lupa tekan "Simpan Semua Target" setelahnya.
            </p>
          </div>
                <Button 
                  onClick={() => setIsMassEditOpen(false)} 
                  variant="ghost" 
                  className="text-slate-500 font-bold rounded-lg"
                >
                  Batal
                </Button>
                <Button 
                  onClick={handleMassEdit} 
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 font-bold shadow-lg transition-all active:scale-95"
                >
                  Terapkan Perubahan
                </Button>
        </div>
      </GenieModal>
    </div>
  );
}
