
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, Edit2, Search, AlertCircle, RefreshCw, UserX, CheckCircle, X, Upload, Download, FileText } from 'lucide-react';
import { Student, Teacher, ClassRoom, User } from '../types';
import { StorageService } from '../services/storage';
import UserManagement from './UserManagement';

interface RegistryProps {
  students: Student[];
  teachers: Teacher[];
  classes: ClassRoom[];
  user: User | null;
  onUpdate: () => void;
}

type TabType = 'students' | 'teachers' | 'classes' | 'users';
type StudentStatusTab = 'active' | 'inactive';

const Registry: React.FC<RegistryProps> = ({ students, teachers, classes, user, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [studentStatusTab, setStudentStatusTab] = useState<StudentStatusTab>('active');
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Selection state for bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete Modal State
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({});

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset selection when tab or status changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, studentStatusTab]);

  const handleOpenModal = (data?: any) => {
    if (data) {
      setFormData({ ...data });
    } else {
      setFormData({ active: true }); // Default for new
    }
    setShowModal(true);
  };

  const handleSave = () => {
    const id = formData.id || Math.random().toString(36).substr(2, 9);
    
    if (activeTab === 'students') {
      const student: Student = {
        id,
        name: formData.name,
        birthDate: formData.birthDate,
        classId: formData.classId,
        phone: formData.phone,
        active: formData.active !== undefined ? formData.active : true
      };
      StorageService.saveStudent(student);
    } else if (activeTab === 'classes') {
      const cls: ClassRoom = {
        id,
        name: formData.name,
        ageRange: formData.ageRange,
        room: formData.room,
        mainTeacherId: formData.mainTeacherId
      };
      StorageService.addClass(cls);
    } else if (activeTab === 'teachers') {
      const teacher: Teacher = {
        id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        classIds: formData.classIds || [] 
      };
      StorageService.addTeacher(teacher);
    }
    
    setShowModal(false);
    onUpdate();
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setItemToDelete('__BULK__');
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    const idsToDelete = itemToDelete === '__BULK__' ? Array.from(selectedIds) : [itemToDelete];
    
    idsToDelete.forEach(id => {
      if (activeTab === 'students') StorageService.deleteStudent(id);
      if (activeTab === 'teachers') StorageService.deleteTeacher(id);
      if (activeTab === 'classes') StorageService.deleteClass(id);
    });
    
    onUpdate();
    setItemToDelete(null);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = (items: any[]) => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  // --- Logic for Low Frequency (4 consecutive absences) ---
  const checkLowFrequency = () => {
    if (!window.confirm("Isso irá verificar todos os alunos ativos. Se tiverem 4 faltas consecutivas recentes, serão movidos para 'Baixa Frequência'. Continuar?")) return;

    const attendance = StorageService.getAttendance();
    const sortedAttendance = [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let movedCount = 0;

    students.forEach(student => {
      if (!student.active) return;

      const classRecords = sortedAttendance.filter(r => r.classId === student.classId);
      
      let consecutiveAbsences = 0;
      for (const record of classRecords) {
        if (record.presentStudentIds.includes(student.id)) {
          break; 
        } else {
          consecutiveAbsences++;
        }
      }

      if (consecutiveAbsences >= 4) {
        StorageService.saveStudent({ ...student, active: false });
        movedCount++;
      }
    });

    alert(`${movedCount} aluno(s) movido(s) para Baixa Frequência.`);
    onUpdate();
  };

  // --- CSV Import/Export Logic ---

  const handleDownloadTemplate = () => {
    let headers = '';
    let example = '';
    let filename = '';

    if (activeTab === 'students') {
      headers = 'Nome;Data Nascimento (AAAA-MM-DD);Nome da Classe (Exato);Telefone';
      example = 'João Silva;2015-05-20;Jardim de Infância;(11) 99999-9999';
      filename = 'modelo_importacao_alunos.csv';
    } else if (activeTab === 'teachers') {
      headers = 'Nome;Telefone;Email';
      example = 'Maria Oliveira;(11) 98888-8888;maria@email.com';
      filename = 'modelo_importacao_professores.csv';
    } else if (activeTab === 'classes') {
      headers = 'Nome da Classe;Faixa Etária;Sala';
      example = 'Adolescentes;13-17 anos;Sala 3';
      filename = 'modelo_importacao_classes.csv';
    }

    const csvContent = `${headers}\n${example}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportTrigger = () => {
    fileInputRef.current?.click();
  };

  const processImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const dataRows = lines.slice(1).filter(line => line.trim() !== '');
      let successCount = 0;

      dataRows.forEach(row => {
        const cols = row.split(/[;,]/).map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (cols.length < 2) return;

        const id = Math.random().toString(36).substr(2, 9);

        if (activeTab === 'students') {
          const [name, birthDate, className, phone] = cols;
          const foundClass = classes.find(c => c.name.toLowerCase() === className?.toLowerCase());
          
          if (name) {
             const student: Student = {
               id,
               name,
               birthDate: birthDate || '',
               classId: foundClass ? foundClass.id : '',
               phone: phone || '',
               active: true
             };
             StorageService.saveStudent(student);
             successCount++;
          }

        } else if (activeTab === 'teachers') {
           const [name, phone, email] = cols;
           if (name) {
             const teacher: Teacher = {
               id,
               name,
               phone: phone || '',
               email: email || '',
               classIds: []
             };
             StorageService.addTeacher(teacher);
             successCount++;
           }

        } else if (activeTab === 'classes') {
           const [name, ageRange, room] = cols;
           if (name) {
             const cls: ClassRoom = {
               id,
               name,
               ageRange: ageRange || '',
               room: room || ''
             };
             StorageService.addClass(cls);
             successCount++;
           }
        }
      });

      alert(`${successCount} registros importados com sucesso!`);
      onUpdate();
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  const filteredStudents = useMemo(() => students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = studentStatusTab === 'active' ? s.active : !s.active;
    return matchesSearch && matchesStatus;
  }), [students, searchTerm, studentStatusTab]);
  
  const filteredTeachers = useMemo(() => teachers.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())), [teachers, searchTerm]);
  const filteredClasses = useMemo(() => classes.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())), [classes, searchTerm]);

  const currentVisibleItems = useMemo(() => {
    if (activeTab === 'students') return filteredStudents;
    if (activeTab === 'teachers') return filteredTeachers;
    if (activeTab === 'classes') return filteredClasses;
    return [];
  }, [activeTab, filteredStudents, filteredTeachers, filteredClasses]);

  const TabButton = ({ id, label }: { id: TabType, label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        activeTab === id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Cadastros</h2>
        <div className="flex flex-wrap gap-2 bg-white p-1 rounded-lg border border-gray-200">
          <TabButton id="students" label="Alunos" />
          <TabButton id="teachers" label="Professores" />
          <TabButton id="classes" label="Classes" />
          {user?.role === 'admin' && (
             <TabButton id="users" label="Usuários" />
          )}
        </div>
      </div>

      {activeTab === 'users' && user?.role === 'admin' ? (
        <UserManagement isEmbedded={true} />
      ) : (
        <>
            {activeTab === 'students' && (
              <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg">
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setStudentStatusTab('active')}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all ${studentStatusTab === 'active' ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <CheckCircle size={16} /> Matriculados
                    </button>
                    <button 
                      type="button"
                      onClick={() => setStudentStatusTab('inactive')}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all ${studentStatusTab === 'inactive' ? 'bg-white text-red-600 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <UserX size={16} /> Baixa Frequência
                    </button>
                  </div>
                  
                  {studentStatusTab === 'active' && (
                    <button 
                      type="button"
                      onClick={checkLowFrequency}
                      className="text-xs flex items-center gap-1 text-orange-600 hover:text-orange-800 hover:bg-orange-50 px-2 py-1 rounded"
                      title="Move alunos com 4 faltas consecutivas para Baixa Frequência"
                    >
                      <RefreshCw size={14} /> Verificar Faltas (4+)
                    </button>
                  )}
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder={`Buscar ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {selectedIds.size > 0 && (
                   <button 
                     type="button"
                     onClick={handleBulkDeleteClick}
                     className="flex items-center justify-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold border border-red-200 hover:bg-red-200 transition-all animate-fade-in"
                   >
                     <Trash2 size={18} /> Excluir ({selectedIds.size})
                   </button>
                )}

                <div className="flex gap-2 mr-2 border-r border-gray-200 pr-4">
                  <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={processImport}
                      accept=".csv"
                      className="hidden"
                  />
                  <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Baixar modelo de exemplo CSV"
                  >
                      <FileText size={16} /> <span className="hidden sm:inline">Modelo</span>
                  </button>
                  <button
                      type="button"
                      onClick={handleImportTrigger}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      title="Importar arquivo CSV"
                  >
                      <Upload size={16} /> <span className="hidden sm:inline">Importar</span>
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
                >
                  <Plus size={18} /> Novo
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs border-b">
                    <tr>
                      <th className="px-6 py-3 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          checked={selectedIds.size > 0 && selectedIds.size === currentVisibleItems.length}
                          onChange={() => toggleSelectAll(currentVisibleItems)}
                        />
                      </th>
                      <th className="px-6 py-3">Nome</th>
                      {activeTab === 'students' && <th className="px-6 py-3">Classe</th>}
                      {activeTab === 'students' && studentStatusTab === 'inactive' && <th className="px-6 py-3 text-red-500">Status</th>}
                      {activeTab === 'classes' && <th className="px-6 py-3">Faixa Etária</th>}
                      {activeTab === 'teachers' && <th className="px-6 py-3">Contato</th>}
                      <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeTab === 'students' && filteredStudents.map(student => (
                      <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(student.id) ? 'bg-blue-50/40' : ''}`}>
                        <td className="px-6 py-4">
                           <input 
                             type="checkbox" 
                             className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                             checked={selectedIds.has(student.id)}
                             onChange={() => toggleSelect(student.id)}
                           />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                        <td className="px-6 py-4">
                          {classes.find(c => c.id === student.classId)?.name || '-'}
                        </td>
                        {studentStatusTab === 'inactive' && <td className="px-6 py-4 text-xs font-bold text-red-500 uppercase">Inativo</td>}
                        <td className="px-6 py-4 text-right space-x-2">
                          <button type="button" onClick={() => handleOpenModal(student)} className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"><Edit2 size={18} /></button>
                          <button type="button" onClick={() => handleDeleteClick(student.id)} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                    
                    {activeTab === 'teachers' && filteredTeachers.map(teacher => (
                      <tr key={teacher.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(teacher.id) ? 'bg-blue-50/40' : ''}`}>
                        <td className="px-6 py-4">
                           <input 
                             type="checkbox" 
                             className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                             checked={selectedIds.has(teacher.id)}
                             onChange={() => toggleSelect(teacher.id)}
                           />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{teacher.name}</td>
                        <td className="px-6 py-4">{teacher.phone}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button type="button" onClick={() => handleOpenModal(teacher)} className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"><Edit2 size={18} /></button>
                          <button type="button" onClick={() => handleDeleteClick(teacher.id)} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}

                    {activeTab === 'classes' && filteredClasses.map(cls => (
                      <tr key={cls.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(cls.id) ? 'bg-blue-50/40' : ''}`}>
                        <td className="px-6 py-4">
                           <input 
                             type="checkbox" 
                             className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                             checked={selectedIds.has(cls.id)}
                             onChange={() => toggleSelect(cls.id)}
                           />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{cls.name}</td>
                        <td className="px-6 py-4">{cls.ageRange}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button type="button" onClick={() => handleOpenModal(cls)} className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"><Edit2 size={18} /></button>
                          <button type="button" onClick={() => handleDeleteClick(cls.id)} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {currentVisibleItems.length === 0 && (
                  <div className="p-8 text-center text-gray-400">Nenhum registro encontrado.</div>
                )}
              </div>
            </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
             <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Registro{itemToDelete === '__BULK__' ? 's' : ''}?</h3>
             <p className="text-sm text-gray-500 mb-6">
               {itemToDelete === '__BULK__' 
                 ? `Tem certeza que deseja excluir os ${selectedIds.size} registros selecionados? Esta ação não pode ser desfeita.`
                 : 'Tem certeza que deseja excluir permanentemente? Esta ação não pode ser desfeita.'
               }
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

      {/* Simple Modal for Add/Edit */}
      {showModal && !((activeTab === 'users' && user?.role === 'admin')) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                {formData.id ? 'Editar' : 'Novo'} Cadastro 
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input 
                  className="w-full border border-gray-300 rounded-md p-2 mt-1"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {activeTab === 'students' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Classe</label>
                    <select 
                      className="w-full border border-gray-300 rounded-md p-2 mt-1"
                      value={formData.classId || ''}
                      onChange={e => setFormData({...formData, classId: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data Nasc.</label>
                    <input type="date"
                      className="w-full border border-gray-300 rounded-md p-2 mt-1"
                      value={formData.birthDate || ''}
                      onChange={e => setFormData({...formData, birthDate: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="activeCheck"
                      checked={formData.active !== false}
                      onChange={e => setFormData({...formData, active: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="activeCheck" className="text-sm text-gray-700">Aluno Matriculado (Ativo)</label>
                  </div>
                </>
              )}

              {activeTab === 'classes' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Faixa Etária</label>
                    <input 
                      className="w-full border border-gray-300 rounded-md p-2 mt-1"
                      value={formData.ageRange || ''}
                      onChange={e => setFormData({...formData, ageRange: e.target.value})}
                      placeholder="Ex: 4-6 anos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sala</label>
                    <input 
                      className="w-full border border-gray-300 rounded-md p-2 mt-1"
                      value={formData.room || ''}
                      onChange={e => setFormData({...formData, room: e.target.value})}
                    />
                  </div>
                </>
              )}

              {activeTab === 'teachers' && (
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone</label>
                    <input 
                      className="w-full border border-gray-300 rounded-md p-2 mt-1"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                 </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registry;
