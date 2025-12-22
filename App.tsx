
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
import { Student, Teacher, ClassRoom, AttendanceRecord, User } from './types';

function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(StorageService.getTheme());
  
  // App Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  
  // Notification State
  const [hasUnreadPosts, setHasUnreadPosts] = useState(false);

  useEffect(() => {
     // Check for session
     const session = StorageService.getCurrentUser();
     if (session) {
         setCurrentUser(session);
         refreshData();
     }
  }, []);

  useEffect(() => {
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    StorageService.setTheme(theme);
  }, [theme]);

  // Load initial data
  const refreshData = () => {
    setStudents(StorageService.getStudents());
    setTeachers(StorageService.getTeachers());
    setClasses(StorageService.getClasses());
    setAttendance(StorageService.getAttendance());
    
    // Check for unread posts
    const posts = StorageService.getPosts();
    const lastSeen = StorageService.getLastSeenMural();
    // Check if any post is newer than lastSeen
    const hasNew = posts.some(p => new Date(p.date) > new Date(lastSeen));
    setHasUnreadPosts(hasNew);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
        // Mark as read when navigating to community
        StorageService.setLastSeenMural();
        setHasUnreadPosts(false);
    }
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard students={students} attendance={attendance} classes={classes} />;
      case 'registry':
        return <Registry students={students} teachers={teachers} classes={classes} user={currentUser} onUpdate={refreshData} />;
      case 'attendance':
        return <Attendance students={students} classes={classes} onUpdate={refreshData} />;
      case 'reports':
        return <Reports classes={classes} attendance={attendance} students={students} />;
      case 'community':
        return <Community students={students} />;
      case 'calendar':
        return <CalendarEvents />;
      case 'ai-planner':
        return <AILessonPlanner />;
      case 'certificates':
        return <Certificates students={students} classes={classes} teachers={teachers} />;
      case 'settings':
        return <Settings onUpdate={refreshData} />;
      default:
        return <Dashboard students={students} attendance={attendance} classes={classes} />;
    }
  };

  // Auth Guard
  if (!currentUser) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
  }

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
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center md:hidden transition-colors">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900"
          >
            <Menu size={24} />
          </button>
          <span className="ml-4 font-bold text-gray-800 dark:text-white">EBD Gestor Pro</span>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-20">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
        
        {/* Watermark / Credits - Bottom Right */}
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
