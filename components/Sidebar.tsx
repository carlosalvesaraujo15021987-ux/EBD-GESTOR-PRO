
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, BookCheck, PieChart, Sparkles, LogOut, Menu, X, Camera, MessageCircleHeart, Calendar, Shield, FileBadge, Sun, Moon, Settings, Palette } from 'lucide-react';
import { StorageService } from '../services/storage';
import { User, ThemePalette } from '../types';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  hasUnreadPosts?: boolean;
  user: User | null;
  onLogout: () => void;
  theme: string;
  onToggleTheme: () => void;
  currentPalette: ThemePalette;
  onChangePalette: (p: ThemePalette) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, onNavigate, isOpen, toggleSidebar, hasUnreadPosts, user, onLogout, theme, onToggleTheme, currentPalette, onChangePalette }) => {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const settings = StorageService.getSettings();
    if (settings && settings.logoUrl) {
      setLogoUrl(settings.logoUrl);
    }
  }, []);

  const handleLogoClick = () => {
    if (isAdmin) fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoUrl(base64String);
        const currentSettings = StorageService.getSettings();
        StorageService.saveSettings({ ...currentSettings, logoUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const NavItem = ({ id, label, icon }: { id: string, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => { onNavigate(id); if (window.innerWidth < 768) toggleSidebar(); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium relative ${
        currentTab === id 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
      {id === 'community' && hasUnreadPosts && (
        <span className="absolute right-4 w-2.5 h-2.5 bg-red-500 border-2 border-gray-900 rounded-full animate-pulse"></span>
      )}
    </button>
  );

  const paletteOptions: { id: ThemePalette, color: string, label: string }[] = [
    { id: 'blue', color: 'bg-blue-600', label: 'Azul Ministerial' },
    { id: 'emerald', color: 'bg-emerald-600', label: 'Esperança' },
    { id: 'violet', color: 'bg-violet-600', label: 'Real' },
    { id: 'rose', color: 'bg-rose-600', label: 'Sacrifício' },
    { id: 'amber', color: 'bg-amber-600', label: 'Iluminado' },
    { id: 'indigo', color: 'bg-indigo-600', label: 'Noite de Vigília' },
    { id: 'teal', color: 'bg-teal-600', label: 'Águas de Descanso' },
    { id: 'slate', color: 'bg-slate-600', label: 'Solenidade de Fé' },
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className={`relative group ${isAdmin ? 'cursor-pointer' : ''}`} onClick={handleLogoClick} title={isAdmin ? "Clique para alterar a logo" : ""}>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              {logoUrl ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex items-center justify-center border-2 border-transparent group-hover:border-blue-500 transition-colors">
                  <img src={logoUrl} alt="Logo EBD" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg group-hover:bg-blue-700 transition-colors">E</div>
              )}
            </div>
            <button onClick={toggleSidebar} className="md:hidden text-gray-400 hover:text-white"><X /></button>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold tracking-tight">EBD Gestor</h1>
              <p className="text-xs text-gray-500">{user?.name || 'Usuário'}</p>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={() => setShowPaletteMenu(!showPaletteMenu)}
                  className={`p-2 rounded-lg transition-colors ${showPaletteMenu ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'}`}
                  title="Temas Exclusivos"
                >
                  <Palette size={18} />
                </button>
                <button onClick={onToggleTheme} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-yellow-400 transition-colors">
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
            </div>
          </div>

          {showPaletteMenu && (
             <div className="bg-gray-800 rounded-xl p-3 grid grid-cols-4 gap-2 animate-fade-in shadow-xl border border-gray-700">
                {paletteOptions.map(p => (
                   <button 
                     key={p.id}
                     onClick={() => onChangePalette(p.id)}
                     className={`w-full aspect-square rounded-full border-2 transition-all active:scale-90 relative ${p.color} ${currentPalette === p.id ? 'border-white ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'}`}
                     title={p.label}
                   />
                ))}
             </div>
          )}
        </div>

        <nav className="px-4 space-y-1 mt-2 overflow-y-auto max-h-[calc(100vh-320px)]">
          <NavItem id="dashboard" label="Dashboard" icon={<LayoutDashboard size={20} />} />
          <NavItem id="attendance" label="Frequência" icon={<BookCheck size={20} />} />
          <NavItem id="community" label="Mural da EBD" icon={<MessageCircleHeart size={20} className="text-pink-400" />} />
          {isAdmin && <NavItem id="registry" label="Cadastros" icon={<Users size={20} />} />}
          {isAdmin && <NavItem id="certificates" label="Certificados" icon={<FileBadge size={20} className="text-amber-400" />} />}
          <NavItem id="calendar" label="Agenda Eclesiástica" icon={<Calendar size={20} className="text-emerald-400" />} />
          <NavItem id="reports" label="Relatórios" icon={<PieChart size={20} />} />
          {isAdmin && (
            <>
              <div className="pt-4 pb-2"><p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sistema</p></div>
              <NavItem id="ai-planner" label="Planejador IA" icon={<Sparkles size={20} className="text-yellow-400" />} />
              <NavItem id="settings" label="Configurações" icon={<Settings size={20} className="text-gray-400" />} />
            </>
          )}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800 bg-gray-900">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-colors">
            <LogOut size={20} /><span>Sair</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
