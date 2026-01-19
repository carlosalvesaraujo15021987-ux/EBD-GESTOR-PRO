
import { Student, Teacher, ClassRoom, AttendanceRecord, ChurchSettings, QuarterlyLesson, WallPost, ChurchEvent, User, ThemePalette } from '../types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  STUDENTS: 'ebd_students',
  TEACHERS: 'ebd_teachers',
  CLASSES: 'ebd_classes',
  ATTENDANCE: 'ebd_attendance',
  SETTINGS: 'ebd_settings',
  LESSONS: 'ebd_lessons',
  POSTS: 'ebd_posts',
  LAST_SEEN_MURAL: 'ebd_last_seen_mural',
  EVENTS: 'ebd_events',
  USERS: 'ebd_users',
  SESSION: 'ebd_session_user',
  AGENDA_BANNER: 'ebd_agenda_banner',
  THEME: 'ebd_theme',
  PALETTE: 'ebd_palette'
};

const APP_METADATA = {
  name: "EBD Gestor Pro",
  version: "2.1.0"
};

const initialSettings: ChurchSettings = {
  churchName: 'ADMSJP - Assembleia de Deus Ministerio São Jose dos Pinhais',
  address: 'Rua Joao Maria Goes, 161 Jd Brasil - São Jose dos Pinhais PR',
  themePalette: 'blue',
  leadership: {
    pastorPresidente: 'Pr. Ival Teodoro da Silva',
    dirigentes: 'Pr. Marcelo Fonseca',
    superintendentes: 'Pr. Habib Assunção Dias',
    secretarios: 'Milton Correia',
    tesoureiro: 'Ronei A. Santos'
  }
};

const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  name: 'Administrador EBD',
  email: 'admin@ebd.com',
  password: 'admin123',
  role: 'admin',
  token: 'MASTER',
  active: true,
  createdAt: new Date().toISOString()
};

const safeJsonParse = (key: string, fallback: any = null) => {
    const val = localStorage.getItem(key);
    if (val === null) return fallback;
    try {
        return JSON.parse(val);
    } catch (e) {
        return val;
    }
};

const safeJsonSet = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const StorageService = {
  getClasses: (): ClassRoom[] => safeJsonParse(STORAGE_KEYS.CLASSES, []),
  addClass: (cls: ClassRoom) => {
    const data = StorageService.getClasses();
    const idx = data.findIndex(c => c.id === cls.id);
    if (idx >= 0) data[idx] = cls; else data.push(cls);
    safeJsonSet(STORAGE_KEYS.CLASSES, data);
  },
  deleteClass: (id: string) => {
    safeJsonSet(STORAGE_KEYS.CLASSES, StorageService.getClasses().filter(c => c.id !== id));
  },
  
  getTeachers: (): Teacher[] => safeJsonParse(STORAGE_KEYS.TEACHERS, []),
  addTeacher: (teacher: Teacher) => {
    const data = StorageService.getTeachers();
    const idx = data.findIndex(t => t.id === teacher.id);
    if (idx >= 0) data[idx] = teacher; else data.push(teacher);
    safeJsonSet(STORAGE_KEYS.TEACHERS, data);
  },
  deleteTeacher: (id: string) => {
    safeJsonSet(STORAGE_KEYS.TEACHERS, StorageService.getTeachers().filter(t => t.id !== id));
  },

  getStudents: (): Student[] => safeJsonParse(STORAGE_KEYS.STUDENTS, []),
  saveStudent: (student: Student) => {
    const data = StorageService.getStudents();
    const idx = data.findIndex(s => s.id === student.id);
    if (idx >= 0) data[idx] = student; else data.push(student);
    safeJsonSet(STORAGE_KEYS.STUDENTS, data);
  },
  deleteStudent: (id: string) => {
    safeJsonSet(STORAGE_KEYS.STUDENTS, StorageService.getStudents().filter(s => s.id !== id));
  },

  getAttendance: (): AttendanceRecord[] => safeJsonParse(STORAGE_KEYS.ATTENDANCE, []),
  saveAttendance: (record: AttendanceRecord) => {
    const data = StorageService.getAttendance();
    const idx = data.findIndex(r => r.date === record.date && r.classId === record.classId);
    if (idx >= 0) data[idx] = record; else data.push(record);
    safeJsonSet(STORAGE_KEYS.ATTENDANCE, data);
  },

  getSettings: (): ChurchSettings => safeJsonParse(STORAGE_KEYS.SETTINGS, initialSettings),
  saveSettings: (settings: ChurchSettings) => safeJsonSet(STORAGE_KEYS.SETTINGS, settings),

  getLessons: (): QuarterlyLesson[] => safeJsonParse(STORAGE_KEYS.LESSONS, []),
  saveLesson: (lesson: QuarterlyLesson) => {
    const data = StorageService.getLessons();
    const idx = data.findIndex(l => l.id === lesson.id);
    if (idx >= 0) data[idx] = lesson; else data.push(lesson);
    safeJsonSet(STORAGE_KEYS.LESSONS, data);
  },
  deleteLesson: (id: string) => {
    safeJsonSet(STORAGE_KEYS.LESSONS, StorageService.getLessons().filter(l => l.id !== id));
  },

  getPosts: (): WallPost[] => safeJsonParse(STORAGE_KEYS.POSTS, []),
  savePost: (post: WallPost) => {
    const data = StorageService.getPosts();
    const idx = data.findIndex(p => p.id === post.id);
    if (idx >= 0) data[idx] = post; else data.unshift(post);
    safeJsonSet(STORAGE_KEYS.POSTS, data);
  },
  deletePost: (id: string) => {
    safeJsonSet(STORAGE_KEYS.POSTS, StorageService.getPosts().filter(p => p.id !== id));
  },

  setLastSeenMural: () => {
    localStorage.setItem(STORAGE_KEYS.LAST_SEEN_MURAL, new Date().toISOString());
  },
  getLastSeenMural: (): string => {
    return localStorage.getItem(STORAGE_KEYS.LAST_SEEN_MURAL) || new Date(0).toISOString();
  },

  getEvents: (): ChurchEvent[] => safeJsonParse(STORAGE_KEYS.EVENTS, []),
  saveEvent: (event: ChurchEvent) => {
    const data = StorageService.getEvents();
    const idx = data.findIndex(e => e.id === event.id);
    if (idx >= 0) data[idx] = event; else data.push(event);
    safeJsonSet(STORAGE_KEYS.EVENTS, data);
  },
  deleteEvent: (id: string) => {
    safeJsonSet(STORAGE_KEYS.EVENTS, StorageService.getEvents().filter(e => e.id !== id));
  },

  getAgendaBanner: (): string | null => safeJsonParse(STORAGE_KEYS.AGENDA_BANNER, null),
  saveAgendaBanner: (url: string) => safeJsonSet(STORAGE_KEYS.AGENDA_BANNER, url),
  deleteAgendaBanner: () => localStorage.removeItem(STORAGE_KEYS.AGENDA_BANNER),

  getUsers: (): User[] => {
    const users = safeJsonParse(STORAGE_KEYS.USERS, []);
    if (users.length === 0) {
        safeJsonSet(STORAGE_KEYS.USERS, [DEFAULT_ADMIN]);
        return [DEFAULT_ADMIN];
    }
    return users;
  },
  saveUser: (user: User) => {
    const users = StorageService.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user; else users.push(user);
    safeJsonSet(STORAGE_KEYS.USERS, users);
  },
  deleteUser: (id: string) => {
    safeJsonSet(STORAGE_KEYS.USERS, StorageService.getUsers().filter(u => u.id !== id));
  },

  validateToken: (token: string): User | null => {
    const users = StorageService.getUsers();
    return users.find(u => u.token === token) || null;
  },

  login: (email: string, pass: string): User | null => {
      const users = StorageService.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass && u.active);
      if (user) {
          safeJsonSet(STORAGE_KEYS.SESSION, user);
          return user;
      }
      return null;
  },
  logout: () => localStorage.removeItem(STORAGE_KEYS.SESSION),
  getCurrentUser: (): User | null => safeJsonParse(STORAGE_KEYS.SESSION, null),

  getTheme: (): string => localStorage.getItem(STORAGE_KEYS.THEME) || 'light',
  setTheme: (theme: string) => localStorage.setItem(STORAGE_KEYS.THEME, theme),

  getPalette: (): ThemePalette => (localStorage.getItem(STORAGE_KEYS.PALETTE) as ThemePalette) || 'blue',
  setPalette: (palette: ThemePalette) => localStorage.setItem(STORAGE_KEYS.PALETTE, palette),

  exportAllData: (): string => {
    const data: any = { metadata: { ...APP_METADATA, exportDate: new Date().toISOString() }, content: {} };
    Object.entries(STORAGE_KEYS).forEach(([_, key]) => {
      const val = localStorage.getItem(key);
      if (val) data.content[key] = safeJsonParse(key);
    });
    return JSON.stringify(data, null, 2);
  },

  importAllData: (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (!data || !data.content) throw new Error('Formato de backup inválido.');
      Object.entries(data.content).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
      window.location.reload();
    } catch (e) {
      throw new Error('Erro ao restaurar dados: ' + (e as Error).message);
    }
  },

  // --- MÉTODOS SUPABASE (Nuvem) ---
  
  pushToCloud: async (): Promise<{ success: boolean; message: string }> => {
    const user = StorageService.getCurrentUser();
    if (!user) return { success: false, message: 'Usuário não autenticado.' };

    try {
      const payload = StorageService.exportAllData();
      
      const { error } = await supabase
        .from('ebd_backups')
        .upsert({ 
          email: user.email.toLowerCase(), 
          payload: JSON.parse(payload),
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (error) throw error;
      return { success: true, message: 'Dados sincronizados com sucesso na nuvem!' };
    } catch (e: any) {
      console.error('Supabase Sync Error:', e);
      return { success: false, message: 'Erro ao sincronizar: ' + (e.message || 'Verifique se a tabela ebd_backups existe no seu Supabase.') };
    }
  },

  pullFromCloud: async (): Promise<{ success: boolean; message: string }> => {
    const user = StorageService.getCurrentUser();
    if (!user) return { success: false, message: 'Usuário não autenticado.' };

    try {
      const { data, error } = await supabase
        .from('ebd_backups')
        .select('payload')
        .eq('email', user.email.toLowerCase())
        .single();

      if (error) throw error;
      if (!data) return { success: false, message: 'Nenhum backup encontrado na nuvem para este usuário.' };

      StorageService.importAllData(JSON.stringify(data.payload));
      return { success: true, message: 'Dados restaurados da nuvem com sucesso!' };
    } catch (e: any) {
      console.error('Supabase Restore Error:', e);
      return { success: false, message: 'Erro ao restaurar: ' + (e.message || 'Verifique se a tabela ebd_backups existe no seu Supabase.') };
    }
  }
};
