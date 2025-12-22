
import React, { useState, useEffect } from 'react';
import { Calendar, UserCheck, Save, MessageSquareText, Info, AlertCircle } from 'lucide-react';
import { Student, ClassRoom, AttendanceRecord } from '../types';
import { StorageService } from '../services/storage';

interface AttendanceProps {
  students: Student[];
  classes: ClassRoom[];
  onUpdate: () => void;
}

const Attendance: React.FC<AttendanceProps> = ({ students, classes, onUpdate }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [justifications, setJustifications] = useState<{ [key: string]: string }>({});
  const [visitors, setVisitors] = useState<number>(0);
  const [bibles, setBibles] = useState<number>(0);
  const [magazines, setMagazines] = useState<number>(0);
  const [offering, setOffering] = useState<string>('0.00');
  const [notes, setNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (selectedClassId) {
      const filtered = students.filter(s => s.classId === selectedClassId && s.active);
      setClassStudents(filtered);
      
      const allRecords = StorageService.getAttendance();
      const existing = allRecords.find(r => r.classId === selectedClassId && r.date === date);
      
      if (existing) {
        setPresentIds(new Set(existing.presentStudentIds));
        setJustifications(existing.justifications || {});
        setVisitors(existing.visitorsCount);
        setBibles(existing.biblesCount);
        setMagazines(existing.magazinesCount);
        setOffering(existing.offeringValue.toFixed(2));
        setNotes(existing.notes || '');
      } else {
        setPresentIds(new Set());
        setJustifications({});
        setVisitors(0);
        setBibles(0);
        setMagazines(0);
        setOffering('0.00');
        setNotes('');
      }
    }
  }, [selectedClassId, date, students]);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <UserCheck className="text-blue-600" />
          Frequência e Justificativas
        </h2>
        
        <div className="flex gap-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 p-1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Classe</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 p-1 bg-transparent"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Lista de Alunos</h3>
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
              {presentIds.size} Presentes
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {classStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhum aluno cadastrado.</div>
            ) : (
              classStudents.map(student => (
                <div key={student.id} className={`px-6 py-4 flex flex-col transition-colors ${presentIds.has(student.id) ? 'bg-blue-50/20' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => togglePresence(student.id)}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${presentIds.has(student.id) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className={`font-bold ${presentIds.has(student.id) ? 'text-blue-900' : 'text-gray-800'}`}>{student.name}</p>
                        {!presentIds.has(student.id) && <span className="text-[10px] text-red-500 font-bold uppercase">Ausente</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => togglePresence(student.id)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${presentIds.has(student.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-transparent'}`}
                    >
                       <UserCheck size={20} />
                    </button>
                  </div>
                  
                  {!presentIds.has(student.id) && (
                    <div className="mt-3 pl-12 animate-fade-in">
                      <div className="flex items-center gap-2 bg-orange-50 p-2 rounded-lg border border-orange-100">
                        <AlertCircle size={14} className="text-orange-500" />
                        <input 
                          type="text" 
                          placeholder="Justificativa da falta..."
                          value={justifications[student.id] || ''}
                          onChange={(e) => handleJustificationChange(student.id, e.target.value)}
                          className="flex-1 text-sm bg-transparent border-none outline-none text-orange-800 placeholder:text-orange-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-semibold text-gray-700 mb-2 border-b pb-2 flex items-center gap-2">
               <Info size={16} className="text-blue-500" /> Resumo da Aula
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Visitantes</label>
                <input type="number" value={visitors} onChange={e => setVisitors(parseInt(e.target.value) || 0)} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Bíblias</label>
                <input type="number" value={bibles} onChange={e => setBibles(parseInt(e.target.value) || 0)} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Revistas</label>
                <input type="number" value={magazines} onChange={e => setMagazines(parseInt(e.target.value) || 0)} className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Oferta (R$)</label>
                <input type="number" step="0.01" value={offering} onChange={e => setOffering(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2 text-sm font-bold text-green-600" />
              </div>
            </div>

            <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
              <Save size={18} /> Salvar Chamada
            </button>
            {successMsg && <p className="text-center text-xs text-green-600 font-bold">{successMsg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
