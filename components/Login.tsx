
import React, { useState, useEffect } from 'react';
import { Lock, Mail, Key, UserCheck, ArrowRight, BookOpen } from 'lucide-react';
import { StorageService } from '../services/storage';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'first_access'>('login');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [churchName, setChurchName] = useState('');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // First Access State
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenUser, setTokenUser] = useState<User | null>(null);

  useEffect(() => {
      const settings = StorageService.getSettings();
      if (settings) {
          if (settings.logoUrl) setLogoUrl(settings.logoUrl);
          if (settings.churchName) setChurchName(settings.churchName);
      }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const user = StorageService.login(email, password);
    if (user) {
      onLoginSuccess(user);
    } else {
      setError('Email ou senha inválidos.');
    }
  };

  const handleVerifyToken = () => {
    setError('');
    const user = StorageService.validateToken(token.trim());
    
    if (user) {
       if (user.active) {
           setError('Este usuário já ativou a conta. Por favor, faça login.');
           setActiveTab('login');
       } else {
           setTokenUser(user);
       }
    } else {
       setError('Token inválido ou não encontrado.');
    }
  };

  const handleActivateAccount = (e: React.FormEvent) => {
      e.preventDefault();
      if (!tokenUser) return;
      
      if (newPassword.length < 4) {
          setError('A senha deve ter pelo menos 4 caracteres.');
          return;
      }

      if (newPassword !== confirmPassword) {
          setError('As senhas não coincidem.');
          return;
      }

      // Update User
      const updatedUser: User = {
          ...tokenUser,
          password: newPassword,
          active: true
      };
      
      StorageService.saveUser(updatedUser);
      // Auto login
      StorageService.login(updatedUser.email, newPassword);
      onLoginSuccess(updatedUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header Personalizado */}
        <div className="bg-gradient-to-b from-blue-600 to-blue-700 p-8 text-center text-white relative overflow-hidden">
           {/* Decorative Circles */}
           <div className="absolute top-[-20px] left-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
           <div className="absolute bottom-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-xl"></div>

           <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-blue-400/30 overflow-hidden relative z-10">
              {logoUrl ? (
                  <img src={logoUrl} alt="Logo Igreja" className="w-full h-full object-cover" />
              ) : (
                  <BookOpen size={40} className="text-blue-600" />
              )}
           </div>
           
           <h1 className="text-2xl font-bold leading-tight relative z-10 drop-shadow-md">
               EBD Gestor Pro
           </h1>
           
           {churchName && (
               <p className="mt-2 text-blue-100 text-sm font-medium relative z-10 border-t border-blue-500/50 pt-2 inline-block">
                   {churchName}
               </p>
           )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
           <button 
             onClick={() => { setActiveTab('login'); setError(''); setTokenUser(null); }}
             className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
           >
             Entrar
           </button>
           <button 
             onClick={() => { setActiveTab('first_access'); setError(''); }}
             className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'first_access' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
           >
             Primeiro Acesso
           </button>
        </div>

        {/* Content */}
        <div className="p-8">
            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center border border-red-100">
                    {error}
                </div>
            )}

            {activeTab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="••••••"
                                required
                            />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 mt-2 flex items-center justify-center gap-2"
                    >
                        Entrar <ArrowRight size={18} />
                    </button>
                    <div className="text-center mt-4">
                        <p className="text-xs text-gray-400">Esqueceu a senha? Contate o administrador.</p>
                        <p className="text-xs text-gray-400 mt-1">Admin Padrão: admin@ebd.com / admin123</p>
                    </div>
                </form>
            )}

            {activeTab === 'first_access' && !tokenUser && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 text-center mb-2">
                        Insira o token fornecido pelo administrador para criar sua senha.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Token de Acesso</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="text"
                                value={token}
                                onChange={e => setToken(e.target.value.toUpperCase())}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono uppercase tracking-widest"
                                placeholder="EX: A1B2C3"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleVerifyToken}
                        disabled={!token}
                        className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-200 disabled:opacity-50"
                    >
                        Validar Token
                    </button>
                </div>
            )}

            {activeTab === 'first_access' && tokenUser && (
                <form onSubmit={handleActivateAccount} className="space-y-4 animate-fade-in">
                    <div className="bg-green-50 p-3 rounded-lg flex items-center gap-3 mb-4 border border-green-100">
                        <div className="bg-green-100 p-2 rounded-full">
                            <UserCheck className="text-green-600" size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-green-800 font-bold uppercase">Olá, {tokenUser.name}</p>
                            <p className="text-xs text-green-600">Defina sua senha de acesso.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
                        <input 
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Mínimo 4 caracteres"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Senha</label>
                        <input 
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Repita a senha"
                            required
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg mt-2"
                    >
                        Ativar Conta e Entrar
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;
