import React, { useState, useEffect, useRef } from 'react';
import { Lock, Mail, Key, UserCheck, ArrowRight, BookOpen, Camera, RefreshCw, CheckCircle, Smartphone } from 'lucide-react';
import { StorageService } from '../services/storage';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

type TabType = 'login' | 'first_access' | 'forgot_password';

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [churchName, setChurchName] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // First Access State
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenUser, setTokenUser] = useState<User | null>(null);

  // Forgot Password State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'email' | 'code' | 'reset'>('email');
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [targetUser, setTargetUser] = useState<User | null>(null);

  useEffect(() => {
      const settings = StorageService.getSettings();
      if (settings) {
          if (settings.logoUrl) setLogoUrl(settings.logoUrl);
          if (settings.churchName) setChurchName(settings.churchName);
          if (settings.loginBackgroundUrl) setBackgroundUrl(settings.loginBackgroundUrl);
      }
  }, []);

  const resetStates = () => {
    setError('');
    setSuccess('');
    setTokenUser(null);
    setTargetUser(null);
    setRecoveryStep('email');
    setInputCode('');
    setGeneratedCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

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

      const updatedUser: User = {
          ...tokenUser,
          password: newPassword,
          active: true
      };
      
      StorageService.saveUser(updatedUser);
      StorageService.login(updatedUser.email, newPassword);
      onLoginSuccess(updatedUser);
  };

  const handleRequestRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const users = StorageService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === recoveryEmail.toLowerCase());
    
    if (!user) {
        setError('E-mail não encontrado no sistema.');
        return;
    }

    if (!user.active) {
        setError('Este usuário ainda não ativou a conta.');
        return;
    }

    // Gerar um código/token de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setTargetUser(user);
    setRecoveryStep('code');
    
    // Simulação de envio de e-mail (usando alert para demonstração)
    const church = StorageService.getSettings().churchName;
    alert(`ENVIANDO TOKEN PARA: ${recoveryEmail}\n\nAssunto: Recuperação de Senha - ${church}\nCorpo: Olá ${user.name}, seu token para redefinir a senha é: ${code}`);
    console.log(`Token gerado para ${recoveryEmail}: ${code}`);
  };

  const handleVerifyRecoveryCode = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputCode === generatedCode) {
          setRecoveryStep('reset');
          setError('');
      } else {
          setError('Token incorreto. Verifique o código enviado.');
      }
  };

  const handleResetPassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (!targetUser) return;
      if (newPassword.length < 4) {
          setError('A senha deve ter pelo menos 4 caracteres.');
          return;
      }
      if (newPassword !== confirmPassword) {
          setError('As senhas não coincidem.');
          return;
      }

      const updatedUser = { ...targetUser, password: newPassword };
      StorageService.saveUser(updatedUser);
      setSuccess('Senha alterada com sucesso! Faça login agora.');
      setActiveTab('login');
      resetStates();
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 3 * 1024 * 1024) {
              alert('A imagem é muito grande (Máx 3MB).');
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              setBackgroundUrl(result);
              const currentSettings = StorageService.getSettings();
              StorageService.saveSettings({ ...currentSettings, loginBackgroundUrl: result });
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div 
          className={`p-8 text-center text-white relative overflow-hidden transition-all duration-500 group ${!backgroundUrl ? 'bg-gradient-to-b from-blue-600 to-blue-700' : ''}`}
          style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
           {backgroundUrl && <div className="absolute inset-0 bg-black/50 z-0"></div>}
           <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
               <input type="file" ref={fileInputRef} onChange={handleBackgroundUpload} className="hidden" accept="image/*" />
               <button onClick={() => fileInputRef.current?.click()} className="bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all">
                   <Camera size={16} />
               </button>
           </div>
           <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-blue-400/30 overflow-hidden relative z-10">
              {logoUrl ? <img src={logoUrl} alt="Logo Igreja" className="w-full h-full object-cover" /> : <BookOpen size={32} className="text-blue-600" />}
           </div>
           <h1 className="text-xl font-bold leading-tight relative z-10 drop-shadow-md">EBD Gestor Pro</h1>
           {churchName && <p className="mt-1 text-blue-100 text-[10px] font-bold uppercase tracking-widest relative z-10">{churchName}</p>}
        </div>

        <div className="flex border-b border-gray-100">
           <button onClick={() => { setActiveTab('login'); resetStates(); }} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>Entrar</button>
           <button onClick={() => { setActiveTab('first_access'); resetStates(); }} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'first_access' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>Primeiro Acesso</button>
        </div>

        <div className="p-8">
            {error && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg mb-4 text-center border border-red-100 animate-fade-in font-bold">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg mb-4 text-center border border-green-100 animate-fade-in font-bold">{success}</div>}

            {activeTab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" placeholder="seu@email.com" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" placeholder="••••••" required />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 mt-2 flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                        Entrar <ArrowRight size={18} />
                    </button>
                    <div className="text-center mt-4">
                        <button type="button" onClick={() => setActiveTab('forgot_password')} className="text-[10px] text-blue-600 hover:underline font-black uppercase tracking-tighter">Esqueceu a senha?</button>
                    </div>
                </form>
            )}

            {activeTab === 'forgot_password' && (
                <div className="animate-fade-in">
                    {recoveryStep === 'email' && (
                        <form onSubmit={handleRequestRecovery} className="space-y-4">
                            <p className="text-xs text-gray-600 text-center mb-4">Insira seu e-mail cadastrado para enviarmos um <b>Token de Recuperação</b>.</p>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">E-mail Cadastrado</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="seu@email.com" required />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-700 shadow-lg uppercase tracking-widest text-sm">Gerar Token</button>
                            <button type="button" onClick={() => setActiveTab('login')} className="w-full text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 hover:underline">Voltar</button>
                        </form>
                    )}

                    {recoveryStep === 'code' && (
                        <form onSubmit={handleVerifyRecoveryCode} className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl flex flex-col items-center gap-2 mb-2 border border-blue-100">
                                <Smartphone className="text-blue-500" size={24} />
                                <p className="text-xs text-blue-800 text-center font-medium">Um Token de 6 dígitos foi enviado para o seu e-mail cadastrado.</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">Digite o Token</label>
                                <input type="text" value={inputCode} onChange={e => setInputCode(e.target.value)} className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl text-center text-3xl font-black tracking-[0.4em] focus:border-blue-500 outline-none" placeholder="000000" maxLength={6} required />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg uppercase tracking-widest text-sm">Validar Token</button>
                        </form>
                    )}

                    {recoveryStep === 'reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                             <div className="bg-green-50 p-3 rounded-xl flex items-center gap-3 border border-green-100 mb-2">
                                <CheckCircle className="text-green-500" size={20} />
                                <p className="text-[10px] text-green-800 font-black uppercase tracking-widest">Token Validado!</p>
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nova Senha</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Mínimo 4 caracteres" required />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Confirmar Nova Senha</label>
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Repita a nova senha" required />
                             </div>
                             <button type="submit" className="w-full bg-blue-600 text-white font-black py-3 rounded-xl shadow-lg uppercase tracking-widest text-sm">Salvar Nova Senha</button>
                        </form>
                    )}
                </div>
            )}

            {activeTab === 'first_access' && !tokenUser && (
                <div className="space-y-4 animate-fade-in">
                    <p className="text-xs text-gray-600 text-center mb-2">Insira o <b>Token de Acesso</b> fornecido pelo administrador para criar sua senha pessoal.</p>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Token de Convite</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="text" value={token} onChange={e => setToken(e.target.value.toUpperCase())} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono uppercase tracking-[0.3em] text-sm" placeholder="A1B2C3" />
                        </div>
                    </div>
                    <button onClick={handleVerifyToken} disabled={!token} className="w-full bg-green-600 text-white font-black py-3 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200 disabled:opacity-50 text-sm uppercase tracking-widest">Validar Token</button>
                </div>
            )}

            {activeTab === 'first_access' && tokenUser && (
                <form onSubmit={handleActivateAccount} className="space-y-4 animate-fade-in">
                    <div className="bg-green-50 p-4 rounded-xl flex items-center gap-3 mb-4 border border-green-100">
                        <div className="bg-green-100 p-2 rounded-lg"><UserCheck className="text-green-600" size={24} /></div>
                        <div>
                            <p className="text-[10px] text-green-800 font-black uppercase tracking-widest">Olá, {tokenUser.name}</p>
                            <p className="text-[11px] text-green-600 font-bold">Crie sua senha de acesso abaixo.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nova Senha</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Mínimo 4 caracteres" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Confirmar Senha</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Repita a senha" required />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg mt-2 uppercase tracking-widest text-sm">Ativar Conta</button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;