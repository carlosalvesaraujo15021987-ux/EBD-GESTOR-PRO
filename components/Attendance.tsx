import React, { useState, useEffect } from 'react';
import { Calendar, UserCheck, Save, Book, Coins } from 'lucide-react';
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
  
  // Form State
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [visitors, setVisitors] = useState<number>(0);
  const [bibles, setBibles] = useState<number>(0);
  const [magazines, setMagazines] = useState<number>(0);
  const [offering, setOffering] = useState<string>('0.00');
  const [notes, setNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState('');

  // Initial load logic
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // When class or students change, filter relevant students
  useEffect(() => {
    if (selectedClassId) {
      const filtered = students.filter(s => s.classId === selectedClassId && s.active);
      setClassStudents(filtered);
      
      // Try to load existing record for this date/class
      const allRecords = StorageService.getAttendance();
      const existing = allRecords.find(r => r.classId === selectedClassId && r.date === date);
      
      if (existing) {
        setPresentIds(new Set(existing.presentStudentIds));
        setVisitors(existing.visitorsCount);
        setBibles(existing.biblesCount);
        setMagazines(existing.magazinesCount);
        setOffering(existing.offeringValue.toFixed(2));
        setNotes(existing.notes || '');
      } else {
        // Reset if no record
        setPresentIds(new Set());
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
    }
    setPresentIds(newSet);
  };

  const handleSave = () => {
    if (!selectedClassId) return;

    const record: AttendanceRecord = {
      id: `${date}-${selectedClassId}`, // Composite ID
      date,
      classId: selectedClassId,
      presentStudentIds: Array.from(presentIds),
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <UserCheck className="text-blue-600" />
          Realizar Chamada
        </h2>
        
        {/* Controls */}
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
        {/* Student List */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Lista de Alunos</h3>
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
              {presentIds.size} / {classStudents.length} Presentes
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {classStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum aluno cadastrado nesta classe.
              </div>
            ) : (
              classStudents.map(student => (
                <div 
                  key={student.id} 
                  className={`px-6 py-3 flex items-center justify-between cursor-pointer transition-colors ${presentIds.has(student.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => togglePresence(student.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${presentIds.has(student.id) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className={`font-medium ${presentIds.has(student.id) ? 'text-blue-800' : 'text-gray-700'}`}>{student.name}</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded border flex items-center justify-center ${presentIds.has(student.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                     {presentIds.has(student.id) && <UserCheck size={16} className="text-white" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats Input */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-semibold text-gray-700 mb-2 border-b pb-2">Relatório da Aula</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Visitantes</label>
                <input 
                  type="number" min="0"
                  value={visitors}
                  onChange={(e) => setVisitors(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Bíblias</label>
                <input 
                  type="number" min="0"
                  value={bibles}
                  onChange={(e) => setBibles(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Revistas</label>
                <input 
                  type="number" min="0"
                  value={magazines}
                  onChange={(e) => setMagazines(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Oferta (R$)</label>
                <input 
                  type="number" min="0" step="0.50"
                  value={offering}
                  onChange={(e) => setOffering(e.target.value)}
                  className="w-full mt-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-green-500 text-green-700 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Observações</label>
              <textarea 
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Tema da aula, incidentes, etc..."
              />
            </div>

            <button 
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-md active:scale-95"
            >
              <Save size={18} />
              Salvar Relatório
            </button>
            
            {successMsg && (
              <div className="text-center text-sm text-green-600 bg-green-50 p-2 rounded animate-pulse">
                {successMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
