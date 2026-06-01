import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Settings, 
  BarChart3, 
  Plus, 
  Search, 
  Download, 
  MoreVertical, 
  ShieldCheck, 
  XCircle, 
  Check, 
  Save, 
  AlertCircle,
  ArrowLeft,
  Trash2,
  Edit,
  Clock,
  Calendar,
  MapPin,
  Map as MapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchData, saveUsers, saveSchoolConfig, approveUserApi, deleteLogApi } from '../api';
import { User, PresenceLog, SchoolConfig } from '../types';
import * as XLSX from 'xlsx';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<PresenceLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>({
    lat: -6.1754,
    lng: 106.8272,
    radius: 100
  });
  const [serverIp, setServerIp] = useState<string>('Detecting...');

  const getServerInfo = async () => {
    try {
      const res = await fetch('/api/server-info');
      const data = await res.json();
      setServerIp(data.ip);
    } catch (e) {
      setServerIp('Unable to detect');
    }
  };

  const exportToExcel = () => {
    const tableData = filteredLogs.map(log => ({
      'Nama User': log.userName,
      'ID User': log.userId,
      'Waktu': new Date(log.timestamp).toLocaleString('id-ID'),
      'Status GPS': log.type === 'leave' ? 'Disetujui' : (log.status === 'valid' ? 'Valid (Dalam Radius)' : 'Invalid (Luar Radius)'),
      'Type': log.type === 'leave' ? 'Izin' : (log.type === 'out' ? 'Pulang' : 'Masuk'),
      'Keterangan': log.remarks || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    const filterName = filterRole === 'all' ? 'Semua' : (filterRole === 'teacher' ? 'Guru' : 'Siswa');
    XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan ${filterName}`);
    XLSX.writeFile(workbook, `Laporan_Absensi_${filterName}_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`);
  };

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'config' | 'stats' | 'approval'>('logs');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'student' });
  const [saveStatus, setSaveStatus] = useState(false);
  const [filterRole, setFilterRole] = useState<'all' | 'teacher' | 'student'>('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    try {
      const data = await fetchData();
      setLogs([...data.logs].reverse());
      setUsers(data.users);
      setSchoolConfig(data.config);
    } catch (error) {
      console.error("Failed to load data from server", error);
    }
  };

  useEffect(() => {
    loadData();
    getServerInfo();
  }, [activeTab]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.id && newUser.name) {
      const updated = [...users, { ...newUser, status: 'active' } as User];
      await saveUsers(updated);
      setUsers(updated);
      setNewUser({ role: 'student' });
      setShowAddUser(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updated = users.map(u => u.id === editingUser.id ? editingUser : u);
      await saveUsers(updated);
      setUsers(updated);
      setEditingUser(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (confirm('Hapus user ini secara permanen?')) {
      const updated = users.filter(u => u.id !== id);
      await saveUsers(updated);
      setUsers(updated);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (confirm('Hapus riwayat absensi ini?')) {
      await deleteLogApi(id);
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const approveUser = async (id: string) => {
    await approveUserApi(id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'active' } as User : u));
  };

  const handleSaveConfig = async () => {
    await saveSchoolConfig(schoolConfig);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  };

  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp).toISOString().split('T')[0];
    const userRole = users.find(u => u.id === log.userId)?.role || 'student';
    
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) || log.userId.includes(searchTerm);
    const matchesRole = filterRole === 'all' || userRole === filterRole;
    
    const matchesDate = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
    
    return matchesSearch && matchesRole && matchesDate;
  });

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col sticky top-0 lg:h-screen z-20">
        <div className="p-6 lg:p-8 flex items-center justify-between lg:justify-start gap-3">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">D</div>
             <h2 className="font-extrabold text-xl tracking-tight leading-none">DORKAS <br/><span className="text-[10px] font-semibold text-blue-600 uppercase">Administrator</span></h2>
           </div>
           <button onClick={() => navigate('/')} className="lg:hidden p-2 text-slate-500"><ArrowLeft /></button>
        </div>

        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible px-4 py-2 lg:py-0 space-x-2 lg:space-x-0 lg:space-y-2 no-scrollbar">
          {[
            { id: 'logs', icon: FileText, label: 'Laporan' },
            { id: 'users', icon: Users, label: 'User' },
            { id: 'approval', icon: ShieldCheck, label: 'Persetujuan', badge: users.filter(u => u.status === 'pending').length },
            { id: 'config', icon: MapIcon, label: 'Lokasi' },
            { id: 'stats', icon: BarChart3, label: 'Statistik' }
          ].map((item: any) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-shrink-0 lg:w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} />
                <span className="text-sm">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse ml-2 font-bold whitespace-nowrap">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="hidden lg:flex p-6 mt-auto">
           <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors text-sm">
             <ArrowLeft size={18} /> Kembali ke Dashboard
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white capitalize">
              {activeTab === 'logs' ? 'Laporan Kehadiran' : activeTab === 'users' ? 'Manajemen User' : activeTab === 'config' ? 'Pengaturan Lokasi' : activeTab === 'approval' ? 'Menunggu Persetujuan' : 'Statistik'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-500 uppercase text-[10px] font-bold tracking-widest border-r border-slate-300 dark:border-slate-700 pr-2">Pusat Data Sekolah Kristen Dorkas</p>
              <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800">
                <span className="text-[10px] font-black text-blue-600">SERVER IP: {serverIp}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'users' && (
              <button 
                onClick={() => setShowAddUser(true)}
                className="btn-primary px-4 py-2.5 text-sm"
              >
                <Plus size={18} /> Tambah User
              </button>
            )}
            <button 
              onClick={exportToExcel}
              className="btn-secondary px-4 py-2.5 text-sm"
            >
              <Download size={18} /> Export Excel
            </button>
          </div>
        </header>

        {activeTab === 'logs' && (
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'teacher', label: 'Guru' },
                { id: 'student', label: 'Siswa' }
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setFilterRole(r.id as any)}
                  className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
                    filterRole === r.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm text-slate-500">
               <div className="flex items-center gap-2">
                 <span className="text-[9px] font-bold uppercase text-slate-400">Dari</span>
                 <input 
                   type="date" 
                   value={startDate}
                   onChange={(e) => setStartDate(e.target.value)}
                   className="bg-transparent border-none text-[10px] font-bold outline-none cursor-pointer"
                 />
               </div>
               <div className="w-px h-4 bg-slate-200"></div>
               <div className="flex items-center gap-2">
                 <span className="text-[9px] font-bold uppercase text-slate-400">Sampai</span>
                 <input 
                   type="date" 
                   value={endDate}
                   onChange={(e) => setEndDate(e.target.value)}
                   className="bg-transparent border-none text-[10px] font-bold outline-none cursor-pointer"
                 />
               </div>
               {(startDate || endDate) && (
                 <button onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:text-red-500 transition-colors ml-1">
                   <XCircle size={14} />
                 </button>
               )}
            </div>

            <div className="flex-1 relative min-w-[200px]">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input 
                 type="text" 
                 placeholder="Cari nama atau ID..."
                 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full py-2.5 pl-10 pr-4 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'logs' && (
            <motion.div 
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Waktu</th>
                      <th className="px-6 py-4">Tipe</th>
                      <th className="px-6 py-4">Status GPS</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{log.userName.charAt(0)}</div>
                            <div>
                               <p className="font-bold text-sm text-slate-900 dark:text-white">{log.userName}</p>
                               <p className="text-[10px] text-slate-500">ID: {log.userId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold">{new Date(log.timestamp).toLocaleTimeString('id-id', {hour: '2-digit', minute:'2-digit'})}</p>
                          <p className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleDateString('id-id')}</p>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col gap-1">
                             <span className={`px-3 py-1 rounded-full text-[10px] font-bold w-fit ${
                               log.type === 'leave' ? 'bg-orange-100 text-orange-600' : 
                               log.type === 'out' ? 'bg-indigo-100 text-indigo-600' : 
                               'bg-blue-100 text-blue-600'
                             }`}>
                               {log.type === 'leave' ? 'IZIN' : log.type === 'out' ? 'PULANG' : 'MASUK'}
                             </span>
                             {log.remarks && (
                               <p className="text-[10px] text-slate-500 italic max-w-[150px] truncate" title={log.remarks}>
                                 "{log.remarks}"
                               </p>
                             )}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`flex items-center gap-1 text-xs font-bold ${log.status === 'valid' ? 'text-green-500' : 'text-red-500'}`}>
                             {log.type === 'leave' ? <ShieldCheck size={14} className="text-orange-500" /> : (log.status === 'valid' ? <ShieldCheck size={14} /> : <XCircle size={14} />)} 
                             {log.type === 'leave' ? 'Disetujui' : (log.status === 'valid' ? 'Valid' : 'Diluar Radius')}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteLog(log.id)} className="text-slate-400 hover:text-red-500 p-2 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                      <th className="px-6 py-5">Nama User</th>
                      <th className="px-6 py-5">ID / Nomor Induk</th>
                      <th className="px-6 py-5">Role</th>
                      <th className="px-6 py-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm">{u.name}</td>
                        <td className="px-6 py-4 text-sm font-mono">{u.id}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase">{u.role}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-400">
                           <div className="flex justify-end gap-1">
                             <button onClick={() => setEditingUser(u)} className="p-2 hover:text-blue-600 transition-colors"><Edit size={18} /></button>
                             <button onClick={() => deleteUser(u.id)} className="p-2 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'approval' && (
            <motion.div 
              key="approval"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                      <th className="px-6 py-5">Calon Personel</th>
                      <th className="px-6 py-5">ID / Induk</th>
                      <th className="px-6 py-5">Role</th>
                      <th className="px-6 py-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.filter(u => u.status === 'pending').map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 py-6">
                           <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                           <p className="text-[10px] text-slate-500 italic mt-1">Mendaftar melalui HP</p>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm">{u.id}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold uppercase">{u.role}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => approveUser(u.id)} className="btn-primary px-4 py-2 text-xs font-bold shadow-lg shadow-blue-500/20">Setujui Akun</button>
                        </td>
                      </tr>
                    ))}
                    {users.filter(u => u.status === 'pending').length === 0 && (
                      <tr><td colSpan={4} className="p-10 text-center text-slate-400 italic">Tidak ada pendaftar baru.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div 
               key="config"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="max-w-2xl bg-white dark:bg-slate-900 p-8 lg:p-12 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 mx-auto"
            >
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <MapIcon size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Titik Koordinat Sekolah</h3>
                    <p className="text-slate-500 text-sm">Tentukan lokasi absen pusat</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Latitude</label>
                    <input 
                      type="number" 
                      value={schoolConfig.lat}
                      onChange={(e) => setSchoolConfig({...schoolConfig, lat: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Longitude</label>
                    <input 
                      type="number" 
                      value={schoolConfig.lng}
                      onChange={(e) => setSchoolConfig({...schoolConfig, lng: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Radius Aman (Meter)</label>
                    <input 
                      type="number" 
                      value={schoolConfig.radius}
                      onChange={(e) => setSchoolConfig({...schoolConfig, radius: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveConfig}
                  className="w-full btn-primary py-4"
                >
                  {saveStatus ? <><Check size={20} /> Tersimpan ke Server!</> : <><Save size={20} /> Simpan Perubahan Pusat</>}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div 
               key="stats"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-8"
            >
              <h3 className="text-xl font-bold mb-4">Ringkasan Kehadiran Keseluruhan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="p-1 rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-indigo-600">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.4rem] h-full">
                       <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Absen Masuk</p>
                       <p className="text-4xl font-black">{logs.filter(l => l.type === 'in').length}</p>
                    </div>
                 </div>
                 <div className="p-1 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-purple-600">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.4rem] h-full">
                       <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Absen Pulang</p>
                       <p className="text-4xl font-black">{logs.filter(l => l.type === 'out').length}</p>
                    </div>
                 </div>
                 <div className="p-1 rounded-[2.5rem] bg-gradient-to-br from-orange-400 to-red-500">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.4rem] h-full">
                       <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Izin / Sakit</p>
                       <p className="text-4xl font-black">{logs.filter(l => l.type === 'leave').length}</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal Add/Edit User */}
      <AnimatePresence>
        {(showAddUser || editingUser) && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">{editingUser ? 'Edit Personel' : 'Tambah Personel Baru'}</h3>
              <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    value={editingUser ? editingUser.name : newUser.name || ''}
                    onChange={(e) => editingUser ? setEditingUser({...editingUser, name: e.target.value}) : setNewUser({...newUser, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">ID / Nomor Induk</label>
                  <input 
                    type="text" 
                    required
                    disabled={!!editingUser}
                    value={editingUser ? editingUser.id : newUser.id || ''}
                    onChange={(e) => setNewUser({...newUser, id: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Role / Peran</label>
                  <select 
                    value={editingUser ? editingUser.role : newUser.role}
                    onChange={(e) => editingUser ? setEditingUser({...editingUser, role: e.target.value as any}) : setNewUser({...newUser, role: e.target.value as any})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="student">Siswa</option>
                    <option value="teacher">Guru</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowAddUser(false); setEditingUser(null); }} className="flex-1 btn-secondary py-4 uppercase text-xs font-bold">Batal</button>
                  <button type="submit" className="flex-1 btn-primary py-4 uppercase text-xs font-bold">Simpan</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
