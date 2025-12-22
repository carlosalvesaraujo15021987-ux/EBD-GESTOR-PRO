
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, MessageCircle, Cake, Upload, Send, Trash2, Calendar, 
  FileText, Bell, Star, Edit2, X, Share2, Image as ImageIcon, Copy, Check, Download, MessageCircleHeart
} from 'lucide-react';
import { Student, QuarterlyLesson, WallPost } from '../types';
import { StorageService } from '../services/storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CommunityProps {
  students: Student[];
}

const Community: React.FC<CommunityProps> = ({ students }) => {
  const [activeTab, setActiveTab] = useState<'lessons' | 'wall'>('lessons');
  const [lessons, setLessons] = useState<QuarterlyLesson[]>([]);
  const [posts, setPosts] = useState<WallPost[]>([]);
  
  // Forms & Edit State
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState<Partial<QuarterlyLesson>>({ category: 'Adultos' });
  const lessonFileInputRef = useRef<HTMLInputElement>(null);
  
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [newPost, setNewPost] = useState<Partial<WallPost>>({ type: 'notice' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Birthday Logic
  const currentMonth = new Date().getMonth(); // 0-11
  const birthdayStudents = students.filter(s => {
    if (!s.active || !s.birthDate) return false;
    // Simple string split is safer for YYYY-MM-DD to avoid timezone issues
    const month = parseInt(s.birthDate.split('-')[1]) - 1; 
    return month === currentMonth;
  }).sort((a, b) => {
    const dayA = parseInt(a.birthDate.split('-')[2]);
    const dayB = parseInt(b.birthDate.split('-')[2]);
    return dayA - dayB;
  });

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setLessons(StorageService.getLessons());
    setPosts(StorageService.getPosts());
  };

  // --- Birthday Sharing Logic ---
  const handleShareBirthdays = async (type: 'day' | 'week') => {
    const now = new Date();
    let title = '';
    let list: Student[] = [];

    if (type === 'day') {
        const todayDay = now.getDate();
        const todayMonth = now.getMonth() + 1;
        
        list = students.filter(s => {
            if(!s.active || !s.birthDate) return false;
            const [_, m, d] = s.birthDate.split('-');
            return parseInt(m) === todayMonth && parseInt(d) === todayDay;
        });
        
        title = `🎂 Aniversariantes de Hoje (${todayDay}/${todayMonth})`;
    } else {
        // Week Logic (Sunday to Saturday)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Go to Sunday
        startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (6 - now.getDay())); // Go to Saturday
        endOfWeek.setHours(23,59,59,999);

        list = students.filter(s => {
            if(!s.active || !s.birthDate) return false;
            const [_, m, d] = s.birthDate.split('-');
            // Create a date object for the birthday THIS YEAR
            const bdayDate = new Date(now.getFullYear(), parseInt(m) - 1, parseInt(d));
            
            // Handle edge case for Dec/Jan weeks (not implementing full year wrap logic for simplicity, focusing on current week)
            return bdayDate >= startOfWeek && bdayDate <= endOfWeek;
        }).sort((a, b) => {
             const dayA = parseInt(a.birthDate.split('-')[2]);
             const dayB = parseInt(b.birthDate.split('-')[2]);
             return dayA - dayB;
        });
        
        title = `🍰 Aniversariantes da Semana`;
    }

    if (list.length === 0) {
        alert(`Nenhum aniversariante encontrado para ${type === 'day' ? 'hoje' : 'esta semana'}.`);
        return;
    }

    let text = `🎉 *${title.toUpperCase()}* 🎉\n\n`;
    list.forEach(s => {
        const [_, m, d] = s.birthDate.split('-');
        const currentYear = new Date().getFullYear();
        const birthYear = parseInt(s.birthDate.split('-')[0]);
        const age = currentYear - birthYear;
        
        text += `🥳 *${s.name}* - Dia ${d}/${m} (${age} anos)\n`;
    });
    text += `\nParabéns! Que Deus abençoe! 🙌`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                text: text
            });
        } catch (err) {
            console.log('Share canceled');
        }
    } else {
        navigator.clipboard.writeText(text);
        alert('Lista copiada para a área de transferência! Cole no WhatsApp.');
    }
  };

  // --- Lesson Handlers ---

  const handleCreateNewLesson = () => {
    setEditingLessonId(null);
    setNewLesson({ category: 'Adultos', title: '', goldenText: '', dailyReading: '' });
    setShowLessonForm(true);
  };

  const handleEditLesson = (lesson: QuarterlyLesson) => {
    setEditingLessonId(lesson.id);
    setNewLesson({ ...lesson });
    setShowLessonForm(true);
  };

  const handleLessonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
          alert('Por favor, selecione apenas arquivos PDF.');
          return;
      }
      // Limit file size to avoid localStorage quota issues (e.g., 2MB)
      if (file.size > 2 * 1024 * 1024) {
          alert('O arquivo é muito grande. O limite para armazenamento local é 2MB.');
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewLesson({ ...newLesson, pdfUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLessonFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewLesson({ ...newLesson, pdfUrl: undefined });
    if (lessonFileInputRef.current) lessonFileInputRef.current.value = '';
  };

  const handleSaveLesson = () => {
    if (!newLesson.title || !newLesson.goldenText) return;
    
    // If editing, use existing ID, else create new
    const id = editingLessonId || Math.random().toString(36).substr(2, 9);
    
    const lesson: QuarterlyLesson = {
      id,
      title: newLesson.title,
      category: newLesson.category || 'Adultos',
      goldenText: newLesson.goldenText,
      dailyReading: newLesson.dailyReading || '',
      dateAdded: editingLessonId ? (newLesson.dateAdded || new Date().toISOString()) : new Date().toISOString(),
      pdfUrl: newLesson.pdfUrl
    };

    StorageService.saveLesson(lesson);
    setNewLesson({ category: 'Adultos' });
    setEditingLessonId(null);
    setShowLessonForm(false);
    refreshData();
  };

  const handleDeleteLesson = (id: string) => {
    if(window.confirm('Excluir esta lição permanentemente?')) {
        StorageService.deleteLesson(id);
        refreshData();
    }
  };

  // --- Post Handlers (Mural) ---
  const handleSavePost = () => {
      if (!newPost.title || !newPost.content) return;

      const id = editingPostId || Math.random().toString(36).substr(2, 9);
      const post: WallPost = {
          id,
          title: newPost.title,
          content: newPost.content,
          type: newPost.type as 'update' | 'notice',
          date: new Date().toISOString()
      };
      
      StorageService.savePost(post);
      setNewPost({ type: 'notice' });
      setEditingPostId(null);
      refreshData();
      
      // Notify (Update last seen to now so user sees it as read, but others see unread)
      StorageService.setLastSeenMural();
  };

  const handleDeletePost = (id: string) => {
      if (window.confirm('Remover esta publicação?')) {
          StorageService.deletePost(id);
          refreshData();
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Component Header with Global Action */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
          <div>
             <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <MessageCircleHeart className="text-pink-600" />
                Mural da EBD
             </h2>
             <p className="text-sm text-gray-500">Comunicação, avisos e material didático.</p>
          </div>
          <button 
            onClick={handleCreateNewLesson}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
          >
             <Upload size={18} /> Nova Lição
          </button>
      </div>

      {/* Header Tabs */}
      <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex">
        <button 
          onClick={() => setActiveTab('lessons')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'lessons' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <BookOpen size={18} /> Lições Trimestrais
        </button>
        <button 
          onClick={() => setActiveTab('wall')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'wall' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <MessageCircle size={18} /> Mural & Avisos
        </button>
      </div>

      {/* --- LESSONS TAB --- */}
      {activeTab === 'lessons' && (
        <div className="space-y-6">
           {/* Actions Bar - Title Only */}
           <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Material de Apoio</h3>
           </div>

           {/* Lessons Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessons.map(lesson => (
                 <div key={lesson.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="bg-orange-50 border-b border-orange-100 p-4 flex justify-between items-start">
                       <div>
                          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider bg-orange-100 px-2 py-0.5 rounded-full">{lesson.category}</span>
                          <h4 className="font-bold text-gray-800 text-lg mt-1">{lesson.title}</h4>
                       </div>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditLesson(lesson)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded bg-white"><Edit2 size={16}/></button>
                          <button onClick={() => handleDeleteLesson(lesson.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-white"><Trash2 size={16}/></button>
                       </div>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                           <p className="text-xs font-bold text-yellow-700 uppercase mb-1 flex items-center gap-1"><Star size={12} fill="currentColor"/> Texto Áureo</p>
                           <p className="text-sm text-gray-700 italic">"{lesson.goldenText}"</p>
                        </div>
                        <div>
                           <p className="text-xs font-bold text-gray-500 uppercase mb-1">Leitura Diária</p>
                           <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{lesson.dailyReading}</p>
                        </div>
                        
                        {lesson.pdfUrl ? (
                            <a 
                              href={lesson.pdfUrl}
                              download={`Licao-${lesson.title.replace(/\s+/g, '-')}.pdf`}
                              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-gray-200"
                            >
                                <Download size={16} /> Baixar PDF da Lição
                            </a>
                        ) : (
                            <button disabled className="w-full py-2.5 bg-gray-50 text-gray-400 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-gray-100 cursor-not-allowed">
                                <FileText size={16} /> Material indisponível
                            </button>
                        )}
                    </div>
                 </div>
              ))}
              {lessons.length === 0 && (
                 <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <BookOpen size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Nenhuma lição cadastrada ainda.</p>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* --- WALL TAB --- */}
      {activeTab === 'wall' && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Wall Feed */}
            <div className="lg:col-span-2 space-y-6">
               {/* Post Input */}
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                     <Bell size={18} className="text-blue-500" /> Novo Comunicado
                  </h4>
                  <input 
                    className="w-full border border-gray-200 rounded-lg p-3 mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Título do aviso..."
                    value={newPost.title || ''}
                    onChange={e => setNewPost({...newPost, title: e.target.value})}
                  />
                  <textarea 
                    className="w-full border border-gray-200 rounded-lg p-3 h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Escreva a mensagem para a igreja..."
                    value={newPost.content || ''}
                    onChange={e => setNewPost({...newPost, content: e.target.value})}
                  />
                  <div className="flex justify-between items-center mt-3">
                     <div className="flex gap-2">
                        <button 
                           onClick={() => setNewPost({...newPost, type: 'notice'})}
                           className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${newPost.type === 'notice' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'bg-gray-100 text-gray-500'}`}
                        >
                           Aviso Geral
                        </button>
                        <button 
                           onClick={() => setNewPost({...newPost, type: 'update'})}
                           className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${newPost.type === 'update' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-gray-100 text-gray-500'}`}
                        >
                           Atualização
                        </button>
                     </div>
                     <button 
                        onClick={handleSavePost}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95"
                     >
                        <Send size={16} /> Publicar
                     </button>
                  </div>
               </div>

               {/* Feed */}
               <div className="space-y-4">
                  {posts.map(post => (
                     <div key={post.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative group">
                        <div className="flex justify-between items-start mb-2">
                           <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${post.type === 'update' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {post.type === 'update' ? 'Novidade' : 'Comunicado'}
                           </span>
                           <span className="text-xs text-gray-400">
                              {new Date(post.date).toLocaleDateString()}
                           </span>
                        </div>
                        <h4 className="font-bold text-gray-800 text-lg mb-2">{post.title}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        
                        <button 
                           onClick={() => handleDeletePost(post.id)}
                           className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                  ))}
                  {posts.length === 0 && (
                     <div className="text-center py-10 text-gray-400">Nenhum aviso no mural.</div>
                  )}
               </div>
            </div>

            {/* Right Col: Birthdays */}
            <div className="space-y-6">
                <div className="bg-gradient-to-b from-pink-500 to-rose-600 rounded-xl shadow-lg text-white p-6 relative overflow-hidden">
                    <Cake className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20 rotate-12" />
                    
                    <h3 className="text-xl font-bold mb-1 flex items-center gap-2 relative z-10">
                        <Cake size={24} /> Aniversariantes
                    </h3>
                    <p className="text-pink-100 text-sm relative z-10 font-medium mb-4">
                        Mês de {monthNames[currentMonth]}
                    </p>

                    {/* Sharing Buttons */}
                    <div className="relative z-10 flex gap-2">
                        <button 
                            onClick={() => handleShareBirthdays('day')}
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1.5 px-2 rounded-lg backdrop-blur-sm transition-colors flex items-center justify-center gap-1"
                        >
                            <Share2 size={12} /> Dia
                        </button>
                        <button 
                            onClick={() => handleShareBirthdays('week')}
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1.5 px-2 rounded-lg backdrop-blur-sm transition-colors flex items-center justify-center gap-1"
                        >
                            <Share2 size={12} /> Semana
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {birthdayStudents.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                           Nenhum aniversariante cadastrado neste mês.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                           {birthdayStudents.map(student => {
                               const [_, month, day] = student.birthDate.split('-');
                               return (
                                   <div key={student.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                                       <div className="bg-pink-100 text-pink-600 w-12 h-12 rounded-lg flex flex-col items-center justify-center shadow-sm">
                                           <span className="text-sm font-bold leading-none">{day}</span>
                                           <span className="text-[10px] uppercase font-bold">{monthNames[parseInt(month)-1].substr(0, 3)}</span>
                                       </div>
                                       <div>
                                           <p className="font-bold text-gray-800 text-sm">{student.name}</p>
                                           <p className="text-xs text-gray-500">
                                              {/* Calculate age roughly */}
                                              {new Date().getFullYear() - parseInt(student.birthDate.split('-')[0])} anos
                                           </p>
                                       </div>
                                   </div>
                               );
                           })}
                        </div>
                    )}
                </div>
            </div>
         </div>
      )}

      {/* --- ADD/EDIT LESSON MODAL --- */}
      {showLessonForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                      {editingLessonId ? 'Editar Lição' : 'Nova Lição Trimestral'}
                  </h3>
                  <button onClick={() => setShowLessonForm(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={24} />
                  </button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Título da Lição</label>
                    <input 
                       value={newLesson.title || ''}
                       onChange={e => setNewLesson({...newLesson, title: e.target.value})}
                       className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                       placeholder="Ex: Lição 01 - A Criação"
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
                        <select 
                           value={newLesson.category}
                           onChange={e => setNewLesson({...newLesson, category: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                           <option>Adultos</option>
                           <option>Jovens</option>
                           <option>Adolescentes</option>
                           <option>Infantil</option>
                           <option>Novos Convertidos</option>
                        </select>
                     </div>
                     <div>
                         {/* Optional Date override if needed */}
                     </div>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Texto Áureo</label>
                    <textarea 
                       rows={2}
                       value={newLesson.goldenText || ''}
                       onChange={e => setNewLesson({...newLesson, goldenText: e.target.value})}
                       className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                       placeholder="Versículo chave..."
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Leitura Diária</label>
                    <textarea 
                       rows={4}
                       value={newLesson.dailyReading || ''}
                       onChange={e => setNewLesson({...newLesson, dailyReading: e.target.value})}
                       className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                       placeholder={`Seg: Gn 1:1\nTer: Jo 1:1...`}
                    />
                 </div>

                 {/* Functional PDF Upload */}
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Arquivo PDF da Lição</label>
                    <input 
                        type="file" 
                        accept="application/pdf"
                        ref={lessonFileInputRef}
                        onChange={handleLessonFileUpload}
                        className="hidden"
                    />
                    
                    {!newLesson.pdfUrl ? (
                        <div 
                            onClick={() => lessonFileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
                        >
                            <Upload size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-bold text-sm">Clique para enviar PDF</span>
                            <span className="text-xs opacity-70">Máx: 2MB</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-green-800 uppercase">Arquivo Selecionado</p>
                                    <p className="text-xs text-green-600">Pronto para salvar</p>
                                </div>
                            </div>
                            <button 
                                onClick={removeLessonFile}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                 </div>

                 <button 
                    onClick={handleSaveLesson}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg mt-2"
                 >
                    {editingLessonId ? 'Salvar Alterações' : 'Cadastrar Lição'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Community;
