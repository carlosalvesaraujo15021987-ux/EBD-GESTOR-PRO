
import { Student, Teacher, ClassRoom, AttendanceRecord, ChurchSettings, QuarterlyLesson, WallPost, ChurchEvent, User } from '../types';

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
  THEME: 'ebd_theme'
};

// Seed Data
const initialClasses: ClassRoom[] = [
  { id: 'c1', name: 'Jardim de Infância', ageRange: '4-6 anos', room: 'Sala 1', mainTeacherId: 't1' },
  { id: 'c2', name: 'Primários', ageRange: '7-9 anos', room: 'Sala 2', mainTeacherId: 't2' },
  { id: 'c3', name: 'Jovens', ageRange: '18-25 anos', room: 'Salão B', mainTeacherId: 't3' },
  { id: 'c4', name: 'Adultos', ageRange: '26+ anos', room: 'Nave Principal', mainTeacherId: 't4' },
];

const initialTeachers: Teacher[] = [
  { id: 't1', name: 'Ana Silva', classIds: ['c1'], phone: '(11) 99999-1111', email: 'ana@email.com' },
  { id: 't2', name: 'Carlos Santos', classIds: ['c2'], phone: '(11) 99999-2222' },
  { id: 't3', name: 'Pr. Marcos', classIds: ['c3', 'c4'], phone: '(11) 99999-3333' },
  { id: 't4', name: 'Dra. Cláudia', classIds: ['c4'], phone: '(11) 99999-4444' },
];

const initialStudents: Student[] = [
  { id: 's1', name: 'Lucas Oliveira', birthDate: '2018-05-10', classId: 'c1', active: true },
  { id: 's2', name: 'Sofia Lima', birthDate: '2019-02-15', classId: 'c1', active: true },
  { id: 's3', name: 'Pedro Henrique', birthDate: '2015-08-20', classId: 'c2', active: true },
  { id: 's4', name: 'Mariana Costa', birthDate: '2016-11-05', classId: 'c2', active: true },
  { id: 's5', name: 'João Victor', birthDate: '2000-01-01', classId: 'c3', active: true },
  { id: 's6', name: 'Fernanda Souza', birthDate: '1985-06-12', classId: 'c4', active: true },
  { id: 's7', name: 'Roberto Almeida', birthDate: '1970-03-30', classId: 'c4', active: false },
];

const initialAttendance: AttendanceRecord[] = [
  {
    id: 'att1',
    date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    classId: 'c1',
    presentStudentIds: ['s1', 's2'],
    visitorsCount: 1,
    biblesCount: 2,
    magazinesCount: 2,
    offeringValue: 15.50,
    notes: 'Aula sobre a Arca de Noé'
  }
];

const initialSettings: ChurchSettings = {
  churchName: 'ADMSJP - Assembleia de Deus Ministerio São Jose dos Pinhais',
  address: 'Rua Joao Maria Goes, 161 Jd Brasil - São Jose dos Pinhais PR',
  leadership: {
    pastorPresidente: 'Pr. Ival Teodoro da Silva e Irma Cida Alves',
    dirigentes: 'Pr. Marcelo Fonseca e Alecia Fonseca',
    superintendentes: 'Pr. Habib Assunção Dias e Sueli Raquel Camilo Dias',
    secretarios: 'Milton Correia e Dc. Carlos Alves de Araujo',
    tesoureiro: 'Ronei A. Santos'
  }
};

const initialAdmin: User = {
    id: 'admin_1',
    name: 'Administrador',
    email: 'admin@ebd.com',
    password: 'admin123',
    role: 'admin',
    token: 'ADMIN1',
    active: true,
    createdAt: new Date().toISOString()
};

/**
 * Função utilitária para parsing seguro de JSON.
 * Se o valor não for um JSON válido (ex: data pura "2025-02-18"), 
 * retorna o valor original como string, evitando o SyntaxError.
 */
const safeJsonParse = (key: string, fallback: any = null) => {
    const val = localStorage.getItem(key);
    if (val === null) return fallback;
    
    const trimmed = val.trim();
    // JSON strings start with specific characters. 
    // This pre-check prevents the parser from exploding on date strings like 2025-02-18
    const isJsonLike = (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        trimmed === 'true' || trimmed === 'false' || trimmed === 'null' ||
        /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)
    );

    if (!isJsonLike) return val;

    try {
        return JSON.parse(val);
    } catch (e) {
        return val;
    }
};

const safeJsonSet = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const initStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
    safeJsonSet(STORAGE_KEYS.CLASSES, initialClasses);
    safeJsonSet(STORAGE_KEYS.TEACHERS, initialTeachers);
    safeJsonSet(STORAGE_KEYS.STUDENTS, initialStudents);
    safeJsonSet(STORAGE_KEYS.ATTENDANCE, initialAttendance);
    safeJsonSet(STORAGE_KEYS.SETTINGS, initialSettings);
    safeJsonSet(STORAGE_KEYS.LESSONS, []);
    safeJsonSet(STORAGE_KEYS.POSTS, []);
    safeJsonSet(STORAGE_KEYS.EVENTS, []);
  }

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      safeJsonSet(STORAGE_KEYS.USERS, [initialAdmin]);
  }
};

initStorage();

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
  saveSettings: (settings: ChurchSettings) => {
    safeJsonSet(STORAGE_KEYS.SETTINGS, settings);
  },

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

  getLastSeenMural: (): string => safeJsonParse(STORAGE_KEYS.LAST_SEEN_MURAL, '1970-01-01T00:00:00.000Z'),
  setLastSeenMural: (dateStr?: string) => {
    safeJsonSet(STORAGE_KEYS.LAST_SEEN_MURAL, dateStr || new Date().toISOString());
  },

  getUsers: (): User[] => safeJsonParse(STORAGE_KEYS.USERS, []),
  saveUser: (user: User) => {
    const users = StorageService.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user; else users.push(user);
    safeJsonSet(STORAGE_KEYS.USERS, users);
  },
  deleteUser: (id: string) => {
     safeJsonSet(STORAGE_KEYS.USERS, StorageService.getUsers().filter(u => u.id !== id));
  },

  login: (email: string, pass: string): User | null => {
      const users = StorageService.getUsers();
      const user = users.find(u => u.email === email && u.password === pass && u.active);
      if (user) {
          safeJsonSet(STORAGE_KEYS.SESSION, user);
          return user;
      }
      return null;
  },

  logout: () => localStorage.removeItem(STORAGE_KEYS.SESSION),
  getCurrentUser: (): User | null => safeJsonParse(STORAGE_KEYS.SESSION, null),
  validateToken: (token: string): User | null => StorageService.getUsers().find(u => u.token === token) || null,

  exportAllData: (): string => {
    const backup: Record<string, any> = {};
    Object.values(STORAGE_KEYS).forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          backup[key] = parsed;
        } catch (e) {
          // If it's a raw string in storage, keep it as raw string
          backup[key] = value;
        }
      }
    });
    return JSON.stringify(backup, null, 2);
  },

  importAllData: (jsonData: string) => {
    try {
      const backup = JSON.parse(jsonData);
      Object.keys(backup).forEach(key => {
        if (Object.values(STORAGE_KEYS).includes(key)) {
          localStorage.setItem(key, JSON.stringify(backup[key]));
        }
      });
      window.location.reload();
    } catch (e) {
      console.error('Falha ao restaurar backup:', e);
      throw new Error('Arquivo de backup inválido.');
    }
  },

  getTheme: (): string => safeJsonParse(STORAGE_KEYS.THEME, 'light'),
  setTheme: (theme: string) => safeJsonSet(STORAGE_KEYS.THEME, theme)
};
