import { PresenceLog, SchoolConfig, User } from './types';

const getApiBase = () => {
  const savedIp = localStorage.getItem('server_ip');
  if (savedIp) return `http://${savedIp}:3001/api`;
  return '/api';
};

const API_BASE = getApiBase();

export const fetchData = async () => {
  const res = await fetch(`${API_BASE}/data`);
  return res.json();
};

export const saveLog = async (log: PresenceLog) => {
  const res = await fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log)
  });
  return res.json();
};

export const deleteLogApi = async (id: string) => {
  const res = await fetch(`${API_BASE}/logs/${id}`, {
    method: 'DELETE'
  });
  return res.json();
};

export const saveUsers = async (users: User[]) => {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users)
  });
  return res.json();
};

export const saveSchoolConfig = async (config: SchoolConfig) => {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return res.json();
};

export const registerUser = async (user: any) => {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  return res.json();
};

export const approveUserApi = async (userId: string) => {
  const res = await fetch(`${API_BASE}/users/${userId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
};
