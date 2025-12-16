
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { StorageService } from '../services/storage';
import { Users, UserPlus, Key, Shield, Share2, Trash2, Copy, Check, Clock } from 'lucide-react';

interface UserManagementProps {
  isEmbedded?: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ isEmbedded = false }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');

  useEffect(() => {
    refreshUsers();
  }, []);

  const refreshUsers = () => {
    setUsers(StorageService.getUsers());
  };

  const generateToken = () => {
    // Generate a 6-char random alphanumeric string
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

    // Check email dupes
    if (users.some(u => u.email === newEmail)) {
        alert('Este email já está cadastrado.');
        return;
    }

    const token = generateToken();
    const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: newName,
        email: newEmail,
        role: newRole,
        token: token,
        active: false,
        createdAt: new Date().toISOString()
    };

    StorageService.saveUser(newUser);
    setUsers([...users, newUser]);
    
    // Reset form
    setNewName('');
    setNewEmail('');
    setNewRole('user');
    setShowModal(false);
  };

  const handleDeleteUser = (id: string) => {
      if (window.confirm('Tem certeza? O usuário perderá o acesso.')) {
          StorageService.deleteUser(id);
          refreshUsers();
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
          // Copy to clipboard fallback
          navigator.clipboard.writeText(message);
          alert('Mensagem copiada para a área de transferência!');
      }
  };

  // Helper to check if created < 24h ago
  const isRecent = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      return diffInHours < 24;
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
                Gerencie quem tem acesso ao sistema e envie tokens de convite.
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
         <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                 <Shield className="text-gray-500" size={20} /> Lista de Usuários
              </h3>
              <p className="text-sm text-gray-500">Administradores e usuários do sistema.</p>
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
       <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
                <tr>
                   <th className="px-6 py-4">Usuário</th>
                   <th className="px-6 py-4">Função</th>
                   <th className="px-6 py-4">Status</th>
                   <th className="px-6 py-4">Token (Convite)</th>
                   <th className="px-6 py-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                   <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                {user.name.charAt(0)}
                            </div>
                            <div>
                               <p className="font-bold text-gray-800">{user.name}</p>
                               <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         {user.role === 'admin' ? (
                             <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold uppercase">Administrador</span>
                         ) : (
                             <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">Comum</span>
                         )}
                      </td>
                      <td className="px-6 py-4">
                         {user.active ? (
                            <span className="flex items-center gap-1 text-green-600 font-bold text-sm">
                                <Check size={16} /> Ativo
                            </span>
                         ) : (
                            <span className="flex items-center gap-1 text-orange-500 font-bold text-sm bg-orange-50 px-2 py-1 rounded-lg w-fit">
                                <Clock size={16} /> Pendente
                            </span>
                         )}
                      </td>
                      <td className="px-6 py-4">
                         {!user.active ? (
                             <div className="flex items-center gap-2">
                                <code className="bg-gray-100 px-2 py-1 rounded border border-gray-300 font-mono text-blue-600 font-bold tracking-widest">
                                    {user.token}
                                </code>
                                {isRecent(user.createdAt) && (
                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold animate-pulse">NOVO</span>
                                )}
                             </div>
                         ) : (
                             <span className="text-gray-400 text-sm italic">Utilizado</span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                         {!user.active && (
                             <button 
                                onClick={() => handleShareToken(user)}
                                className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                title="Compartilhar Token"
                             >
                                <Share2 size={18} />
                             </button>
                         )}
                         <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
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

       {/* Modal Create User */}
       {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
             <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Novo Usuário</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Nome</label>
                      <input 
                         value={newName}
                         onChange={e => setNewName(e.target.value)}
                         className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                         required
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                      <input 
                         type="email"
                         value={newEmail}
                         onChange={e => setNewEmail(e.target.value)}
                         className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                         required
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Permissão</label>
                      <select 
                         value={newRole}
                         onChange={e => setNewRole(e.target.value as UserRole)}
                         className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                         <option value="user">Usuário Comum</option>
                         <option value="admin">Administrador</option>
                      </select>
                   </div>
                   <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                      <p>Ao criar, um <strong>Token de Acesso</strong> será gerado. Você deverá compartilhá-lo com o usuário para que ele defina a senha.</p>
                   </div>
                   <div className="flex gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-2.5 text-gray-600 font-bold bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                         Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-2.5 text-white font-bold bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                         Criar & Gerar Token
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
