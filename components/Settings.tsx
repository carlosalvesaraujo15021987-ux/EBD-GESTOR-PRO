
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { ChurchSettings, User as UserType } from '../types';
import { Save, Download, RefreshCw, Award, MapPin, Star, User, Camera, Image as ImageIcon, Upload, Shield, Database, AlertCircle, Lock, Key, Cloud, CloudUpload, CloudDownload } from 'lucide-react';
import UserManagement from './UserManagement';

interface SettingsProps {
  currentUser: UserType | null;
  onUpdate: () => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdate }) => {
  const [settings, setSettings] = useState<ChurchSettings | null>(null);
  const [tempSettings, setTempSettings] = useState<ChurchSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'church' | 'users' | 'maintenance' | 'security' | 'cloud'>('security');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentUser) return;
    
    const storedUser = StorageService.getUsers().find(u => u.id === currentUser.id);
    if (storedUser?.password !== currentPassword) {
      setErrorMsg('Senha atual incorreta.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('A confirmação da nova senha não coincide.');
      return;
    }

    const updatedUser = { ...storedUser, password: newPassword };
    StorageService.saveUser(updatedUser);
    
    setSuccessMsg('Sua senha foi alterada com sucesso!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleBackup = () => {
    try {
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
      setSuccessMsg('Backup gerado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Erro ao gerar backup.');
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Atenção: A restauração substituirá TODOS OS DADOS atuais pelos do backup. O sistema será reiniciado automaticamente. Deseja continuar?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        StorageService.importAllData(content);
      } catch (err: any) {
        setErrorMsg(err.message || 'Falha ao restaurar dados.');
        if (restoreInputRef.current) restoreInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handlePushCloud = async () => {
    setIsCloudLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    const result = await StorageService.pushToCloud();
    if (result.success) {
      setSuccessMsg(result.message);
    } else {
      setErrorMsg(result.message);
    }
    setIsCloudLoading(false);
  };

  const handlePullCloud = async () => {
    if (!window.confirm('Isso substituirá seus dados locais pelos salvos na nuvem. Continuar?')) return;
    setIsCloudLoading(true);
    setErrorMsg('');
    const result = await StorageService.pullFromCloud();
    if (!result.success) {
      setErrorMsg(result.message);
      setIsCloudLoading(false);
    }
    // Se sucesso, o StorageService.pullFromCloud recarrega a página automaticamente via importAllData
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            Configurações
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Personalize sua conta e o sistema.</p>
        </div>
        {activeTab === 'church' && isAdmin && (
           <button 
             onClick={handleSave}
             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
           >
             <Save size={18} /> Salvar Alterações
           </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
           <button 
             onClick={() => setActiveTab('security')}
             className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
           >
             <Lock size={20} /> Minha Segurança
           </button>
           <button 
             onClick={() => setActiveTab('cloud')}
             className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${activeTab === 'cloud' ? 'bg-sky-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
           >
             <Cloud size={20} /> Sincronização Nuvem
           </button>
           {isAdmin && (
             <>
               <button 
                 onClick={() => setActiveTab('maintenance')}
                 className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${activeTab === 'maintenance' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
               >
                 <Database size={20} /> Backup Local
               </button>
               <button 
                 onClick={() => setActiveTab('church')}
                 className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${activeTab === 'church' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
               >
                 <Award size={20} /> Dados da Igreja
               </button>
               <button 
                 onClick={() => setActiveTab('users')}
                 className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-all ${activeTab === 'users' ? 'bg-purple-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
               >
                 <Shield size={20} /> Gestão de Usuários
               </button>
             </>
           )}
        </div>

        <div className="lg:col-span-3">
            {successMsg && (
                <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-4 rounded-xl mb-6 border border-green-200 dark:border-green-800 animate-fade-in flex items-center gap-2 font-bold">
                    <Save size={18} /> {successMsg}
                </div>
            )}
            {errorMsg && (
                <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-xl mb-6 border border-red-200 dark:border-red-800 animate-fade-in flex items-center gap-2 font-bold">
                    <AlertCircle size={18} /> {errorMsg}
                    <button onClick={() => setErrorMsg('')} className="ml-auto text-xs underline">Fechar</button>
                </div>
            )}

            {activeTab === 'security' && (
               <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                      <Lock className="text-blue-500" /> Alterar Minha Senha
                  </h3>
                  
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Senha Atual</label>
                        <div className="relative">
                           <Key className="absolute left-3 top-3.5 text-gray-400" size={18} />
                           <input 
                              type="password"
                              value={currentPassword}
                              onChange={e => setCurrentPassword(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 pl-10 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                              placeholder="Digite sua senha atual"
                              required
                           />
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nova Senha</label>
                           <input 
                              type="password"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                              placeholder="Mínimo 4 caracteres"
                              required
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Confirmar Nova Senha</label>
                           <input 
                              type="password"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                              placeholder="Repita a nova senha"
                              required
                           />
                        </div>
                     </div>
                     <div className="pt-4">
                        <button 
                           type="submit"
                           className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                        >
                           <RefreshCw size={18} /> Atualizar Senha
                        </button>
                     </div>
                  </form>
               </div>
            )}

            {activeTab === 'cloud' && (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                    <Cloud className="text-sky-500" /> Sincronização com Supabase
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-2xl">
                    Utilize o poder da nuvem para manter seus dados seguros e acessíveis de qualquer lugar. Certifique-se de que sua tabela <code>ebd_backups</code> está pronta no Supabase.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-sky-50 dark:bg-sky-900/20 rounded-2xl border border-sky-100 dark:border-sky-800 flex flex-col items-center text-center">
                    <div className="bg-sky-500 text-white p-4 rounded-full mb-4 shadow-lg">
                      <CloudUpload size={32} />
                    </div>
                    <h4 className="font-bold text-sky-900 dark:text-sky-100 mb-2">Enviar para Nuvem</h4>
                    <p className="text-xs text-sky-700 dark:text-sky-300 mb-6">Salva seus dados atuais do navegador no servidor seguro do Supabase.</p>
                    <button 
                      onClick={handlePushCloud}
                      disabled={isCloudLoading}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isCloudLoading ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                      Sincronizar Agora
                    </button>
                  </div>

                  <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex flex-col items-center text-center">
                    <div className="bg-emerald-500 text-white p-4 rounded-full mb-4 shadow-lg">
                      <CloudDownload size={32} />
                    </div>
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-100 mb-2">Restaurar da Nuvem</h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-6">Recupera a última versão salva na nuvem e substitui os dados deste dispositivo.</p>
                    <button 
                      onClick={handlePullCloud}
                      disabled={isCloudLoading}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isCloudLoading ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                      Restaurar Dados
                    </button>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs text-gray-500 flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Dica de Configuração:</p>
                    <p>Para esta funcionalidade funcionar, você deve criar uma tabela no seu Supabase com o seguinte comando SQL:</p>
                    <code className="block p-2 bg-gray-900 text-green-400 rounded mt-2 font-mono overflow-x-auto">
                      create table ebd_backups ( email text primary key, payload jsonb, updated_at timestamp with time zone default now() );
                    </code>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'maintenance' && isAdmin && (
              <div className="space-y-6">
                 <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                        <Database className="text-indigo-500" /> Backup Local (.json)
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-2xl">
                        Exporte um arquivo físico para seu computador. Útil para guardar cópias offline ou migrar de sistema manualmente.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                          onClick={handleBackup}
                          className="flex flex-col items-center justify-center p-8 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-3xl border-2 border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all group"
                        >
                           <div className="bg-indigo-600 text-white p-4 rounded-2xl mb-4 shadow-lg group-hover:scale-110 transition-transform">
                              <Download size={32} />
                           </div>
                           <span className="text-lg font-black uppercase tracking-tight">Criar Arquivo JSON</span>
                           <span className="text-xs opacity-60 mt-1 font-bold">Download Automático</span>
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
                               <span className="text-lg font-black uppercase tracking-tight">Importar do Computador</span>
                               <span className="text-xs opacity-60 mt-1 font-bold">Substitui dados atuais</span>
                            </button>
                        </div>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'church' && isAdmin && tempSettings && (
               <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                        <Award className="text-emerald-500" /> Informações do Ministério
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
               </div>
            )}

            {activeTab === 'users' && isAdmin && (
              <UserManagement isEmbedded={true} />
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
