
import React, { useMemo, useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, LabelList
} from 'recharts';
import { Users, BookOpen, DollarSign, TrendingUp, MapPin, Award, User, Star, Calendar as CalendarIcon, Filter, Edit, Save, X } from 'lucide-react';
import { Student, AttendanceRecord, ClassRoom, ChurchSettings } from '../types';
import { StorageService } from '../services/storage';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  classes: ClassRoom[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; subtext?: string }> = ({ title, value, icon, color, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center transition-transform hover:scale-105">
    <div className={`p-4 rounded-full ${color} text-white mr-4 shadow-sm`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

type FilterType = 'day' | 'month' | 'year';

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, classes }) => {
  const [settings, setSettings] = useState<ChurchSettings | null>(null);
  
  // Filter State
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

  // Edit Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState<ChurchSettings | null>(null);

  useEffect(() => {
    setSettings(StorageService.getSettings());
  }, []);

  // --- Filtering Logic ---
  const filteredAttendance = useMemo(() => {
    return attendance.filter(r => {
      if (filterType === 'day') {
        return r.date === selectedDate;
      }
      if (filterType === 'month') {
        // Match YYYY-MM
        return r.date.startsWith(selectedDate.substring(0, 7));
      }
      if (filterType === 'year') {
        // Match YYYY
        return r.date.startsWith(selectedDate.substring(0, 4));
      }
      return true;
    });
  }, [attendance, filterType, selectedDate]);

  // --- KPI Stats Calculation ---
  const stats = useMemo(() => {
    // Total students is usually a snapshot of "Active Now", 
    // but contextually we might want to know how many were active/enrolled generally.
    const activeStudentsCount = students.filter(s => s.active).length;
    
    const totalOfferings = filteredAttendance.reduce((acc, curr) => acc + curr.offeringValue, 0);
    const totalVisits = filteredAttendance.reduce((acc, curr) => acc + curr.visitorsCount, 0);
    
    // Average attendance per session in the selected period
    // UNIQUE PRESENCE LOGIC: Count unique (StudentID + Date) combinations
    const uniquePresences = new Set<string>();
    filteredAttendance.forEach(record => {
        record.presentStudentIds.forEach(studentId => {
            uniquePresences.add(`${record.date}-${studentId}`);
        });
    });

    const totalPresent = uniquePresences.size;

    // Unique sessions count (e.g. if 4 classes met on 1 day, that's 4 records, but maybe 1 "Session day")
    // Usually avg is per record (per class session).
    const avgAttendance = filteredAttendance.length > 0 ? Math.round(totalPresent / filteredAttendance.length) : 0;

    return { 
        activeStudentsCount, 
        totalOfferings, 
        totalVisits, 
        avgAttendance, 
        totalPresent,
        recordsCount: filteredAttendance.length
    };
  }, [students, filteredAttendance]);

  // --- Charts Data Preparation ---
  const chartData = useMemo(() => {
    // 1. Bar Chart: Attendance by Class (within selected period)
    const classAttendance = classes.map(cls => {
      const records = filteredAttendance.filter(r => r.classId === cls.id);
      
      // Calculate Unique Presences for this class only
      const uniqueClassPresences = new Set<string>();
      records.forEach(r => {
          r.presentStudentIds.forEach(sid => uniqueClassPresences.add(`${r.date}-${sid}`));
      });
      const total = uniqueClassPresences.size;

      const avg = records.length > 0 ? (total / records.length).toFixed(1) : 0;
      return {
        name: cls.name,
        presencas: total,
        media: avg
      };
    }).sort((a, b) => b.presencas - a.presencas);

    // 2. Trend/Evolution Chart
    let trendData: any[] = [];
    
    if (filterType === 'year') {
        // Group by Month (Jan-Dec)
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        trendData = months.map((m, index) => {
            const monthStr = (index + 1).toString().padStart(2, '0');
            const match = `${selectedDate.substring(0, 4)}-${monthStr}`;
            const monthRecords = filteredAttendance.filter(r => r.date.startsWith(match));
            
            // Unique Presences for the Month
            const uniqueMonthPresences = new Set<string>();
            monthRecords.forEach(r => {
                r.presentStudentIds.forEach(sid => uniqueMonthPresences.add(`${r.date}-${sid}`));
            });

            return { name: m, total: uniqueMonthPresences.size };
        });
    } else if (filterType === 'month') {
        // Group by Days (1-31)
        const year = parseInt(selectedDate.split('-')[0]);
        const month = parseInt(selectedDate.split('-')[1]);
        const daysInMonth = new Date(year, month, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = i.toString().padStart(2, '0');
            const dateMatch = `${selectedDate.substring(0, 7)}-${dayStr}`;
            const dayRecords = filteredAttendance.filter(r => r.date === dateMatch);
            
            // Unique Presences for the Day
            const uniqueDayPresences = new Set<string>();
            dayRecords.forEach(r => {
                r.presentStudentIds.forEach(sid => uniqueDayPresences.add(`${r.date}-${sid}`)); // Redundant key since date is same, but keeps logic consistent
            });

            if (dayRecords.length > 0) {
               trendData.push({ name: dayStr, total: uniqueDayPresences.size });
            }
        }
    } else {
        // Filter Type is DAY
        // Let's use it to Compare Presence vs Visitors per class
        trendData = classes.map(cls => {
            const record = filteredAttendance.find(r => r.classId === cls.id);
            // Since it's a single day and single record per class (usually), unique check is simple
            const count = record ? new Set(record.presentStudentIds).size : 0;
            return {
                name: cls.name.split(' ')[0], // Short name
                total: count,
                visitors: record ? record.visitorsCount : 0
            };
        });
    }

    return { classAttendance, trendData };
  }, [filteredAttendance, classes, filterType, selectedDate]);

  // --- Handlers ---
  const handlePrevDate = () => {
    const d = new Date(selectedDate);
    if (filterType === 'day') d.setDate(d.getDate() - 1);
    if (filterType === 'month') d.setMonth(d.getMonth() - 1);
    if (filterType === 'year') d.setFullYear(d.getFullYear() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    if (filterType === 'day') d.setDate(d.getDate() + 1);
    if (filterType === 'month') d.setMonth(d.getMonth() + 1);
    if (filterType === 'year') d.setFullYear(d.getFullYear() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getFilterLabel = () => {
      if (filterType === 'day') {
          const [y, m, d] = selectedDate.split('-');
          return `${d}/${m}/${y}`;
      }
      if (filterType === 'month') {
          const [y, m] = selectedDate.split('-');
          const monthName = new Date(parseInt(y), parseInt(m)-1).toLocaleString('pt-BR', { month: 'long' });
          return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${y}`;
      }
      return selectedDate.split('-')[0]; // Year
  };

  const openSettingsModal = () => {
      if (settings) {
          setTempSettings(JSON.parse(JSON.stringify(settings))); // Deep copy
          setShowSettingsModal(true);
      }
  };

  const handleSaveSettings = () => {
      if (tempSettings) {
          StorageService.saveSettings(tempSettings);
          setSettings(tempSettings);
          setShowSettingsModal(false);
      }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Bar - Static */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
           {settings && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                 <MapPin size={12} /> {settings.churchName}
              </p>
           )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
           {/* Type Select */}
           <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button onClick={() => setFilterType('day')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${filterType === 'day' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Dia</button>
              <button onClick={() => setFilterType('month')} className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-r border-gray-200 ${filterType === 'month' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Mês</button>
              <button onClick={() => setFilterType('year')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${filterType === 'year' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Ano</button>
           </div>

           {/* Date Picker Control */}
           <div className="flex items-center gap-2">
              <button onClick={handlePrevDate} className="p-1 text-gray-500 hover:bg-gray-200 rounded-full font-bold">{'<'}</button>
              
              <div className="relative">
                 <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 px-3 py-1.5 rounded-lg min-w-[140px] justify-center hover:border-blue-400 transition-colors group">
                    <CalendarIcon size={16} className="text-blue-500" />
                    <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700">{getFilterLabel()}</span>
                    
                    {/* Invisible Inputs for triggering browser pickers */}
                    {filterType === 'day' && (
                        <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                    )}
                    {filterType === 'month' && (
                        <input type="month" className="absolute inset-0 opacity-0 cursor-pointer" value={selectedDate.substring(0, 7)} onChange={e => setSelectedDate(e.target.value + '-01')} />
                    )}
                    {filterType === 'year' && (
                        <input type="number" min="2000" max="2100" className="absolute inset-0 opacity-0 cursor-pointer" value={selectedDate.substring(0, 4)} onChange={e => setSelectedDate(e.target.value + '-01-01')} />
                    )}
                 </label>
              </div>

              <button onClick={handleNextDate} className="p-1 text-gray-500 hover:bg-gray-200 rounded-full font-bold">{'>'}</button>
           </div>
        </div>
      </div>
      
      {/* Animated Content Wrapper - Re-renders animation when key changes */}
      <div key={`${filterType}-${selectedDate}`} className="space-y-6 animate-fade-in">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
            title="Total Alunos (Ativos)" 
            value={stats.activeStudentsCount} 
            icon={<Users size={24} />} 
            color="bg-blue-500"
            subtext="Base de cadastros"
            />
            <StatCard 
            title="Ofertas no Período" 
            value={`R$ ${stats.totalOfferings.toFixed(2)}`} 
            icon={<DollarSign size={24} />} 
            color="bg-green-500" 
            subtext={`${stats.recordsCount} relatórios somados`}
            />
            <StatCard 
            title="Total Visitantes" 
            value={stats.totalVisits} 
            icon={<TrendingUp size={24} />} 
            color="bg-purple-500" 
            subtext="No período selecionado"
            />
            <StatCard 
            title="Presenças Totais" 
            value={stats.totalPresent} 
            icon={<BookOpen size={24} />} 
            color="bg-orange-500" 
            subtext={`Contagem única (Dia/Aluno)`}
            />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance by Class */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Presença por Classe</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">No período</span>
            </div>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                {chartData.classAttendance.every(d => d.presencas === 0) ? (
                    <div className="flex h-full items-center justify-center text-gray-400 text-sm">Sem dados neste período</div>
                ) : (
                    <BarChart data={chartData.classAttendance} margin={{ top: 20 }}>
                        <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tickFormatter={(val) => val.split(' ')[0]} />
                        <YAxis axisLine={false} tickLine={false} fontSize={12} />
                        <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="presencas" fill="url(#barGradient)" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="presencas" position="top" fill="#64748b" fontSize={12} />
                        </Bar>
                    </BarChart>
                )}
                </ResponsiveContainer>
            </div>
            </div>

            {/* Evolution Trend */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                    {filterType === 'day' ? 'Comparativo do Dia' : 'Evolução Temporal'}
                </h3>
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold uppercase">{filterType === 'year' ? 'Mensal' : (filterType === 'month' ? 'Diária' : 'Por Classe')}</span>
            </div>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                {chartData.trendData.length === 0 || chartData.trendData.every(d => d.total === 0) ? (
                    <div className="flex h-full items-center justify-center text-gray-400 text-sm">Sem dados suficientes para gráfico</div>
                ) : (
                    <LineChart data={chartData.trendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                        <YAxis axisLine={false} tickLine={false} fontSize={12} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Line 
                        type="monotone" 
                        dataKey="total" 
                        name="Presenças Únicas"
                        stroke="#8b5cf6" 
                        strokeWidth={3} 
                        dot={{r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff'}} 
                        activeDot={{r: 6}}
                        animationDuration={1000}
                        />
                        {filterType === 'day' && (
                            <Line 
                            type="monotone" 
                            dataKey="visitors" 
                            name="Visitantes"
                            stroke="#ec4899" 
                            strokeWidth={3} 
                            dot={{r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#fff'}} 
                            />
                        )}
                    </LineChart>
                )}
                </ResponsiveContainer>
            </div>
            </div>
        </div>
      </div>

      {/* Administration Info - Static */}
      {settings && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
                <Award size={20} className="text-indigo-600" />
                <h3 className="font-semibold text-gray-800">Administração EBD</h3>
            </div>
            {/* Edit Button */}
            <button 
                onClick={openSettingsModal}
                className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold"
            >
                <Edit size={16} /> Editar Dados
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 p-6 text-sm">
            <div className="lg:col-span-1 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
              <p className="text-xs font-bold text-yellow-600 uppercase mb-1">Presidência</p>
              <div className="flex items-start gap-2">
                <Star size={16} className="text-yellow-500 mt-1 fill-yellow-500" />
                <p className="font-bold text-gray-800">{settings.leadership.pastorPresidente}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Dirigentes</p>
              <div className="flex items-start gap-2">
                <User size={16} className="text-gray-400 mt-1" />
                <p className="font-medium text-gray-800">{settings.leadership.dirigentes}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Superintendência</p>
              <div className="flex items-start gap-2">
                <User size={16} className="text-gray-400 mt-1" />
                <p className="font-medium text-gray-800">{settings.leadership.superintendentes}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Secretaria</p>
              <div className="flex items-start gap-2">
                <User size={16} className="text-gray-400 mt-1" />
                <p className="font-medium text-gray-800">{settings.leadership.secretarios}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Tesouraria</p>
              <div className="flex items-start gap-2">
                <User size={16} className="text-gray-400 mt-1" />
                <p className="font-medium text-gray-800">{settings.leadership.tesoureiro}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Settings Modal */}
      {showSettingsModal && tempSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                         <Award size={24} className="text-blue-600" />
                         Editar Dados da Igreja e Administração
                      </h3>
                      <button 
                        onClick={() => setShowSettingsModal(false)}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full"
                      >
                         <X size={24} />
                      </button>
                  </div>
                  
                  <div className="space-y-6">
                      {/* Section 1: Church Info */}
                      <div className="space-y-4">
                          <h4 className="font-bold text-gray-700 bg-gray-50 p-2 rounded border-l-4 border-blue-500">
                             Informações da Igreja
                          </h4>
                          <div>
                              <label className="block text-sm font-semibold text-gray-600 mb-1">Nome da Igreja / Ministério</label>
                              <input 
                                  value={tempSettings.churchName}
                                  onChange={(e) => setTempSettings({...tempSettings, churchName: e.target.value})}
                                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-gray-600 mb-1">Endereço / Campo Eclesiástico</label>
                              <input 
                                  value={tempSettings.address}
                                  onChange={(e) => setTempSettings({...tempSettings, address: e.target.value})}
                                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                      </div>

                      {/* Section 2: Leadership */}
                      <div className="space-y-4">
                          <h4 className="font-bold text-gray-700 bg-gray-50 p-2 rounded border-l-4 border-yellow-500">
                             Administração EBD
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-semibold text-gray-600 mb-1">Pastor Presidente</label>
                                  <input 
                                      value={tempSettings.leadership.pastorPresidente}
                                      onChange={(e) => setTempSettings({
                                          ...tempSettings, 
                                          leadership: { ...tempSettings.leadership, pastorPresidente: e.target.value }
                                      })}
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-semibold text-gray-600 mb-1">Dirigentes Locais</label>
                                  <input 
                                      value={tempSettings.leadership.dirigentes}
                                      onChange={(e) => setTempSettings({
                                          ...tempSettings, 
                                          leadership: { ...tempSettings.leadership, dirigentes: e.target.value }
                                      })}
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-semibold text-gray-600 mb-1">Superintendência</label>
                                  <input 
                                      value={tempSettings.leadership.superintendentes}
                                      onChange={(e) => setTempSettings({
                                          ...tempSettings, 
                                          leadership: { ...tempSettings.leadership, superintendentes: e.target.value }
                                      })}
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-semibold text-gray-600 mb-1">Secretaria</label>
                                  <input 
                                      value={tempSettings.leadership.secretarios}
                                      onChange={(e) => setTempSettings({
                                          ...tempSettings, 
                                          leadership: { ...tempSettings.leadership, secretarios: e.target.value }
                                      })}
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                              </div>
                              <div className="md:col-span-2">
                                  <label className="block text-sm font-semibold text-gray-600 mb-1">Tesouraria</label>
                                  <input 
                                      value={tempSettings.leadership.tesoureiro}
                                      onChange={(e) => setTempSettings({
                                          ...tempSettings, 
                                          leadership: { ...tempSettings.leadership, tesoureiro: e.target.value }
                                      })}
                                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-4 mt-8 pt-4 border-t border-gray-100">
                      <button 
                          onClick={() => setShowSettingsModal(false)}
                          className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={handleSaveSettings}
                          className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2"
                      >
                          <Save size={18} /> Salvar Alterações
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
