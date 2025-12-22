
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { ChurchSettings } from '../types';
import { Save, Download, RefreshCw, Award, MapPin, Star, User, Camera, Image as ImageIcon, Upload, Shield, Database } from 'lucide-react';
import UserManagement from './UserManagement';

interface SettingsProps {
  onUpdate: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onUpdate }) => {
  const [settings, setSettings] = useState<ChurchSettings | null>(null);
  const [tempSettings, setTempSettings] = useState<ChurchSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'church' | 'users' | 'maintenance'>('maintenance');
  const [successMsg, setSuccessMsg] = useState('');

  const bgInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = StorageService.getSettings();
    setSettings(s);
    setTempSettings(JSON.parse(JSON.stringify(s)));
  }, []);

  const handleSave = () => {
    if (tempSettings) {
      StorageService.saveSettings(tempSettings);
      setSettings(tempSettings);
      setSuccessMsg('Configurações salvas com sucesso!');
      onUpdate();
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && tempSettings) {
        if (file.size > 2 * 1024 * 1024) {
            alert('A imagem é muito grande (Máx 2MB).');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setTempSettings({
                ...tempSettings,
                loginBackgroundUrl: reader.result as string
            });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleBackup = () => {
    const data = StorageService.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `backup_ebd_gestor_pro_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Atenção: A restauração substituirá TODOS OS DADOS atuais pelos do backup. Deseja continuar?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        StorageService.importAllData(content);
        alert('Dados restaurados com sucesso! O sistema será reiniciado.');
      } catch (err) {
        alert('Erro ao restaurar: Arquivo inválido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            Configurações do Sistema
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manutenção, backup e gestão administrativa.</p>
        </div>
        {activeTab === 'church' && (
           <button 
             onClick={handleSave}
             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
           >
             <Save size={18} /> Salvar Alterações
           </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation */}
        <div className="space-y-2">
           <button 
             onClick={() => setActiveTab('maintenance')}
             className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${activeTab === 'maintenance' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
           >
             <Database size={20} /> Backup e Manutenção
           </button>
           <button 
             onClick={() => setActiveTab('church')}
             className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${activeTab === 'church' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
           >
             <Award size={20} /> Dados da Igreja
           </button>
           <button 
             onClick={() => setActiveTab('users')}
             className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${activeTab === 'users' ? 'bg-purple-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
           >
             <Shield size={20} /> Gestão de Usuários
           </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
            {successMsg && (
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-4 rounded-xl mb-6 border border-green-200 dark:border-green-800 animate-fade-in flex items-center gap-2 font-bold">
                    <Save size={18} /> {successMsg}
                </div>
            )}

            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                 <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                        <Database className="text-indigo-500" /> Backup de Dados Salvos
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-2xl">
                        A segurança das suas informações é prioridade. Exporte um arquivo completo com todos os alunos, professores, classes e registros de frequência realizados até o momento.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                          onClick={handleBackup}
                          className="flex flex-col items-center justify-center p-8 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-3xl border-2 border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all group"
                        >
                           <div className="bg-indigo-600 text-white p-4 rounded-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform">
                              <Download size={32} />
                           </div>
                           <span className="text-lg font-black uppercase tracking-tight">Criar Backup Completo</span>
                           <span className="text-xs opacity-60 mt-1 font-bold">Arquivo .JSON (Cerca de 1MB)</span>
                        </button>

                        <div className="relative">
                            <input 
                              type="file" 
                              ref={restoreInputRef} 
                              onChange={handleRestore} 
                              className="hidden" 
                              accept=".json"
                            />
                            <button 
                              onClick={() => restoreInputRef.current?.click()}
                              className="w-full h-full flex flex-col items-center justify-center p-8 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-3xl border-2 border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all group"
                            >
                               <div className="bg-amber-500 text-white p-4 rounded-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform">
                                  <RefreshCw size={32} />
                               </div>
                               <span className="text-lg font-black uppercase tracking-tight">Restaurar Dados Salvos</span>
                               <span className="text-xs opacity-60 mt-1 font-bold">Selecione um arquivo .JSON</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-start gap-3 border border-gray-100 dark:border-gray-600">
                        <Database size={20} className="text-gray-400 mt-1" />
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            <p className="font-bold mb-1">Dica de Segurança:</p>
                            <p>Realize o backup pelo menos uma vez por semana. Salve o arquivo em seu computador ou em uma nuvem segura (Google Drive, Dropbox, etc). Esse arquivo contém toda a vida da sua EBD.</p>
                        </div>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'church' && tempSettings && (
               <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                        <Award className="text-blue-500" /> Informações do Ministério
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Nome da Igreja / Sede</label>
                            <input 
                                value={tempSettings.churchName}
                                onChange={e => setTempSettings({...tempSettings, churchName: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Endereço Completo</label>
                            <input 
                                value={tempSettings.address}
                                onChange={e => setTempSettings({...tempSettings, address: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                        <Star className="text-yellow-500" /> Liderança e Administração
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Pastor Presidente</label>
                            <input 
                                value={tempSettings.leadership.pastorPresidente}
                                onChange={e => setTempSettings({...tempSettings, leadership: {...tempSettings.leadership, pastorPresidente: e.target.value}})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Dirigentes</label>
                            <input 
                                value={tempSettings.leadership.dirigentes}
                                onChange={e => setTempSettings({...tempSettings, leadership: {...tempSettings.leadership, dirigentes: e.target.value}})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Superintendentes</label>
                            <input 
                                value={tempSettings.leadership.superintendentes}
                                onChange={e => setTempSettings({...tempSettings, leadership: {...tempSettings.leadership, superintendentes: e.target.value}})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Secretaria</label>
                            <input 
                                value={tempSettings.leadership.secretarios}
                                onChange={e => setTempSettings({...tempSettings, leadership: {...tempSettings.leadership, secretarios: e.target.value}})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Tesouraria</label>
                            <input 
                                value={tempSettings.leadership.tesoureiro}
                                onChange={e => setTempSettings({...tempSettings, leadership: {...tempSettings.leadership, tesoureiro: e.target.value}})}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                  </div>

                  <div>
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                        <ImageIcon className="text-indigo-500" /> Identidade Visual
                     </h3>
                     <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-4">Capa da Tela de Login</p>
                        <div className="flex items-center gap-6">
                           <div className="w-40 h-24 bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden shadow-inner border border-gray-300 dark:border-gray-700 flex items-center justify-center">
                              {tempSettings.loginBackgroundUrl ? (
                                  <img src={tempSettings.loginBackgroundUrl} className="w-full h-full object-cover" />
                              ) : (
                                  <ImageIcon className="text-gray-400" />
                              )}
                           </div>
                           <div className="space-y-3">
                               <input type="file" ref={bgInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                               <button 
                                 onClick={() => bgInputRef.current?.click()}
                                 className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2 text-gray-700 dark:text-gray-300"
                               >
                                  <Upload size={16} /> Carregar Nova Capa
                               </button>
                               {tempSettings.loginBackgroundUrl && (
                                   <button 
                                     onClick={() => setTempSettings({...tempSettings, loginBackgroundUrl: undefined})}
                                     className="text-xs text-red-500 hover:underline font-bold"
                                   >
                                      Remover e usar padrão
                                   </button>
                               )}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'users' && (
              <UserManagement isEmbedded={true} />
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
