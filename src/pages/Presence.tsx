import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, PresenceLog, SchoolConfig } from '../types';
import { 
  Camera, 
  MapPin, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Scan,
  ShieldCheck,
  RefreshCcw,
  Calendar,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { fetchData, saveLog } from '../api';
import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master';

interface PresenceProps {
  user: User;
}

const Presence: React.FC<PresenceProps> = ({ user }) => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'location' | 'face' | 'form' | 'finish'>('location');
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>({
    lat: -6.1754,
    lng: 106.8272,
    radius: 100
  });
  const [remarks, setRemarks] = useState('');
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);

  // Load Face Models
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

  // Load Config & GPS
  useEffect(() => {
    const init = async () => {
      if (type === 'leave') {
        setStep('form');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchData();
        setSchoolConfig(data.config);

        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setLocation(currentLoc);
              const dist = calculateDistance(
                currentLoc.lat, currentLoc.lng,
                data.config.lat, data.config.lng
              );
              setDistance(dist);
              setLoading(false);
            },
            (err) => {
              setError("Gagal mendapatkan lokasi. Pastikan izin GPS aktif.");
              setLoading(false);
            },
            { enableHighAccuracy: true }
          );
        }
      } catch (err) {
        setError("Gagal terhubung ke server.");
        setLoading(false);
      }
    };
    init();
  }, [type]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; 
  };

  const startCamera = async () => {
    setStep('face');
  };

  const enableCamera = useCallback(async () => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setError('Kamera membutuhkan koneksi aman (HTTPS).');
      return;
    }

    if (step === 'face' && videoRef.current) {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setCameraActive(true);
          };
        }
      } catch (err) {
        setError('Gagal mengakses kamera. Silakan berikan izin kamera.');
      }
    }
  }, [step]);

  useEffect(() => {
    enableCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enableCamera]);

  const handleCapture = async () => {
    if (!videoRef.current || !isModelsLoaded) return;

    setScanning(true);
    setError(null);
    
    try {
      const detections = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detections) {
        setError("Wajah tidak terdeteksi. Dekatkan wajah ke kamera.");
        setScanning(false);
        return;
      }

      // Verifikasi Identitas
      if (user.faceID) {
        try {
          const storedDescriptor = new Float32Array(JSON.parse(user.faceID));
          const distanceMatch = faceapi.euclideanDistance(detections.descriptor, storedDescriptor);
          
          if (distanceMatch > 0.6) {
             setError("Wajah tidak cocok dengan data pendaftaran!");
             setScanning(false);
             return;
          }
        } catch (desErr) {
          console.warn("Descriptor match failed, continuing...");
        }
      }

      setScanning(false);
      setSuccess(true);
      setStep('finish');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#10b981', '#ffffff']
      });

      const newLog: PresenceLog = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
        type: (type as any) || 'in',
        remarks: '',
        location: location || { lat: 0, lng: 0 },
        status: (distance || 0) <= schoolConfig.radius ? 'valid' : 'invalid',
        photo: '' 
      };

      await saveLog(newLog);
    } catch (err) {
      console.error(err);
      setError("Kesalahan memproses FaceID.");
      setScanning(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setError("Mohon isi keterangan izin Anda.");
      return;
    }

    setLoading(true);
    try {
      const newLog: PresenceLog = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
        type: 'leave',
        remarks: remarks,
        location: location || { lat: 0, lng: 0 },
        status: 'valid', // Izin selalu dianggap valid/disetujui
        photo: ''
      };

      await saveLog(newLog);
      setSuccess(true);
      setStep('finish');
      confetti({
        particleCount: 100,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setError("Gagal mengirim permohonan izin.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Menyiapkan Sistem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-8">
      <div className="max-w-xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
           <button onClick={() => navigate('/')} className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft />
           </button>
           <h1 className="text-xl font-bold capitalize">Absensi {type === 'in' ? 'Masuk' : type === 'out' ? 'Pulang' : 'Izin'}</h1>
        </header>

        <AnimatePresence mode="wait">
          {step === 'location' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-xl border border-white/20"
            >
               <div className="flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${distance !== null && distance <= schoolConfig.radius ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <MapPin size={40} />
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2">Verifikasi Lokasi</h2>
                  <p className="text-slate-500 mb-8">Sistem mendeteksi jarak Anda dengan sekolah</p>

                  <div className="w-full space-y-4 mb-8">
                    <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <span className="text-sm font-medium text-slate-500">Jarak Anda</span>
                      <span className={`text-lg font-black ${distance !== null && distance <= schoolConfig.radius ? 'text-green-600' : 'text-red-600'}`}>
                        {distance !== null ? `${Math.round(distance)} Meter` : 'Mendeteksi...'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <span className="text-sm font-medium text-slate-500">Batas Aman</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">{schoolConfig.radius} Meter</span>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold mb-6 flex items-center gap-2">
                       <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  <button 
                    disabled={distance === null}
                    onClick={startCamera}
                    className="w-full btn-primary py-4"
                  >
                    Lanjut ke FaceID <ArrowLeft className="rotate-180 ml-2" />
                  </button>
               </div>
            </motion.div>
          )}

          {step === 'face' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-white/20 overflow-hidden"
            >
               <div className="flex flex-col items-center">
                  <div className="w-full aspect-square max-w-[400px] bg-slate-100 rounded-[2rem] overflow-hidden relative border-4 border-slate-50">
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover" 
                      playsInline 
                      muted 
                    />
                    
                    {scanning && (
                      <div className="absolute inset-0 z-10">
                        <div className="w-full h-1 bg-blue-500 absolute animate-scan"></div>
                        <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                           <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                        </div>
                      </div>
                    )}

                    {!cameraActive && !error && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6 text-center">
                         <Camera className="text-white mb-4 animate-bounce" size={48} />
                         <p className="text-white font-bold text-sm mb-4">Mohon Izinkan & Aktifkan Kamera</p>
                         <button onClick={enableCamera} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl">
                            Aktifkan Kamera Sekarang
                         </button>
                      </div>
                    )}

                    {error && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/90 backdrop-blur-sm p-6 text-center text-white">
                         <AlertCircle size={48} className="mb-4" />
                         <p className="font-bold text-sm mb-4">{error}</p>
                         <button onClick={enableCamera} className="bg-white text-red-600 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest">
                            Coba Lagi
                         </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 text-center">
                     <h3 className="text-2xl font-bold mb-2">Verifikasi Wajah</h3>
                     <p className="text-slate-500 text-sm mb-8">Hadapkan wajah Anda ke arah kamera</p>
                     
                     <div className="flex gap-4">
                       <button 
                        onClick={() => setStep('location')} 
                        className="btn-secondary px-8 py-4"
                        disabled={scanning}
                       >
                         Batal
                       </button>
                       <button 
                        onClick={handleCapture}
                        disabled={!cameraActive || scanning || !isModelsLoaded}
                        className="btn-primary flex-1 py-4 shadow-xl shadow-blue-500/30"
                       >
                         {scanning ? 'Memeriksa...' : !isModelsLoaded ? 'Memuat AI...' : <><Scan size={20} /> Konfirmasi Kehadiran</>}
                       </button>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {step === 'form' && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }}
               className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-xl"
            >
               <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mb-6">
                    <Calendar size={40} />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Detail Izin / Sakit</h2>
                  <p className="text-slate-500 mb-8 text-sm font-medium">Mohon berikan alasan yang valid untuk pengajuan ini.</p>
                  
                  <form onSubmit={handleSubmitLeave} className="w-full space-y-6">
                    <div className="text-left space-y-2">
                       <label className="text-xs font-bold text-slate-400 ml-2 uppercase tracking-widest">Alasan / Keterangan</label>
                       <textarea 
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-3xl p-6 h-40 focus:ring-2 focus:ring-orange-500 shadow-inner"
                        placeholder="Contoh: Sakit flu dan butuh istirahat..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        required
                       ></textarea>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                      </div>
                    )}

                    <div className="flex gap-4">
                       <button type="button" onClick={() => navigate('/')} className="btn-secondary px-8 py-4">Batal</button>
                       <button type="submit" disabled={loading} className="btn-primary flex-1 py-4 !bg-orange-600 hover:!bg-orange-700 shadow-xl shadow-orange-600/20">
                         {loading ? 'Mengirim...' : 'Kirim Permohonan'}
                       </button>
                    </div>
                  </form>
               </div>
            </motion.div>
          )}

          {step === 'finish' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 shadow-2xl text-center border-4 border-green-500/20"
            >
               <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-500/40">
                  <ShieldCheck size={50} className="text-white" />
               </div>
               <h2 className="text-3xl font-black mb-2">Selesai!</h2>
               <p className="text-slate-500 mb-10 font-bold">Data absensi Anda telah berhasil dicatat oleh sistem pusat.</p>
               <button onClick={() => navigate('/')} className="w-full btn-primary py-4 !bg-green-600 hover:!bg-green-700 shadow-xl shadow-green-600/20">
                  Kembali ke Beranda
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Presence;
