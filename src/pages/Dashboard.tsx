import React, { useState, useEffect } from 'react';
import { User, PresenceLog } from '../types';
import { 
  LogOut, 
  MapPin, 
  User as UserIcon, 
  Clock, 
  History, 
  Settings,
  ShieldCheck,
  Calendar,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchData } from '../api';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentLogs, setRecentLogs] = useState<PresenceLog[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const loadLogs = async () => {
      try {
        const data = await fetchData();
        const allLogs: PresenceLog[] = data.logs;
        setRecentLogs(allLogs.filter(log => log.userId === user.id).slice(-5).reverse());
      } catch (e) {
        console.error("Dashboard failed to load central logs", e);
      }
    };

    loadLogs();
    return () => clearInterval(timer);
  }, [user.id]);

  const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">D</div>
            <div>
              <h1 className="text-lg font-bold leading-none">Dorkas</h1>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Terkoneksi Pusat</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className={user.role === 'admin' ? "p-2 text-slate-500 hover:text-blue-600 transition-colors" : "hidden"}>
              <Settings size={22} />
            </button>
            <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><LogOut size={22} /></button>
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
              <UserIcon size={20} className="text-slate-400" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white overflow-hidden shadow-2xl shadow-blue-500/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-blue-100 font-medium mb-1">Selamat Datang,</p>
            <h2 className="text-3xl font-bold mb-6">{user.name}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-1.5 text-blue-100 text-[9px] font-bold mb-1 uppercase tracking-wider"><Clock size={12} /> Jam</div>
                <div className="text-lg font-black font-mono tracking-tighter truncate">{timeString}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-1.5 text-blue-100 text-[9px] font-bold mb-1 uppercase tracking-wider"><Calendar size={12} /> Tanggal</div>
                <div className="text-[11px] font-bold leading-tight truncate">{dateString}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <button 
                onClick={() => navigate('/presence/in')} 
                className="bg-white text-blue-600 hover:bg-blue-50 font-bold p-6 rounded-3xl transition-all shadow-xl flex flex-col items-center gap-3 active:scale-95 group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MapPin size={28} />
                </div>
                <span>Absen Masuk</span>
              </button>

              <button 
                onClick={() => navigate('/presence/out')} 
                className="bg-white text-indigo-600 hover:bg-slate-50 font-bold p-6 rounded-3xl transition-all shadow-xl flex flex-col items-center gap-3 active:scale-95 group"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock size={28} />
                </div>
                <span>Absen Pulang</span>
              </button>

              <button 
                onClick={() => navigate('/presence/leave')} 
                className="bg-white text-orange-600 hover:bg-orange-50 font-bold p-6 rounded-3xl transition-all shadow-xl flex flex-col items-center gap-3 active:scale-95 group"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar size={28} />
                </div>
                <span>Izin / Sakit</span>
              </button>
            </div>
          </div>
        </motion.div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Aktivitas Terkini (Server)</h3>
          </div>
          <div className="space-y-4">
            {recentLogs.length > 0 ? recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {log.type === 'in' ? <LogIn size={18} /> : <LogOutIcon size={18} />}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Absen {log.type === 'in' ? 'Masuk' : 'Pulang'}</p>
                  <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleTimeString('id-ID')} • Dorkas Center</p>
                </div>
                <div className={log.status === 'valid' ? "text-green-500" : "text-red-500"}><ShieldCheck size={20} /></div>
              </div>
            )) : <div className="text-center py-8 text-slate-400 italic">Belum ada aktivitas di server.</div>}
          </div>
        </div>
      </main>
    </div>
  );
};

const LogIn = ({ size, className = "" }: { size: number, className?: string }) => <div className={className}><ChevronRight size={size} /></div>;
const LogOutIcon = ({ size, className = "" }: { size: number, className?: string }) => <div className={className}><ArrowLeft size={size} /></div>;

export default Dashboard;
