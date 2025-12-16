
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
  SESSION: 'ebd_session_user'
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
    date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0], // Last week
    classId: 'c1',
    presentStudentIds: ['s1', 's2'],
    visitorsCount: 1,
    biblesCount: 2,
    magazinesCount: 2,
    offeringValue: 15.50,
    notes: 'Aula sobre a Arca de Noé'
  },
  {
    id: 'att2',
    date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    classId: 'c4',
    presentStudentIds: ['s6'],
    visitorsCount: 0,
    biblesCount: 5,
    magazinesCount: 3,
    offeringValue: 150.00,
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

const initialLessons: QuarterlyLesson[] = [
  {
    id: 'l1',
    category: 'Adultos',
    title: 'Lição 01 - O Início de Tudo',
    goldenText: 'No princípio criou Deus o céu e a terra. (Gn 1:1)',
    dailyReading: 'Seg: Gn 1:1\nTer: Jo 1:1\nQua: Sl 33:6\nQui: Hb 11:3\nSex: Sl 19:1\nSáb: Is 40:28',
    dateAdded: new Date().toISOString()
  }
];

const initialPosts: WallPost[] = [
  {
    id: 'p1',
    title: 'Bem-vindo ao Novo App!',
    content: 'Estamos muito felizes em lançar o EBD Gestor Pro. Agora você pode acompanhar tudo digitalmente.',
    type: 'update',
    date: new Date().toISOString()
  }
];

const initialEvents: ChurchEvent[] = [
  {
    id: 'e1',
    title: 'Simpósio de Doutrina',
    date: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split('T')[0],
    time: '19:00',
    location: 'Sede - ADMSJP',
    scope: 'campo',
    category: 'simposio',
    description: 'Grande simpósio para obreiros e líderes.'
  },
  {
    id: 'e2',
    title: 'Confraternização dos Jovens',
    date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0],
    time: '18:00',
    location: 'Congregação Jd Brasil',
    scope: 'local',
    category: 'confraternizacao',
    description: 'Jantar de comunhão.'
  }
];

// Initial Admin User
const initialAdmin: User = {
    id: 'admin_1',
    name: 'Administrador',
    email: 'admin@ebd.com',
    password: 'admin123', // Simple text for local demo
    role: 'admin',
    token: 'ADMIN1',
    active: true,
    createdAt: new Date().toISOString()
};

// Helper to initialize if empty
const initStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(initialClasses));
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(initialTeachers));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initialStudents));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(initialAttendance));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialSettings));
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(initialLessons));
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(initialPosts));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(initialEvents));
  } else {
    // Check if settings need update (migration strategy)
    const currentSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
    if (!currentSettings.leadership?.pastorPresidente) {
         const mergedSettings = { ...initialSettings, ...currentSettings, leadership: { ...initialSettings.leadership, ...currentSettings.leadership } };
         localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mergedSettings));
    }
    // Check if events need init
    if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(initialEvents));
    }
  }

  // Ensure Users exist
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([initialAdmin]));
  }
};

initStorage();

export const StorageService = {
  // --- Classes ---
  getClasses: (): ClassRoom[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]'),
  addClass: (cls: ClassRoom) => {
    const data = StorageService.getClasses();
    const existingIndex = data.findIndex(c => c.id === cls.id);
    if (existingIndex >= 0) {
      data[existingIndex] = cls;
    } else {
      data.push(cls);
    }
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(data));
  },
  deleteClass: (id: string) => {
    const data = StorageService.getClasses().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(data));
  },
  
  // --- Teachers ---
  getTeachers: (): Teacher[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHERS) || '[]'),
  addTeacher: (teacher: Teacher) => {
    const data = StorageService.getTeachers();
    const existingIndex = data.findIndex(t => t.id === teacher.id);
    if (existingIndex >= 0) {
      data[existingIndex] = teacher;
    } else {
      data.push(teacher);
    }
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(data));
  },
  deleteTeacher: (id: string) => {
    const data = StorageService.getTeachers().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(data));
  },

  // --- Students ---
  getStudents: (): Student[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]'),
  saveStudent: (student: Student) => {
    const data = StorageService.getStudents();
    const existingIndex = data.findIndex(s => s.id === student.id);
    if (existingIndex >= 0) {
      data[existingIndex] = student;
    } else {
      data.push(student);
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(data));
  },
  deleteStudent: (id: string) => {
    const data = StorageService.getStudents().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(data));
  },

  // --- Attendance ---
  getAttendance: (): AttendanceRecord[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]'),
  saveAttendance: (record: AttendanceRecord) => {
    const data = StorageService.getAttendance();
    const existingIndex = data.findIndex(r => r.date === record.date && r.classId === record.classId);
    if (existingIndex >= 0) {
      data[existingIndex] = record;
    } else {
      data.push(record);
    }
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(data));
  },

  // --- Settings ---
  getSettings: (): ChurchSettings => {
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settings ? JSON.parse(settings) : initialSettings;
  },
  saveSettings: (settings: ChurchSettings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // --- Lessons ---
  getLessons: (): QuarterlyLesson[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.LESSONS) || '[]'),
  saveLesson: (lesson: QuarterlyLesson) => {
    const data = StorageService.getLessons();
    const existingIndex = data.findIndex(l => l.id === lesson.id);
    if (existingIndex >= 0) {
      data[existingIndex] = lesson;
    } else {
      data.push(lesson);
    }
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(data));
  },
  deleteLesson: (id: string) => {
    const data = StorageService.getLessons().filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(data));
  },

  // --- Posts ---
  getPosts: (): WallPost[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || '[]'),
  savePost: (post: WallPost) => {
    const data = StorageService.getPosts();
    const existingIndex = data.findIndex(p => p.id === post.id);
    if (existingIndex >= 0) {
      data[existingIndex] = post;
    } else {
      data.unshift(post); // Newest first
    }
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(data));
  },
  deletePost: (id: string) => {
    const data = StorageService.getPosts().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(data));
  },

  // --- Events (Agenda) ---
  getEvents: (): ChurchEvent[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]'),
  saveEvent: (event: ChurchEvent) => {
    const data = StorageService.getEvents();
    const existingIndex = data.findIndex(e => e.id === event.id);
    if (existingIndex >= 0) {
      data[existingIndex] = event;
    } else {
      data.push(event);
    }
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(data));
  },
  deleteEvent: (id: string) => {
    const data = StorageService.getEvents().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(data));
  },

  // --- Notifications ---
  getLastSeenMural: (): string => {
    return localStorage.getItem(STORAGE_KEYS.LAST_SEEN_MURAL) || '1970-01-01T00:00:00.000Z';
  },
  setLastSeenMural: (dateStr?: string) => {
    localStorage.setItem(STORAGE_KEYS.LAST_SEEN_MURAL, dateStr || new Date().toISOString());
  },

  // --- Users & Authentication ---
  getUsers: (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
  
  saveUser: (user: User) => {
    const users = StorageService.getUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },
  
  deleteUser: (id: string) => {
     const users = StorageService.getUsers().filter(u => u.id !== id);
     localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  // Auth Methods
  login: (email: string, pass: string): User | null => {
      const users = StorageService.getUsers();
      // Simple strict check (in real app, hash passwords!)
      const user = users.find(u => u.email === email && u.password === pass && u.active);
      if (user) {
          localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
          return user;
      }
      return null;
  },

  logout: () => {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  getCurrentUser: (): User | null => {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION) || 'null');
  },

  // Returns user if token matches and account is inactive (waiting for password setup)
  validateToken: (token: string): User | null => {
      const users = StorageService.getUsers();
      const user = users.find(u => u.token === token);
      return user || null;
  }
};
