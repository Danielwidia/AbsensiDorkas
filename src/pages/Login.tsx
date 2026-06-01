import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { 
  LogIn, 
  School, 
  UserCircle, 
  ShieldCheck, 
  UserPlus, 
  ArrowLeft, 
  Camera, 
  CameraIcon,
  ShieldAlert,
  KeyRound,
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchData, registerUser } from '../api';
import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login States
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register States
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'student' | 'teacher'>('student');
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [showIpConfig, setShowIpConfig] = useState(false);
  const [tempIp, setTempIp] = useState(localStorage.getItem('server_ip') || '');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL + '/tiny_face_detector'),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL + '/face_landmark_68'),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL + '/face_recognition'),
        ]);
        setIsModelsLoaded(true);
      } catch (err) {
        console.error("Gagal memuat model FaceID:", err);
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    setIsCameraActive(true);
    setError('');
    try {
      // Set atribut penting pada video element
      if (videoRef.current) {
        videoRef.current.setAttribute('autoplay', '');
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('muted', '');
        videoRef.current.muted = true;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
      } catch {
        // Fallback ke kamera apapun
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Tunggu video siap, dengan timeout fallback
        await new Promise<void>((resolve) => {
          if (!videoRef.current) return resolve();
          videoRef.current.onloadedmetadata = () => resolve();
          setTimeout(resolve, 2000);
        });

        try {
          await videoRef.current.play();
        } catch {
          videoRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      setError('Gagal mengakses kamera. Pastikan izin sudah diberikan di browser.');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      if (!isModelsLoaded) {
        setError('Model AI sedang dimuat, mohon tunggu sebentar...');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const detections = await faceapi.detectSingleFace(
          videoRef.current, 
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptor();

        if (!detections) {
          setError('Wajah tidak terdeteksi. Pastikan wajah terlihat jelas dan pencahayaan cukup.');
          setLoading(false);
          return;
        }

        const context = canvasRef.current.getContext('2d');
        if (context) {
          context.drawImage(videoRef.current, 0, 0, 400, 400);
          const data = canvasRef.current.toDataURL('image/jpeg');
          setFacePhoto(data);
          setFaceDescriptor(Array.from(detections.descriptor));
          
          // Stop camera
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          setIsCameraActive(false);
        }
      } catch (err) {
        setError('Terjadi kesalahan saat memproses wajah.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await fetchData();
      const allUsers: User[] = data.users || [];
      
      console.log("Data user dari server:", allUsers);

      // Cari berdasarkan username atau ID
      const found = allUsers.find(u => (u.username === loginId || u.id === loginId));

      if (found) {
        // Cek Password (jika user punya password di db)
        const passwordMatch = !found.password || found.password === loginPassword;
        
        if (passwordMatch) {
          if (found.status === 'pending') {
            setError('Akun Anda masih menunggu konfirmasi admin.');
          } else {
            onLogin(found);
          }
        } else {
          setError('Password yang Anda masukkan salah.');
        }
      } else {
        setError('Username atau ID tidak ditemukan.');
      }
    } catch (err) {
      setError('Gagal terhubung ke server. Periksa koneksi atau atur IP Server.');
    } finally {
      setLoading(false);
    }
  };

  const saveIp = () => {
    if (tempIp) {
      localStorage.setItem('server_ip', tempIp);
    } else {
      localStorage.removeItem('server_ip');
    }
    window.location.reload(); // Perlu reload agar API_BASE di api.ts terupdate
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facePhoto) {
      setError('Mohon rekam FaceID Anda terlebih dahulu.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await registerUser({
        name: regName,
        username: regUsername,
        password: regPassword,
        role: regRole,
        facePhoto: facePhoto,
        faceID: JSON.stringify(faceDescriptor)
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess('Pendaftaran berhasil! Mohon tunggu konfirmasi admin.');
        setTimeout(() => {
          setSuccess('');
          setIsRegister(false);
        }, 3000);
      }
    } catch (err) {
      setError('Gagal melakukan pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {!isRegister ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 border border-white/20 dark:border-slate-800 relative overflow-hidden"
            >
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 mb-4">
                  <School size={40} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold">Dorkas Presence</h1>
                <p className="text-slate-500 text-sm mt-2">Masuk untuk melakukan absensi</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-widest">Username</label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="Username atau ID"
                      value={loginId}
                      onChange={e => setLoginId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-widest">Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="space-y-2">
                    <p className="text-red-500 text-xs font-bold flex items-center gap-2 mt-2 ml-1"><ShieldAlert size={14} /> {error}</p>
                    <button 
                      type="button" 
                      onClick={() => setShowIpConfig(true)}
                      className="text-[10px] text-blue-600 font-black uppercase ml-1 hover:underline"
                    >
                      Atur IP Server Manual
                    </button>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full btn-primary py-4 mt-4">
                  {loading ? 'Memverifikasi...' : <><LogIn size={20} /> Masuk</>}
                </button>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                  <button type="button" onClick={() => setIsRegister(true)} className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2 mx-auto">
                    <UserPlus size={18} /> Belum punya akun? Daftar
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="register"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 border border-white/20 dark:border-slate-800"
            >
              <button 
                onClick={() => setIsRegister(false)}
                className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors"
              >
                <ArrowLeft size={18} /> Kembali
              </button>

              <h2 className="text-2xl font-bold mb-2">Daftar Akun Baru</h2>
              <p className="text-slate-500 text-sm mb-8 font-medium">Mohon lengkapi data diri Anda</p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nama Lengkap</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama Lengkap"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Username</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-blue-500"
                      placeholder="Username"
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
                    <input
                      type="password"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-blue-500"
                      placeholder="••••"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Status Pekerjaan / Pendidikan</label>
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setRegRole('student')}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${regRole === 'student' ? 'bg-blue-100 text-blue-600 border-2 border-blue-500' : 'bg-slate-50 text-slate-500 border-2 border-transparent'}`}
                    >
                      Siswa
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setRegRole('teacher')}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${regRole === 'teacher' ? 'bg-blue-100 text-blue-600 border-2 border-blue-500' : 'bg-slate-50 text-slate-500 border-2 border-transparent'}`}
                    >
                      Guru / Karyawan
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Pendaftaran Wajah (FaceID)</label>
                  <div className="mt-2 aspect-square w-full max-w-[200px] mx-auto bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden relative group">
                    {facePhoto ? (
                      <img src={facePhoto} className="w-full h-full object-cover" alt="FaceID Capture" />
                    ) : isCameraActive ? (
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Fingerprint size={48} className="mb-2 opacity-50" />
                        <p className="text-[10px] uppercase font-bold">Wajah Belum Direkam</p>
                      </div>
                    )}
                    
                    <div className="absolute inset-x-0 bottom-0 p-3 flex justify-center bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      {!facePhoto ? (
                        !isCameraActive ? (
                          <button type="button" onClick={startCamera} className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                             <Camera size={14} /> Aktifkan Kamera
                          </button>
                        ) : (
                          <button type="button" onClick={capturePhoto} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                             <CameraIcon size={14} /> Ambil Foto Wajah
                          </button>
                        )
                      ) : (
                        <button type="button" onClick={() => { setFacePhoto(null); startCamera(); }} className="bg-white text-red-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                           Ulangi Foto
                        </button>
                      )}
                    </div>
                  </div>
                  <canvas ref={canvasRef} className="hidden" width={400} height={400} />
                </div>

                {error && <p className="text-red-500 text-xs font-bold flex items-center gap-2 mt-2 ml-1"><ShieldAlert size={14} /> {error}</p>}
                {success && <p className="text-green-500 text-xs font-bold flex items-center gap-2 mt-2 ml-1"><ShieldCheck size={14} /> {success}</p>}

                <button type="submit" disabled={loading || !facePhoto} className="w-full btn-primary py-4 mt-4 shadow-lg shadow-blue-500/20">
                  {loading ? 'Mendaftar...' : <><UserPlus size={20} /> Daftar Akun</>}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* IP Config Modal */}
        <AnimatePresence>
          {showIpConfig && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} 
                animate={{ scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-2">Konfigurasi Server</h3>
                <p className="text-slate-500 text-xs mb-6">Masukkan alamat IP laptop server (terlihat di Dashboard Admin)</p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">IP Address Server</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: 192.168.1.133"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500"
                      value={tempIp}
                      onChange={e => setTempIp(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowIpConfig(false)} className="flex-1 py-3 text-xs font-bold text-slate-500">Batal</button>
                    <button onClick={saveIp} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20">Simpan & Restart</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;
