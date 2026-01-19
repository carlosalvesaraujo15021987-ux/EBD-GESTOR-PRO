
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
  registeredByTeacherId?: string; 
  presentStudentIds: string[];
  justifications?: { [studentId: string]: string }; 
  visitorsCount: number;
  biblesCount: number;
  magazinesCount: number;
  offeringValue: number;
  notes?: string;
}

export interface LessonPlan {
  topic: string;
  content: string;
}

export type ThemePalette = 'blue' | 'emerald' | 'violet' | 'rose' | 'amber' | 'indigo' | 'teal' | 'slate';

export interface ChurchSettings {
  churchName: string;
  address: string;
  logoUrl?: string;
  loginBackgroundUrl?: string; 
  certificateLogoUrl?: string; 
  themePalette?: ThemePalette;
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
  title: string; 
  category: string; 
  goldenText: string;
  dailyReading: string;
  pdfUrl?: string; 
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
  date: string; 
  time?: string; 
  description?: string;
  location: string;
  scope: 'local' | 'campo'; 
  category: 'confraternizacao' | 'simposio' | 'culto' | 'reuniao' | 'outro';
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; 
  role: UserRole;
  token: string; 
  active: boolean; 
  createdAt: string;
}