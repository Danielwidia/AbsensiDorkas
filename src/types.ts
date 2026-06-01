export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  facePhoto?: string; // Captured during registration
  faceID?: string; // Stored facial descriptor
  status: 'pending' | 'active';
}

export interface PresenceLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  type: 'in' | 'out' | 'leave';
  remarks?: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'valid' | 'invalid';
  photo: string;
}

export interface SchoolConfig {
  lat: number;
  lng: number;
  radius: number; // in meters
}
