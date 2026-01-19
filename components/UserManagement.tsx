
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { StorageService } from '../services/storage';
import { Users, UserPlus, Key, Shield, Share2, Trash2, Check, Clock, Eye, EyeOff, Lock, AlertTriangle } from 'lucide-react';

interface UserManagementProps {
  isEmbedded?: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ isEmbedded = false }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');

  useEffect(() => {
    refreshUsers();
  }, []);

  const refreshUsers = () => {
    setUsers(StorageService.getUsers());
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    if (users.some(u => u.email.toLowerCase() === newEmail.toLowerCase())) {
        alert('Este email já está cadastrado.');
        return;
    }

    const token = generateToken();
    const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: newName,
        email: newEmail.toLowerCase(),
        password: newPassword || undefined,
        role: newRole,
        token: token,
        active: !!newPassword, // Se tem senha, já nasce ativo
        createdAt: new Date().toISOString()
    };

    StorageService.saveUser(newUser);
    refreshUsers();
    
    // Reset form
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('user');
    setShowModal(false);
  };

  const handleDeleteUser = (id: string) => {
      const target = users.find(u => u.id === id);
      if (target?.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
          alert('Não é possível excluir o único administrador do sistema.');
          return;
      }
      if (window.confirm('Tem certeza? O usuário perderá o acesso permanentemente.')) {
          StorageService.deleteUser(id);
          refreshUsers();
      }
  };

  const handleResetPassword = (user: User) => {
    if (window.confirm(`Deseja realmente redefinir a senha de ${user.name}? \n\nIsso irá remover a senha atual e gerar um novo Token de Acesso para que ele possa redefinir sua senha no login.`)) {
      const newToken = generateToken();
      const updatedUser: User = {
        ...user,
        password: '',
        token: newToken,
        active: false
      };
      StorageService.saveUser(updatedUser);
      refreshUsers();
      alert(`Senha de ${user.name} redefinida! \n\nNovo Token: ${newToken}\n\nCompartilhe este token com o usuário.`);
    }
  };

  const handleShareToken = async (user: User) => {
      const message = `Olá ${user.name}! Bem-vindo ao EBD Gestor Pro.\n\nSeu token de acesso é: *${user.token}*\n\nUtilize este token na opção "Primeiro Acesso" do aplicativo para criar sua senha.`;
      
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'Acesso EBD Gestor',
                  text: message
              });
          } catch (err) {
              console.log('Share canceled');
          }
      } else {
          navigator.clipboard.writeText(message);
          alert('Mensagem copiada para a área de transferência!');
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Header - Conditional Rendering */}
       {!isEmbedded ? (
         <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-8 rounded-2xl shadow-lg text-white flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="text-blue-400" />
                Gestão de Usuários
              </h2>
              <p className="opacity-80 mt-2">
                Gerencie permissões e cadastre novos administradores ou secretários.
              </p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
               <UserPlus size={20} /> Novo Usuário
            </button>
         </div>
       ) : (
         <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                 <Shield className="text-gray-500" size={20} /> Lista de Usuários
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Administradores e usuários do sistema.</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
            >
               <UserPlus size={18} /> Novo Usuário
            </button>
         </div>
       )}

       {/* Users List */}
       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-bold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                     <th className="px-6 py-4">Usuário</th>
                     <th className="px-6 py-4">Função</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4">Acesso</th>
                     <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map(user => (
                     <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {user.name.charAt(0)}
                              </div>
                              <div>
                                 <p className="font-bold text-gray-800 dark:text-white">{user.name}</p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           {user.role === 'admin' ? (
                               <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded text-[10px] font-bold uppercase border border-purple-200 dark:border-purple-800">Administrador</span>
                           ) : (
                               <span className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded text-[10px] font-bold uppercase border border-gray-200 dark:border-gray-600">Comum</span>
                           )}
                        </td>
                        <td className="px-6 py-4">
                           {user.active ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-sm">
                                  <Check size={16} /> Ativo
                              </span>
                           ) : (
                              <span className="flex items-center gap-1 text-orange-500 font-bold text-sm bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg w-fit">
                                  <Clock size={16} /> Pendente
                              </span>
                           )}
                        </td>
                        <td className="px-6 py-4">
                           {!user.active ? (
                               <div className="flex items-center gap-2">
                                  <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 font-mono text-blue-600 dark:text-blue-400 font-bold tracking-widest text-xs">
                                      {user.token}
                                  </code>
                               </div>
                           ) : (
                               <span className="text-gray-400 dark:text-gray-500 text-xs italic">Senha Definida</span>
                           )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                           {!user.active ? (
                               <button 
                                  onClick={() => handleShareToken(user)}
                                  className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-lg transition-colors"
                                  title="Compartilhar Token"
                               >
                                  <Share2 size={18} />
                                </button>
                           ) : (
                              <button 
                                onClick={() => handleResetPassword(user)}
                                className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-2 rounded-lg transition-colors"
                                title="Redefinir Senha (Reset to Token)"
                              >
                                <Key size={18} />
                              </button>
                           )}
                           <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors"
                              title="Remover Usuário"
                           >
                              <Trash2 size={18} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
          </div>
       </div>

       {/* Modal Create User */}
       {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <UserPlus size={24} className="text-blue-600" /> Novo Usuário
                    </h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <Trash2 size={20} className="rotate-45" />
                    </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome Completo</label>
                      <input 
                         value={newName}
                         onChange={e => setNewName(e.target.value)}
                         className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                         placeholder="Ex: João da Silva"
                         required
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">E-mail de Acesso</label>
                      <input 
                         type="email"
                         value={newEmail}
                         onChange={e => setNewEmail(e.target.value)}
                         className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                         placeholder="joao@email.com"
                         required
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Senha Inicial (Opcional)</label>
                      <div className="relative">
                          <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                          <input 
                             type={showPassword ? "text" : "password"}
                             value={newPassword}
                             onChange={e => setNewPassword(e.target.value)}
                             className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                             placeholder="Deixe vazio para usar Token"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nível de Permissão</label>
                      <select 
                         value={newRole}
                         onChange={e => setNewRole(e.target.value as UserRole)}
                         className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none"
                      >
                         <option value="user">Usuário Comum (Secretaria)</option>
                         <option value="admin">Administrador (Total)</option>
                      </select>
                   </div>
                   
                   <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                      <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Atenção:</p>
                      <p>
                        {newPassword 
                          ? "O usuário será criado como ATIVO e poderá logar imediatamente com a senha definida." 
                          : "O usuário será criado como PENDENTE. Um Token de 6 dígitos será gerado para que ele crie a própria senha."}
                      </p>
                   </div>

                   <div className="flex gap-3 pt-4">
                      <button 
                        type="button" 
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                         Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-3 text-white font-bold bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                      >
                         Salvar Usuário
                      </button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default UserManagement;
