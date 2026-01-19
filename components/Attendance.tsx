import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, UserCheck, Save, MessageSquareText, Info, AlertCircle, Users, ChevronDown, Search, X, User } from 'lucide-react';
import { Student, ClassRoom, AttendanceRecord, Teacher } from '../types';
import { StorageService } from '../services/storage';

interface AttendanceProps {
  students: Student[];
  classes: ClassRoom[];
  onUpdate: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ students, classes, onUpdate }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nameFilter, setNameFilter] = useState('');
  
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [justifications, setJustifications] = useState<{ [key: string]: string }>({});
  const [visitors, setVisitors] = useState<number>(0);
  const [bibles, setBibles] = useState<number>(0);
  const [magazines, setMagazines] = useState<number>(0);
  const [offering, setOffering] = useState<string>('0.00');
  const [notes, setNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setTeachers(StorageService.getTeachers());
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Carregar dados existentes ao mudar classe ou data
  useEffect(() => {
    if (selectedClassId) {
      const allRecords = StorageService.getAttendance();
      const existing = allRecords.find(r => r.classId === selectedClassId && r.date === date);
      
      const currentClass = classes.find(c => c.id === selectedClassId);
      
      if (existing) {
        setPresentIds(new Set(existing.presentStudentIds));
        setJustifications(existing.justifications || {});
        setVisitors(existing.visitorsCount);
        setBibles(existing.biblesCount);
        setMagazines(existing.magazinesCount);
        setOffering(existing.offeringValue.toFixed(2));
        setNotes(existing.notes || '');
        setSelectedTeacherId(existing.registeredByTeacherId || '');
      } else {
        setPresentIds(new Set());
        setJustifications({});
        setVisitors(0);
        setBibles(0);
        setMagazines(0);
        setOffering('0.00');
        setNotes('');
        setSelectedTeacherId(currentClass?.mainTeacherId || '');
      }
    }
  }, [selectedClassId, date, classes]);

  // Lógica de Ordenação e Filtro
  const sortedAndFilteredStudents = useMemo(() => {
    let filtered = students.filter(s => s.classId === selectedClassId && s.active);
    
    if (nameFilter.trim()) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    const getPriority = (name: string) => {
      if (name.startsWith('1°Pr')) return 1;
      if (name.startsWith('3°Pb')) return 2;
      if (name.startsWith('2°Ev')) return 3;
      if (name.startsWith('4°Dc')) return 4;
      if (name.startsWith('5°Coop')) return 5;
      
      if (name.startsWith('Pr')) return 1;
      if (name.startsWith('Pb')) return 2;
      if (name.startsWith('Ev')) return 3;
      if (name.startsWith('Dc')) return 4;
      if (name.startsWith('Coop')) return 5;

      return 100;
    };

    return [...filtered].sort((a, b) => {
      const pA = getPriority(a.name);
      const pB = getPriority(b.name);
      
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });
  }, [students, selectedClassId, nameFilter]);

  const togglePresence = (studentId: string) => {
    const newSet = new Set(presentIds);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
      const newJusts = { ...justifications };
      delete newJusts[studentId];
      setJustifications(newJusts);
    }
    setPresentIds(newSet);
  };

  const handleJustificationChange = (studentId: string, text: string) => {
    setJustifications({
      ...justifications,
      [studentId]: text
    });
  };

  const handleSave = () => {
    if (!selectedClassId) return;

    const filteredJustifications: { [key: string]: string } = {};
    Object.keys(justifications).forEach(id => {
      if (!presentIds.has(id) && justifications[id].trim()) {
        filteredJustifications[id] = justifications[id];
      }
    });

    const record: AttendanceRecord = {
      id: `${date}-${selectedClassId}`,
      date,
      classId: selectedClassId,
      registeredByTeacherId: selectedTeacherId || undefined,
      presentStudentIds: Array.from(presentIds),
      justifications: filteredJustifications,
      visitorsCount: visitors,
      biblesCount: bibles,
      magazinesCount: magazines,
      offeringValue: parseFloat(offering) || 0,
      notes
    };

    StorageService.saveAttendance(record);
    onUpdate();
    setSuccessMsg('Dados salvos com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
            <UserCheck size={28} />
          </div>
          Registro de Frequência
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Data */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-gray-100 hover:border-blue-200 transition-all flex items-center gap-4 group">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Calendar size={24} />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Data da Aula</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-lg font-bold text-gray-800 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Card Classe */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-gray-100 hover:border-emerald-200 transition-all flex items-center gap-4 group">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Users size={24} />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Classe</label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-transparent text-lg font-bold text-gray-800 focus:outline-none cursor-pointer appearance-none pr-8"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>
        </div>

        {/* Card Professor (Opcional) */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-gray-100 hover:border-purple-200 transition-all flex items-center gap-4 group">
          <div className="bg-purple-50 text-purple-600 p-3 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <User size={24} />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Professor (Opcional)</label>
            <div className="relative">
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full bg-transparent text-lg font-bold text-gray-800 focus:outline-none cursor-pointer appearance-none pr-8"
              >
                <option value="">Não especificado</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <Search size={20} />
            </div>
            <input 
              type="text"
              placeholder="Pesquisar por nome ou título..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-transparent font-bold text-gray-700 outline-none placeholder:text-gray-300"
            />
            {nameFilter && (
              <button onClick={() => setNameFilter('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <Users size={18} className="text-gray-400" />
                 <h3 className="font-bold text-gray-700">Lista de Chamada</h3>
              </div>
              <span className="text-sm bg-blue-600 text-white px-3 py-1 rounded-full font-black shadow-sm">
                {presentIds.size} {presentIds.size === 1 ? 'Presente' : 'Presentes'}
              </span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar">
              {sortedAndFilteredStudents.length === 0 ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                  <Users size={48} className="opacity-10" />
                  <p className="font-medium">Nenhum aluno encontrado.</p>
                </div>
              ) : (
                sortedAndFilteredStudents.map(student => (
                  <div key={student.id} className={`px-6 py-4 flex flex-col transition-all ${presentIds.has(student.id) ? 'bg-blue-50/20' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => togglePresence(student.id)}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shadow-sm transition-all ${presentIds.has(student.id) ? 'bg-blue-600 text-white rotate-3' : 'bg-gray-100 text-gray-400'}`}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className={`text-base font-bold transition-colors ${presentIds.has(student.id) ? 'text-blue-900' : 'text-gray-800'}`}>{student.name}</p>
                          {!presentIds.has(student.id) && <span className="text-[10px] text-red-500 font-black uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Falta</span>}
                          {presentIds.has(student.id) && <span className="text-[10px] text-green-600 font-black uppercase tracking-widest bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Presente</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => togglePresence(student.id)}
                        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all active:scale-90 ${presentIds.has(student.id) ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' : 'border-gray-200 text-gray-200 hover:border-gray-300'}`}
                      >
                         <UserCheck size={24} />
                      </button>
                    </div>
                    {!presentIds.has(student.id) && (
                      <div className="mt-3 pl-16 animate-fade-in">
                        <div className="flex items-center gap-2 bg-orange-50 p-2.5 rounded-xl border border-orange-100">
                          <AlertCircle size={16} className="text-orange-500" />
                          <input 
                            type="text" 
                            placeholder="Justificativa da falta..."
                            value={justifications[student.id] || ''}
                            onChange={(e) => handleJustificationChange(student.id, e.target.value)}
                            className="flex-1 text-sm bg-transparent border-none outline-none text-orange-900 placeholder:text-orange-300 font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
            <h3 className="font-black text-gray-800 mb-2 border-b border-gray-50 pb-3 flex items-center gap-2 text-sm uppercase tracking-widest">
               <Info size={16} className="text-blue-500" /> Resumo da Aula
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Visitantes</label>
                <input type="number" value={visitors} onChange={e => setVisitors(parseInt(e.target.value) || 0)} className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm font-bold focus:border-blue-500 outline-none transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Bíblias</label>
                <input type="number" value={bibles} onChange={e => setBibles(parseInt(e.target.value) || 0)} className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm font-bold focus:border-blue-500 outline-none transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Revistas</label>
                <input type="number" value={magazines} onChange={e => setMagazines(parseInt(e.target.value) || 0)} className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm font-bold focus:border-blue-500 outline-none transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Oferta (R$)</label>
                <input type="number" step="0.01" value={offering} onChange={e => setOffering(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm font-black text-green-600 focus:border-green-500 outline-none transition-colors" />
              </div>
            </div>
            <div className="pt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter block mb-1">Observações da Aula</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Aluno novo, pedidos de oração..."
                  className="w-full border-2 border-gray-100 rounded-xl p-3 text-xs focus:border-blue-500 outline-none resize-none transition-colors"
                  rows={3}
                />
            </div>
            <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3">
              <Save size={20} /> FINALIZAR CHAMADA
            </button>
            {successMsg && (
                <div className="flex items-center justify-center gap-2 text-green-600 font-black text-xs animate-bounce bg-green-50 p-2 rounded-lg border border-green-100">
                    <UserCheck size={14} /> {successMsg}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;