
import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, MapPin, Clock, Plus, Trash2, Edit2, X, AlertCircle, Share2, Camera, Eraser } from 'lucide-react';
import { ChurchEvent } from '../types';
import { StorageService } from '../services/storage';

const CalendarEvents: React.FC = () => {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [filterScope, setFilterScope] = useState<'all' | 'local' | 'campo'>('all');
  const [showModal, setShowModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Banner State
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Edit/Create State
  const [formData, setFormData] = useState<Partial<ChurchEvent>>({ 
    scope: 'local', 
    category: 'culto',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    refreshEvents();
    const storedBanner = StorageService.getAgendaBanner();
    if (storedBanner) setBannerUrl(storedBanner);
  }, []);

  const refreshEvents = () => {
    const allEvents = StorageService.getEvents();
    // Sort by date ascending (upcoming first)
    const sorted = allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setEvents(sorted);
  };

  const handleOpenModal = (event?: ChurchEvent) => {
    if (event) {
      setFormData({ ...event });
    } else {
      setFormData({ 
        scope: 'local', 
        category: 'culto', 
        date: new Date().toISOString().split('T')[0],
        time: '19:00'
      });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.date || !formData.location) return;

    const event: ChurchEvent = {
      id: formData.id || Math.random().toString(36).substr(2, 9),
      title: formData.title,
      date: formData.date,
      time: formData.time,
      location: formData.location,
      description: formData.description,
      scope: formData.scope as 'local' | 'campo',
      category: formData.category as any
    };

    StorageService.saveEvent(event);
    setShowModal(false);
    refreshEvents();
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
        StorageService.deleteEvent(itemToDelete);
        refreshEvents();
        setItemToDelete(null);
    }
  };

  // --- Banner Logic ---
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 3 * 1024 * 1024) { // 3MB limit
              alert('A imagem é muito grande. Use uma imagem menor que 3MB.');
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              setBannerUrl(result);
              StorageService.saveAgendaBanner(result);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveBanner = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm('Deseja remover o banner personalizado e voltar ao padrão?')) {
          setBannerUrl(null);
          StorageService.deleteAgendaBanner();
      }
  };

  // --- Sharing Logic ---
  const handleShareAgenda = async (monthTitle: string, monthEvents: ChurchEvent[]) => {
      const settings = StorageService.getSettings();
      const churchName = settings?.churchName || 'Igreja';

      let text = `📅 *AGENDA MENSAL - ${monthTitle.toUpperCase()}*\n`;
      text += `📍 *${churchName}*\n\n`;

      // Sort by day again just to be safe
      const sortedEvents = [...monthEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sortedEvents.forEach(event => {
          const [year, month, day] = event.date.split('-');
          const categoryEmoji = {
              culto: '🙏',
              simposio: '🎓',
              confraternizacao: '🎉',
              reuniao: '💼',
              outro: '🗓️'
          }[event.category] || '🗓️';

          text += `${categoryEmoji} *Dia ${day}/${month}* - ${event.time || '??:??'}\n`;
          text += `🔹 *${event.title}*\n`;
          text += `📍 ${event.location}\n`;
          text += `------------------------------\n`;
      });

      text += `\n📲 _Gerado via EBD Gestor Pro_`;

      if (navigator.share) {
          try {
              await navigator.share({
                  title: `Agenda ${monthTitle}`,
                  text: text
              });
          } catch (err) {
              console.log('User cancelled share');
          }
      } else {
          navigator.clipboard.writeText(text);
          alert('Agenda copiada para a área de transferência! Cole no WhatsApp.');
      }
  };

  const handleShareEvent = async (event: ChurchEvent) => {
      const settings = StorageService.getSettings();
      const churchName = settings?.churchName || 'Igreja';
      const [year, month, day] = event.date.split('-');

      const categoryEmoji = {
          culto: '🙏',
          simposio: '🎓',
          confraternizacao: '🎉',
          reuniao: '💼',
          outro: '🗓️'
      }[event.category] || '🗓️';

      let text = `📅 *CONVITE ESPECIAL*\n\n`;
      text += `${categoryEmoji} *${event.title.toUpperCase()}*\n`;
      text += `📍 *${churchName}*\n\n`;
      text += `🗓️ Data: *${day}/${month}/${year}*\n`;
      text += `⏰ Horário: *${event.time || 'A definir'}*\n`;
      text += `📌 Local: ${event.location}\n`;
      if (event.description) text += `\n📝 ${event.description}\n`;
      text += `\nVenha participar conosco!`;

      if (navigator.share) {
          try {
              await navigator.share({
                  title: event.title,
                  text: text
              });
          } catch (err) {
              console.log('User cancelled share');
          }
      } else {
          navigator.clipboard.writeText(text);
          alert('Convite copiado para a área de transferência!');
      }
  };

  const filteredEvents = events.filter(e => {
    if (filterScope === 'all') return true;
    return e.scope === filterScope;
  });

  // Group events by Month/Year
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const [year, month] = event.date.split('-');
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const groupKey = `${monthNames[parseInt(month) - 1]} ${year}`;
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(event);
    return groups;
  }, {} as Record<string, ChurchEvent[]>);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
        case 'confraternizacao': return 'bg-pink-100 text-pink-700 border-pink-200';
        case 'simposio': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'reuniao': return 'bg-orange-100 text-orange-700 border-orange-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getScopeBadge = (scope: string) => {
      if (scope === 'campo') return <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">ADMSJP</span>;
      return <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Local</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
       {/* Header with Banner Upload */}
       <div className={`relative rounded-2xl shadow-lg overflow-hidden group min-h-[180px] flex flex-col justify-center transition-all ${!bannerUrl ? 'bg-gradient-to-r from-blue-700 to-indigo-800' : ''}`}>
          {bannerUrl && (
              <>
                 <img src={bannerUrl} alt="Banner Agenda" className="absolute inset-0 w-full h-full object-cover z-0 transition-transform group-hover:scale-105 duration-700" />
                 <div className="absolute inset-0 bg-black/50 z-0"></div>
              </>
          )}
          
          <div className="relative z-10 p-8 text-white">
            <h2 className="text-3xl font-bold flex items-center gap-3 drop-shadow-md">
              <CalendarIcon className="text-blue-300" />
              Agenda Eclesiástica
            </h2>
            <p className="opacity-90 mt-2 max-w-xl text-blue-50 leading-relaxed font-medium">
              Acompanhe simpósios, confraternizações e eventos do Campo ADMSJP e da Igreja Local. Explore o cronograma e participe!
            </p>
          </div>
          
          {!bannerUrl && <CalendarIcon className="absolute -bottom-10 -right-10 w-64 h-64 opacity-5 rotate-12 z-0 text-white" />}

          {/* Banner Controls */}
          <div className="absolute bottom-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <input 
                type="file" 
                ref={bannerInputRef} 
                onChange={handleBannerUpload} 
                accept="image/*" 
                className="hidden" 
             />
             
             {bannerUrl && (
                <button 
                   onClick={handleRemoveBanner}
                   className="bg-red-500/80 hover:bg-red-600 text-white p-2.5 rounded-full backdrop-blur-sm transition-all shadow-md border border-white/10"
                   title="Remover Banner"
                >
                   <Eraser size={18} />
                </button>
             )}

             <button 
                onClick={() => bannerInputRef.current?.click()}
                className="bg-blue-600/80 hover:bg-blue-600 text-white p-2.5 rounded-full backdrop-blur-sm transition-all shadow-md border border-white/10"
                title="Alterar Imagem de Capa"
             >
                <Camera size={18} />
             </button>
          </div>
       </div>

       {/* Filters & Actions */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-full sm:w-auto">
             <button 
               type="button"
               onClick={() => setFilterScope('all')}
               className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${filterScope === 'all' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
             >
               Todos
             </button>
             <button 
               type="button"
               onClick={() => setFilterScope('campo')}
               className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${filterScope === 'campo' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
             >
               Campo ADMSJP
             </button>
             <button 
               type="button"
               onClick={() => setFilterScope('local')}
               className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${filterScope === 'local' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
             >
               Local
             </button>
          </div>

          <button 
             type="button"
             onClick={() => handleOpenModal()}
             className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
             <Plus size={20} /> Novo Evento
          </button>
       </div>

       {/* Events List */}
       <div className="space-y-8">
          {Object.keys(groupedEvents).length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                  <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">Nenhum evento agendado para este filtro.</p>
              </div>
          ) : (
            Object.keys(groupedEvents).map((monthYear, index) => (
                <div 
                    key={monthYear} 
                    className="space-y-4 animate-fade-in"
                    style={{ animationDelay: `${index * 150}ms`, opacity: 0, animationFillMode: 'forwards' }}
                >
                    {/* Month Header with Share Button */}
                    <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 py-2 px-3 rounded-lg border-l-4 border-blue-500 flex justify-between items-center shadow-sm">
                        <h3 className="text-lg font-bold text-gray-700 pl-2">
                            {monthYear}
                        </h3>
                        <button
                            onClick={() => handleShareAgenda(monthYear, groupedEvents[monthYear])}
                            className="flex items-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors text-sm font-bold"
                            title="Compartilhar Agenda Completa deste Mês"
                        >
                            <Share2 size={16} /> <span className="hidden sm:inline">Agenda Mensal</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedEvents[monthYear].map(event => {
                            const [year, month, day] = event.date.split('-');
                            return (
                                <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col group relative">
                                    <div className={`h-1.5 w-full ${event.scope === 'campo' ? 'bg-blue-600' : 'bg-emerald-500'}`}></div>
                                    <div className="p-5 flex-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col items-center bg-gray-100 rounded-lg p-2 min-w-[3.5rem] border border-gray-200">
                                                <span className="text-xl font-bold text-gray-800 leading-none">{day}</span>
                                                <span className="text-[10px] uppercase font-bold text-gray-500">{month}/{year.slice(2)}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleShareEvent(event)} 
                                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                    title="Compartilhar este evento"
                                                >
                                                    <Share2 size={16}/>
                                                </button>
                                                <button type="button" onClick={() => handleOpenModal(event)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit2 size={16}/></button>
                                                <button type="button" onClick={() => handleDeleteClick(event.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-2">
                                            {getScopeBadge(event.scope)}
                                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full border ${getCategoryColor(event.category)} uppercase tracking-wide font-semibold`}>
                                                {event.category}
                                            </span>
                                        </div>

                                        <h4 className="font-bold text-gray-800 text-lg mb-1">{event.title}</h4>
                                        
                                        <div className="space-y-1.5 mt-3 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-gray-400" />
                                                <span>{event.time || 'Horário não definido'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="text-gray-400" />
                                                <span className="truncate">{event.location}</span>
                                            </div>
                                        </div>
                                        
                                        {event.description && (
                                            <div className="mt-4 pt-3 border-t border-gray-50 text-xs text-gray-500 leading-relaxed">
                                                {event.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))
          )}
       </div>

       {/* Delete Confirmation Modal */}
       {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
             <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Evento?</h3>
             <p className="text-sm text-gray-500 mb-6">
               Tem certeza que deseja remover este evento da agenda?
             </p>
             <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-sm"
                >
                  Sim, Excluir
                </button>
             </div>
          </div>
        </div>
       )}

       {/* Add/Edit Modal */}
       {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {formData.id ? <Edit2 size={20} className="text-blue-500" /> : <Plus size={20} className="text-blue-500" />}
                    {formData.id ? 'Editar Evento' : 'Novo Evento'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Título do Evento</label>
                  <input 
                    value={formData.title || ''}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Simpósio de Doutrina"
                    className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Origem</label>
                       <select 
                         value={formData.scope}
                         onChange={e => setFormData({...formData, scope: e.target.value as any})}
                         className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                       >
                           <option value="local">Igreja Local</option>
                           <option value="campo">Campo ADMSJP</option>
                       </select>
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
                       <select 
                         value={formData.category}
                         onChange={e => setFormData({...formData, category: e.target.value as any})}
                         className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                       >
                           <option value="culto">Culto</option>
                           <option value="simposio">Simpósio</option>
                           <option value="confraternizacao">Confraternização</option>
                           <option value="reuniao">Reunião</option>
                           <option value="outro">Outro</option>
                       </select>
                   </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Data</label>
                       <input 
                         type="date"
                         value={formData.date || ''}
                         onChange={e => setFormData({...formData, date: e.target.value})}
                         className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1">Horário</label>
                       <input 
                         type="time"
                         value={formData.time || ''}
                         onChange={e => setFormData({...formData, time: e.target.value})}
                         className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                   </div>
               </div>

               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Local</label>
                  <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-3.5 text-gray-400" />
                      <input 
                        value={formData.location || ''}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                        placeholder="Ex: Templo Sede"
                        className="w-full border border-gray-300 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descrição / Detalhes</label>
                  <textarea 
                    rows={3}
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Informações adicionais sobre o evento..."
                    className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
               </div>
            </div>

            <div className="pt-6 mt-2 border-t border-gray-100 flex gap-3">
               <button 
                 type="button" 
                 onClick={() => setShowModal(false)}
                 className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 type="button" 
                 onClick={handleSave}
                 className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all active:scale-95"
               >
                 Salvar Evento
               </button>
            </div>
          </div>
        </div>
       )}
    </div>
  );
};

export default CalendarEvents;
