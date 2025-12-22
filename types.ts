
export interface Student {
  id: string;
  name: string;
  birthDate: string;
  classId: string;
  phone?: string;
  active: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  classIds: string[]; // Can teach multiple classes
  phone: string;
  email?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  ageRange: string;
  mainTeacherId?: string;
  room?: string;
}

export interface AttendanceRecord {
  id: string; // Unique ID for the record (date + class)
  date: string;
  classId: string;
  presentStudentIds: string[];
  justifications?: { [studentId: string]: string }; // Map of studentId -> justification text
  visitorsCount: number;
  biblesCount: number;
  magazinesCount: number;
  offeringValue: number;
  notes?: string;
}

// For the AI Lesson Planner
export interface LessonPlan {
  topic: string;
  content: string;
}

export interface ChurchSettings {
  churchName: string;
  address: string;
  logoUrl?: string;
  loginBackgroundUrl?: string; // New field for login cover image
  certificateLogoUrl?: string; // Specific logo for certificates
  leadership: {
    pastorPresidente: string;
    dirigentes: string;
    superintendentes: string;
    secretarios: string;
    tesoureiro: string;
  };
}

export interface QuarterlyLesson {
  id: string;
  title: string; // ex: Adultos - Lição 1
  category: string; // Adultos, Jovens, etc
  goldenText: string;
  dailyReading: string;
  pdfUrl?: string; // Simulated link
  dateAdded: string;
}

export interface WallPost {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'update' | 'notice';
  imageUrl?: string;
}

export interface ChurchEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  description?: string;
  location: string;
  scope: 'local' | 'campo'; // Local Church or Region (ADMSJP)
  category: 'confraternizacao' | 'simposio' | 'culto' | 'reuniao' | 'outro';
}

// --- Authentication Types ---
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional because initially it might just be a token invite
  role: UserRole;
  token: string; // The invite/first-access token
  active: boolean; // True after they set a password
  createdAt: string;
}
