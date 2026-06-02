import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

// Hanya jalankan Supabase jika URL mengandung ".supabase.co" (URL asli)
if (supabaseUrl && supabaseUrl.includes('.supabase.co')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Koneksi Supabase aktif.");
  } catch (e) {
    console.error("Gagal inisialisasi Supabase:", e.message);
  }
} else {
  console.log("Menggunakan database lokal (db.json).");
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve Static Files from Vite Build
app.use(express.static(path.join(__dirname, 'dist')));

const DB_PATH = path.join(__dirname, 'db.json');

// Initialize DB if not exists
if (!fs.existsSync(DB_PATH)) {
  const initialData = {
    logs: [],
    users: [
      { id: 'admin', username: 'admin', password: '123', name: 'Administrator', role: 'admin', status: 'active' },
    ],
    config: {
      lat: -6.1754,
      lng: 106.8272,
      radius: 100
    }
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

// Helper to read/write (Fallback for Local)
const getDataLocal = () => {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    return { logs: [], users: [], config: {} };
  }
};
const saveDataLocal = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// API Routes
app.get('/api/data', async (req, res) => {
  try {
    if (supabase) {
      let { data: users } = await supabase.from('users').select('*');
      let { data: logs } = await supabase.from('logs').select('*').order('timestamp', { ascending: false });
      let { data: config } = await supabase.from('config').select('*').single();

      // Auto-Setup: Jika tabel users kosong, isi dengan Admin default
      if (!users || users.length === 0) {
        console.log("Database Supabase kosong, melakukan inisialisasi awal...");
        const initialAdmin = { id: 'admin', username: 'admin', password: '123', name: 'Administrator', role: 'admin', status: 'active' };
        const { data: newUsers } = await supabase.from('users').insert([initialAdmin]).select();
        users = newUsers || [initialAdmin];
        const initialConfig = { id: 1, lat: -6.1754, lng: 106.8272, radius: 100 };
        await supabase.from('config').upsert(initialConfig);
        config = initialConfig;
      }

      // Gabungkan dengan user lokal (db.json) yang belum ada di Supabase
      const localData = getDataLocal();
      if (localData.users && localData.users.length > 0) {
        const supabaseIds = new Set((users || []).map(u => u.id));
        const localOnly = localData.users.filter(u => !supabaseIds.has(u.id));
        if (localOnly.length > 0) {
          users = [...(users || []), ...localOnly];
        }
      }

      // Gabungkan dengan log lokal (db.json)
      if (localData.logs && localData.logs.length > 0) {
        const supabaseLogIds = new Set((logs || []).map(l => l.id));
        const localLogsOnly = localData.logs.filter(l => !supabaseLogIds.has(l.id));
        if (localLogsOnly.length > 0) {
          logs = [...(logs || []), ...localLogsOnly];
          // Urutkan ulang berdasarkan waktu terbaru
          logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      }

      return res.json({
        users: users || [],
        logs: logs || [],
        config: config || { lat: -6.1754, lng: 106.8272, radius: 100 }
      });
    }
  } catch (e) {
    console.error("Supabase error, falling back to local:", e);
  }
  res.json(getDataLocal());
});

app.get('/api/server-info', async (req, res) => {
  const nets = os.networkInterfaces();
  let serverIp = 'localhost';
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        serverIp = net.address;
        break;
      }
    }
  }
  res.json({ ip: serverIp });
});

app.post('/api/register', async (req, res) => {
  try {
    const newUser = {
      ...req.body,
      id: req.body.username, 
      status: 'pending',
      role: req.body.role || 'student'
    };

    if (!newUser.username) {
      return res.status(400).json({ error: 'Username wajib diisi' });
    }

    if (supabase) {
      // Coba simpan dengan facePhoto
      const { error } = await supabase.from('users').insert([newUser]);
      if (error) {
        console.error("Supabase Insert Error:", JSON.stringify(error));
        
        // Jika error karena kolom facePhoto tidak ada, coba tanpa foto
        if (error.code === 'PGRST204' || error.message?.includes('facePhoto')) {
          const { facePhoto, ...userWithoutPhoto } = newUser;
          const { error: error2 } = await supabase.from('users').insert([userWithoutPhoto]);
          if (error2) {
            console.error("Supabase Insert Error (without photo):", JSON.stringify(error2));
            // Fallback ke lokal jika Supabase masih error
            const data = getDataLocal();
            if (!data.users) data.users = [];
            if (data.users.find(u => u.username === newUser.username)) {
              return res.status(400).json({ error: 'Username sudah digunakan' });
            }
            data.users.push(newUser);
            saveDataLocal(data);
            return res.status(201).json({ success: true, note: 'Saved locally (Supabase schema issue)' });
          }
          return res.status(201).json({ success: true });
        }
        return res.status(500).json({ error: error.message });
      }
      return res.status(201).json({ success: true });
    }

    const data = getDataLocal();
    // Pastikan data.users adalah array
    if (!data.users) data.users = [];
    
    if (data.users.find(u => u.username === newUser.username)) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }
    
    data.users.push(newUser);
    saveDataLocal(data);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("CRITICAL REGISTRATION ERROR:", err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Endpoint khusus untuk konfirmasi akun (simpan ke KEDUA storage)
app.post('/api/users/:id/approve', async (req, res) => {
  const userId = req.params.id;
  try {
    // 1. Update di Supabase jika aktif
    if (supabase) {
      const { error } = await supabase.from('users').update({ status: 'active' }).eq('id', userId);
      if (error) console.error("Supabase approve error:", error);
    }

    // 2. SELALU update di lokal juga (penting agar tidak muncul lagi saat merge)
    const data = getDataLocal();
    if (data.users) {
      data.users = data.users.map(u => u.id === userId ? { ...u, status: 'active' } : u);
      saveDataLocal(data);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  const newLog = req.body;
  if (supabase) {
    const { error } = await supabase.from('logs').insert([newLog]);
    if (!error) return res.status(201).json(newLog);
  }
  const data = getDataLocal();
  data.logs.push(newLog);
  saveDataLocal(data);
  res.status(201).json(newLog);
});

app.delete('/api/logs/:id', async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    const { error } = await supabase.from('logs').delete().eq('id', id);
  }
  const data = getDataLocal();
  data.logs = data.logs.filter(l => l.id !== id);
  saveDataLocal(data);
  res.json({ success: true });
});

app.post('/api/users', async (req, res) => {
  if (supabase) {
    const { error } = await supabase.from('users').upsert(req.body);
    if (!error) return res.json({ success: true });
  }
  const data = getDataLocal();
  data.users = req.body;
  saveDataLocal(data);
  res.json({ success: true });
});

app.post('/api/config', async (req, res) => {
  if (supabase) {
    const { error } = await supabase.from('config').upsert({ id: 1, ...req.body });
    if (!error) return res.json({ success: true });
  }
  const data = getDataLocal();
  data.config = req.body;
  saveDataLocal(data);
  res.json({ success: true });
});

// For any other request, serve index.html (SPA routing)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `Rute API ${req.path} tidak ditemukan. Harap restart server.` });
  }
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Build folder "dist" tidak ditemukan. Jalankan "npm run build" terlebih dahulu.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di port ${PORT}`);
});
