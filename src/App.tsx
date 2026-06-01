import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Presence from './pages/Presence';
import Admin from './pages/Admin';
import { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dorkas_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('dorkas_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dorkas_user');
    }
  }, [user]);

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} 
          />
          <Route 
            path="/" 
            element={user ? <Dashboard user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/presence/:type" 
            element={user ? <Presence user={user} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin" 
            element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
