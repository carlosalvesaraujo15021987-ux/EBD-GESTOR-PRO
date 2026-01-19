
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Registry from './components/Registry';
import Attendance from './components/Attendance';
import Reports from './components/Reports';
import Community from './components/Community';
import AILessonPlanner from './components/AILessonPlanner';
import CalendarEvents from './components/CalendarEvents';
import Certificates from './components/Certificates';
import Settings from './components/Settings';
import Login from './components/Login';
import { StorageService } from './services/storage';
import { Menu } from 'lucide-react';
import { Student, Teacher, ClassRoom, AttendanceRecord, User, ThemePalette } from './types';

const PALETTES: Record<ThemePalette, Record<number, string>> = {
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 
    500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a'
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b'
  },
  violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 
    500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95'
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 
    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337'
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 
    500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f'
  },
  indigo: {
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 
    500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81'
  },
  teal: {
    50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 
    500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a'
  },
  slate: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 
    500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a'
  }
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(StorageService.getTheme());
  const [palette, setPalette] = useState<ThemePalette>(StorageService.getPalette());
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [hasUnreadPosts, setHasUnreadPosts] = useState(false);

  useEffect(() => {
     const session = StorageService.getCurrentUser();
     if (session) {
         setCurrentUser(session);
         refreshData();
     }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    StorageService.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    const colors = PALETTES[palette];
    if (colors) {
      Object.entries(colors).forEach(([level, hex]) => {
        document.documentElement.style.setProperty(`--color-primary-${level}`, hex as string);
      });
      StorageService.setPalette(palette);
    }
  }, [palette]);

  const refreshData = () => {
    setStudents(StorageService.getStudents());
    setTeachers(StorageService.getTeachers());
    setClasses(StorageService.getClasses());
    setAttendance(StorageService.getAttendance());
    const posts = StorageService.getPosts();
    const lastSeen = StorageService.getLastSeenMural();
    const hasNew = posts.some(p => new Date(p.date) > new Date(lastSeen));
    setHasUnreadPosts(hasNew);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const changePalette = (p: ThemePalette) => setPalette(p);

  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      refreshData();
      setCurrentTab('dashboard');
  };

  const handleLogout = () => {
      StorageService.logout();
      setCurrentUser(null);
      setCurrentTab('dashboard');
  };

  const handleNavigate = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'community') {
        StorageService.setLastSeenMural();
        setHasUnreadPosts(false);
    }
  };

  const renderContent = () => {
    const isAdmin = currentUser?.role === 'admin';
    switch (currentTab) {
      case 'dashboard': return <Dashboard students={students} attendance={attendance} classes={classes} />;
      case 'registry': return isAdmin ? <Registry students={students} teachers={teachers} classes={classes} user={currentUser} onUpdate={refreshData} /> : <Dashboard students={students} attendance={attendance} classes={classes} />;
      case 'attendance': return <Attendance students={students} classes={classes} onUpdate={refreshData} />;
      case 'reports': return <Reports classes={classes} attendance={attendance} students={students} teachers={teachers} />;
      case 'community': return <Community students={students} user={currentUser} />;
      case 'calendar': return <CalendarEvents user={currentUser} />;
      case 'ai-planner': return isAdmin ? <AILessonPlanner /> : <Dashboard students={students} attendance={attendance} classes={classes} />;
      case 'certificates': return isAdmin ? <Certificates students={students} classes={classes} teachers={teachers} /> : <Dashboard students={students} attendance={attendance} classes={classes} />;
      case 'settings': return <Settings currentUser={currentUser} onUpdate={refreshData} />;
      default: return <Dashboard students={students} attendance={attendance} classes={classes} />;
    }
  };

  if (!currentUser) return <Login onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-hidden relative">
      <Sidebar 
        currentTab={currentTab} 
        onNavigate={handleNavigate} 
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        hasUnreadPosts={hasUnreadPosts}
        user={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentPalette={palette}
        onChangePalette={changePalette}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center md:hidden transition-colors">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 dark:text-gray-300 hover:text-gray-900">
            <Menu size={24} />
          </button>
          <span className="ml-4 font-bold text-gray-800 dark:text-white">EBD Gestor Pro</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-20">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
        <div className="fixed bottom-2 right-4 text-[10px] text-gray-400 dark:text-gray-500 text-right pointer-events-none z-30 opacity-80 leading-tight">
          <p className="font-semibold">Créditos: Carlos Alves de Araujo</p>
          <p>Diácono e Secretário da EBD ADBrasil</p>
          <p className="font-bold">ADMSJP</p>
        </div>
      </div>
    </div>
  );
}

export default App;
