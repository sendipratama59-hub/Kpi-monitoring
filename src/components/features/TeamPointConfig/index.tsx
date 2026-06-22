import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Loader2, 
  UserPlus, 
  UserMinus, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Briefcase,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAlert } from '../../ui/AlertModal';
import { motion, AnimatePresence } from 'motion/react';
import { GenieModal } from '../../ui/GenieModal';

export function TeamPointConfig() {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<'teams' | 'eligibility'>('teams');
  const [isLoading, setIsLoading] = useState(true);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  // Form State for new team
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState('');
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all salesmen
      const { data: smData } = await supabase.from('salesman_customer').select('salesman_code, salesman_name');
      const { data: smKpiData } = await supabase.from('salesman_kpi').select('salesman_code, salesman_name');
      
      const map = new Map();
      smData?.forEach(s => map.set(s.salesman_code, s.salesman_name));
      smKpiData?.forEach(s => map.set(s.salesman_code, s.salesman_name));
      
      const allSm = Array.from(map.entries()).map(([code, name]) => ({ salesman_code: code, salesman_name: name || '' }));
      setSalesmen(allSm.sort((a, b) => a.salesman_name.localeCompare(b.salesman_name)));

      // Fetch Teams
      const { data: teamsData } = await supabase.from('kpi_teams').select('*');
      const teamsList = teamsData || [];
      setTeams(teamsList);
      
      if (teamsList.length > 0) {
        setExpandedTeamId(teamsList[0].id);
      }

      // Fetch Team Members
      const { data: membersData } = await supabase.from('kpi_team_members').select('*');
      setTeamMembers(membersData || []);

      // Fetch Salesman Configs (Eligibility)
      const { data: configData } = await supabase.from('kpi_salesman_configs').select('*');
      setConfigs(configData || []);

    } catch (err) {
      console.error('Error fetching config data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamName || !newTeamLeader) {
      showAlert('Nama Tim dan Leader harus diisi', 'warning');
      return;
    }

    setIsSavingTeam(true);
    try {
      const { data, error } = await supabase.from('kpi_teams').insert({
        team_name: newTeamName,
        leader_code: newTeamLeader
      }).select();

      if (error) throw error;
      
      setTeams([...teams, data[0]]);
      setIsAddingTeam(false);
      setNewTeamName('');
      setNewTeamLeader('');
      showAlert('Tim berhasil ditambahkan!', 'success');
    } catch (err: any) {
      showAlert(err.message, 'error');
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    showConfirm({
      message: 'Hapus tim ini dan semua keanggotaannya?',
      type: 'error',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('kpi_teams').delete().eq('id', id);
          if (error) throw error;
          setTeams(teams.filter(t => t.id !== id));
          setTeamMembers(teamMembers.filter(m => m.team_id !== id));
          showAlert('Tim berhasil dihapus', 'success');
        } catch (err: any) {
          showAlert(err.message, 'error');
        }
      }
    });
  };

  const toggleMember = async (teamId: string, salesmanCode: string) => {
    const existing = teamMembers.find(m => m.team_id === teamId && m.salesman_code === salesmanCode);
    
    try {
      if (existing) {
        const { error } = await supabase.from('kpi_team_members').delete().eq('id', existing.id);
        if (error) throw error;
        setTeamMembers(teamMembers.filter(m => m.id !== existing.id));
      } else {
        const { data, error } = await supabase.from('kpi_team_members').insert({
          team_id: teamId,
          salesman_code: salesmanCode
        }).select();
        if (error) throw error;
        setTeamMembers([...teamMembers, data[0]]);
        showAlert('Anggota berhasil ditambahkan', 'success');
      }
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  const toggleEligibility = async (salesmanCode: string) => {
    const existing = configs.find(c => c.salesman_code === salesmanCode);
    const newStatus = existing ? !existing.is_eligible : false; // Default to false if we are adding for the first time? No, let's treat existence as state.

    try {
      if (existing) {
        const { error } = await supabase.from('kpi_salesman_configs').update({
          is_eligible: !existing.is_eligible
        }).eq('salesman_code', salesmanCode);
        
        if (error) throw error;
        setConfigs(configs.map(c => c.salesman_code === salesmanCode ? { ...c, is_eligible: !c.is_eligible } : c));
      } else {
        // If doesn't exist, it's currently eligible by default (implied), so hitting toggle means making it INELIGIBLE (false)
        const { data, error } = await supabase.from('kpi_salesman_configs').insert({
          salesman_code: salesmanCode,
          is_eligible: false
        }).select();
        
        if (error) throw error;
        setConfigs([...configs, data[0]]);
      }
      showAlert('Status sistem poin berhasil diupdate', 'success');
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  const filteredSalesmen = salesmen.filter(s => 
    s.salesman_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.salesman_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
        <p>Memuat konfigurasi tim...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            Konfigurasi Tim Poin KPI
          </h1>
          <p className="text-slate-500 text-sm mt-1">Kelola struktur tim leader dan tentukan siapa yang mengikuti sistem poin.</p>
        </div>
        
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'teams' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Manajemen Tim
          </button>
          <button 
            onClick={() => setActiveTab('eligibility')}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'eligibility' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Sistem Poin (Aktif)
          </button>
        </div>
      </div>

      {activeTab === 'teams' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GenieModal
            isOpen={isAddingTeam}
            onClose={() => setIsAddingTeam(false)}
            title="Tambah Tim Baru"
            subtitle="KPI TEAM CONFIGURATION"
            maxWidth="max-w-md"
          >
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5 tracking-wider">Nama Tim</label>
                <input 
                  type="text" 
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full text-sm border border-slate-200 p-2.5 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-700"
                  placeholder="Contoh: Tim A"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5 tracking-wider">Team Leader</label>
                <select 
                  value={newTeamLeader}
                  onChange={(e) => setNewTeamLeader(e.target.value)}
                  className="w-full text-sm border border-slate-200 p-2.5 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-slate-700"
                >
                  <option value="">-- Pilih Leader --</option>
                  {salesmen.map(s => (
                    <option key={s.salesman_code} value={s.salesman_code}>{s.salesman_name} ({s.salesman_code})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" className="flex-1 font-bold rounded-xl" onClick={() => setIsAddingTeam(false)}>Batal</Button>
                <Button className="flex-1 font-black rounded-xl shadow-lg bg-slate-900" onClick={handleAddTeam} disabled={isSavingTeam}>
                  {isSavingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SIMPAN TIM'}
                </Button>
              </div>
            </div>
          </GenieModal>
          {/* Left Column: Team List */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Daftar Tim</CardTitle>
                  <CardDescription className="text-[10px]">Total {teams.length} Tim Aktif</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsAddingTeam(true)} className="h-8">
                  <Plus className="w-3 h-3 mr-1" /> Baru
                </Button>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-2">
                  {teams.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs italic">Belum ada tim yang dibuat.</div>
                  ) : (
                    teams.map(team => {
                      const leader = salesmen.find(s => s.salesman_code === team.leader_code);
                      const membersCount = teamMembers.filter(m => m.team_id === team.id).length;
                      const isExpanded = expandedTeamId === team.id;
                      
                      return (
                        <div 
                          key={team.id} 
                          className={`p-3 border rounded-lg transition-all cursor-pointer group hover:shadow-md ${isExpanded ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' : 'bg-white hover:border-indigo-200'}`}
                          onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className={`font-bold text-sm transition-colors ${isExpanded ? 'text-indigo-700' : 'text-slate-800 group-hover:text-indigo-600'}`}>{team.team_name}</h4>
                              <p className="text-[10px] text-slate-500 font-medium">Leader: {leader?.salesman_name || team.leader_code}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                  {membersCount} Anggota
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTeam(team.id);
                              }}
                              className="text-slate-300 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Member Management */}
          <div className="lg:col-span-2 space-y-4">
            {teams.length === 0 ? (
              <div className="h-full flex items-center justify-center p-12 bg-white border border-dashed rounded-xl border-slate-200">
                <div className="text-center">
                  <Users className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Buat tim terlebih dahulu untuk mengelola anggota.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {teams.map(team => {
                  const isExpanded = expandedTeamId === team.id;
                  return (
                    <Card key={team.id} className={`overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-indigo-500/20 border-indigo-200' : 'border-slate-200 opacity-80 hover:opacity-100'}`}>
                      <CardHeader 
                        className={`cursor-pointer transition-colors py-3 ${isExpanded ? 'bg-indigo-50/80 border-b border-indigo-100' : 'bg-slate-50 hover:bg-slate-100'}`}
                        onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-white shadow-sm' : 'bg-indigo-100'}`}>
                              <Users className="w-4 h-4 text-indigo-600" />
                            </div>
                            <CardTitle className="text-base font-bold">{team.team_name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-[10px] font-black text-indigo-600 uppercase">Leader: {salesmen.find(s => s.salesman_code === team.leader_code)?.salesman_name || team.leader_code}</div>
                            <div className="p-1 rounded-full hover:bg-slate-200/50 transition-colors">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <CardContent className="p-4 border-t border-slate-100">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Member Selection */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Pilih Anggota Tim</h5>
                                  </div>
                                  
                                  <div className="relative mb-3">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                    <input 
                                      type="text" 
                                      placeholder="Cari salesman..." 
                                      value={searchTerm}
                                      onChange={(e) => setSearchTerm(e.target.value)}
                                      className="w-full pl-9 pr-3 py-2 text-xs border rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                  </div>

                                  <div className="max-h-64 overflow-y-auto border rounded-xl bg-slate-50 p-2 custom-scrollbar shadow-inner">
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {filteredSalesmen.map(s => {
                                        const isMember = teamMembers.some(m => m.team_id === team.id && m.salesman_code === s.salesman_code);
                                        // Is member of OTHER team?
                                        const otherTeam = teams.find(t => t.id !== team.id && teamMembers.some(m => m.team_id === t.id && m.salesman_code === s.salesman_code));
                                        
                                        return (
                                          <button
                                            key={s.salesman_code}
                                            onClick={() => toggleMember(team.id, s.salesman_code)}
                                            disabled={!!otherTeam}
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all active:scale-95 ${isMember ? 'bg-indigo-600 text-white shadow-md' : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-100'} ${otherTeam ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                                          >
                                            <div>
                                              <div className={`text-xs font-bold leading-none mb-1 ${isMember ? 'text-white' : 'text-slate-800'}`}>{s.salesman_name}</div>
                                              <div className={`text-[9px] font-bold ${isMember ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {s.salesman_code} {otherTeam && `(TIM: ${otherTeam.team_name})`}
                                              </div>
                                            </div>
                                            {isMember ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4 text-indigo-500" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>

                                {/* Member Result */}
                                <div>
                                  <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">Anggota Saat Ini ({teamMembers.filter(m => m.team_id === team.id).length})</h5>
                                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                                    {teamMembers.filter(m => m.team_id === team.id).length === 0 ? (
                                      <div className="text-center py-10 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                        <Users className="w-8 h-8 text-slate-200 mx-auto mb-1" />
                                        <p className="text-[10px] text-slate-400 italic font-medium">Klik '+' pada list sebelah kiri untuk menambahkan anggota</p>
                                      </div>
                                    ) : (
                                      teamMembers.filter(m => m.team_id === team.id).map(m => {
                                        const sm = salesmen.find(s => s.salesman_code === m.salesman_code);
                                        return (
                                          <motion.div 
                                            initial={{ x: -10, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            key={m.id} 
                                            className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl hover:shadow-sm transition-all"
                                          >
                                            <div>
                                              <div className="text-xs font-black text-emerald-800 leading-none mb-1 uppercase tracking-tight">{sm?.salesman_name || m.salesman_code}</div>
                                              <div className="text-[9px] font-bold text-emerald-600/70">{m.salesman_code}</div>
                                            </div>
                                            <button 
                                              onClick={() => toggleMember(team.id, m.salesman_code)}
                                              className="p-2 text-emerald-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-90"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </motion.div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Daftar Peserta Sistem Poin KPI
              </CardTitle>
              <CardDescription className="text-xs">Hanya salesman yang aktif di bawah ini yang akan mendapatkan poin/denda di laporan KPI.</CardDescription>
            </div>
            
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari salesman..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-[10px] uppercase tracking-wider">Salesman</th>
                    <th className="px-6 py-3 text-[10px] uppercase tracking-wider">Kode</th>
                    <th className="px-6 py-3 text-[10px] uppercase tracking-wider">Status Tim</th>
                    <th className="px-6 py-3 text-[10px] uppercase tracking-wider">Status Sistem Poin</th>
                    <th className="px-6 py-3 text-[10px] uppercase tracking-wider text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalesmen.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic bg-slate-50/50">
                        Tidak ada data salesman ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesmen.map(s => {
                      const config = configs.find(c => c.salesman_code === s.salesman_code);
                      const isEligible = config ? config.is_eligible : true; // Default to TRUE if no config yet
                      const team = teams.find(t => teamMembers.some(m => m.team_id === t.id && m.salesman_code === s.salesman_code));
                      const isLeader = teams.find(t => t.leader_code === s.salesman_code);

                      return (
                        <tr key={s.salesman_code} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{s.salesman_name}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.salesman_code}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {isLeader && (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black w-fit uppercase border border-amber-200">
                                  <ShieldCheck className="w-3 h-3" /> Team Leader
                                </span>
                              )}
                              {team ? (
                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black w-fit uppercase border border-indigo-200">
                                  <Briefcase className="w-3 h-3" /> Tim: {team.team_name}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium italic">Belum masuk tim</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`flex items-center gap-2 ${isEligible ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {isEligible ? (
                                <><CheckCircle2 className="w-4 h-4" /> <span className="text-xs font-bold font-black">MENGIKUTI POIN</span></>
                              ) : (
                                <><AlertCircle className="w-4 h-4" /> <span className="text-xs font-bold font-black">TIDAK ADA POIN/DENDA</span></>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button 
                              size="sm" 
                              variant={isEligible ? "outline" : "default"}
                              className={`h-8 font-black text-[10px] uppercase tracking-wide transition-all ${isEligible ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                              onClick={() => toggleEligibility(s.salesman_code)}
                            >
                              {isEligible ? 'Non-Aktifkan Poin' : 'Aktifkan Memakai Poin'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
