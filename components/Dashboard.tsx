
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, LabelList
} from 'recharts';
import { Users, BookOpen, DollarSign, TrendingUp, MapPin, Award, User, Star, Calendar as CalendarIcon, Filter, Edit, Save, X, Image as ImageIcon, Upload, Download, RefreshCw } from 'lucide-react';
import { Student, AttendanceRecord, ClassRoom, ChurchSettings } from '../types';
import { StorageService } from '../services/storage';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  classes: ClassRoom[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; subtext?: string }> = ({ title, value, icon, color, subtext }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center transition-transform hover:scale-105">
    <div className={`p-4 rounded-full ${color} text-white mr-4 shadow-sm`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{value}</h3>
      {subtext && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>}
    </div>
  </div>
);

type FilterType = 'day' | 'month' | 'quarter' | 'year';

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, classes }) => {
  const [settings, setSettings] = useState<ChurchSettings | null>(null);
  
  // Filter State
  const [filterType, setFilterType] = useState<FilterType>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

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
        return r.date.startsWith(selectedDate.substring(0, 7));
      }
      if (filterType === 'year') {
        return r.date.startsWith(selectedDate.substring(0, 4));
      }
      if (filterType === 'quarter') {
        const date = new Date(selectedDate);
        const year = date.getFullYear();
        const quarter = Math.floor(date.getMonth() / 3);
        const startMonth = quarter * 3;
        const endMonth = startMonth + 2;
        
        const rDate = new Date(r.date + 'T00:00:00');
        const rYear = rDate.getFullYear();
        const rMonth = rDate.getMonth();
        
        return rYear === year && rMonth >= startMonth && rMonth <= endMonth;
      }
      return true;
    });
  }, [attendance, filterType, selectedDate]);

  // --- KPI Stats Calculation ---
  const stats = useMemo(() => {
    const activeStudentsCount = students.filter(s => s.active).length;
    
    const totalOfferings = filteredAttendance.reduce((acc, curr) => acc + curr.offeringValue, 0);
    const totalVisits = filteredAttendance.reduce((acc, curr) => acc + curr.visitorsCount, 0);
    
    const uniquePresences = new Set<string>();
    filteredAttendance.forEach(record => {
        record.presentStudentIds.forEach(studentId => {
            uniquePresences.add(`${record.date}-${studentId}`);
        });
    });

    const totalPresent = uniquePresences.size;
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
    const classAttendance = classes.map(cls => {
      const records = filteredAttendance.filter(r => r.classId === cls.id);
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

    let trendData: any[] = [];
    
    if (filterType === 'year') {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        trendData = months.map((m, index) => {
            const monthStr = (index + 1).toString().padStart(2, '0');
            const match = `${selectedDate.substring(0, 4)}-${monthStr}`;
            const monthRecords = filteredAttendance.filter(r => r.date.startsWith(match));
            const uniqueMonthPresences = new Set<string>();
            monthRecords.forEach(r => {
                r.presentStudentIds.forEach(sid => uniqueMonthPresences.add(`${r.date}-${sid}`));
            });
            return { name: m, total: uniqueMonthPresences.size };
        });
    } else if (filterType === 'quarter') {
        const date = new Date(selectedDate);
        const quarter = Math.floor(date.getMonth() / 3);
        const startMonth = quarter * 3;
        const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        for (let i = 0; i < 3; i++) {
            const mIdx = startMonth + i;
            const monthStr = (mIdx + 1).toString().padStart(2, '0');
            const match = `${date.getFullYear()}-${monthStr}`;
            const monthRecords = filteredAttendance.filter(r => r.date.startsWith(match));
            const uniqueMonthPresences = new Set<string>();
            monthRecords.forEach(r => {
                r.presentStudentIds.forEach(sid => uniqueMonthPresences.add(`${r.date}-${sid}`));
            });
            trendData.push({ name: monthsNames[mIdx], total: uniqueMonthPresences.size });
        }
    } else if (filterType === 'month') {
        const year = parseInt(selectedDate.split('-')[0]);
        const month = parseInt(selectedDate.split('-')[1]);
        const daysInMonth = new Date(year, month, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = i.toString().padStart(2, '0');
            const dateMatch = `${selectedDate.substring(0, 7)}-${dayStr}`;
            const dayRecords = filteredAttendance.filter(r => r.date === dateMatch);
            const uniqueDayPresences = new Set<string>();
            dayRecords.forEach(r => {
                r.presentStudentIds.forEach(sid => uniqueDayPresences.add(`${r.date}-${sid}`));
            });

            if (dayRecords.length > 0) {
               trendData.push({ name: dayStr, total: uniqueDayPresences.size });
            }
        }
    } else {
        trendData = classes.map(cls => {
            const record = filteredAttendance.find(r => r.classId === cls.id);
            const count = record ? new Set(record.presentStudentIds).size : 0;
            return {
                name: cls.name.split(' ')[0],
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
    if (filterType === 'quarter') d.setMonth(d.getMonth() - 3);
    if (filterType === 'year') d.setFullYear(d.getFullYear() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    if (filterType === 'day') d.setDate(d.getDate() + 1);
    if (filterType === 'month') d.setMonth(d.getMonth() + 1);
    if (filterType === 'quarter') d.setMonth(d.getMonth() + 3);
    if (filterType === 'year') d.setFullYear(d.getFullYear() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getFilterLabel = () => {
      const d = new Date(selectedDate);
      if (filterType === 'day') {
          const [y, m, d_val] = selectedDate.split('-');
          return `${d_val}/${m}/${y}`;
      }
      if (filterType === 'month') {
          const [y, m] = selectedDate.split('-');
          const monthName = new Date(parseInt(y), parseInt(m)-1).toLocaleString('pt-BR', { month: 'long' });
          return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${y}`;
      }
      if (filterType === 'quarter') {
          const quarter = Math.floor(d.getMonth() / 3) + 1;
          return `${quarter}º Trimestre ${d.getFullYear()}`;
      }
      return selectedDate.split('-')[0]; // Year
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Visão Geral</h2>
           {settings && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                 <MapPin size={12} /> {settings.churchName}
              </p>
           )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 dark:bg-gray-700 p-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
           {/* Type Select */}
           <div className="flex bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
              <button onClick={() => setFilterType('day')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${filterType === 'day' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Dia</button>
              <button onClick={() => setFilterType('month')} className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-600 ${filterType === 'month' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Mês</button>
              <button onClick={() => setFilterType('quarter')} className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-r border-gray-200 dark:border-gray-600 ${filterType === 'quarter' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Trimestre</button>
              <button onClick={() => setFilterType('year')} className={`px-3 py-1.5 text-sm font-medium transition-colors ${filterType === 'year' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Ano</button>
           </div>

           {/* Date Picker Control */}
           <div className="flex items-center gap-2">
              <button onClick={handlePrevDate} className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full font-bold">{'<'}</button>
              
              <div className="relative">
                 <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg min-w-[140px] justify-center hover:border-blue-400 transition-colors group">
                    <CalendarIcon size={16} className="text-blue-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-700">{getFilterLabel()}</span>
                    
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

              <button onClick={handleNextDate} className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full font-bold">{'>'}</button>
           </div>
        </div>
      </div>
      
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Presença por Classe</h3>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded">No período</span>
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tickFormatter={(val) => val.split(' ')[0]} />
                        <YAxis axisLine={false} tickLine={false} fontSize={12} />
                        <Tooltip cursor={{fill: 'rgba(249, 250, 251, 0.1)'}} contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#1f2937', color: '#fff'}} />
                        <Bar dataKey="presencas" fill="url(#barGradient)" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="presencas" position="top" fill="#64748b" fontSize={12} />
                        </Bar>
                    </BarChart>
                )}
                </ResponsiveContainer>
            </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {filterType === 'day' ? 'Comparativo do Dia' : 'Evolução Temporal'}
                </h3>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200 px-2 py-1 rounded font-bold uppercase">
                    {filterType === 'year' ? 'Mensal' : (filterType === 'quarter' ? 'Trimestral' : (filterType === 'month' ? 'Diária' : 'Por Classe'))}
                </span>
            </div>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                {chartData.trendData.length === 0 || chartData.trendData.every(d => d.total === 0) ? (
                    <div className="flex h-full items-center justify-center text-gray-400 text-sm">Sem dados suficientes para gráfico</div>
                ) : (
                    <LineChart data={chartData.trendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                        <YAxis axisLine={false} tickLine={false} fontSize={12} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#1f2937', color: '#fff'}} />
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

      {/* Administration Info */}
      {settings && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 text-gray-800 dark:text-white">
                <Award size={20} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold">Administração EBD</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 p-6 text-sm">
            <div className="lg:col-span-1 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/40">
              <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase mb-1">Presidência</p>
              <div className="flex items-start gap-2">
                <Star size={16} className="text-yellow-500 mt-1 fill-yellow-500" />
                <p className="font-bold text-gray-800 dark:text-gray-200">{settings.leadership.pastorPresidente}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Dirigentes</p>
              <div className="flex items-start gap-2">
                <User size={16} className="text-gray-400 mt-1" />
                <p className="font-medium text-gray-800 dark:text-gray-200">{settings.leadership.dirigentes}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Superintendência</p>
              <div className="flex items-start gap-2">
                <User size={16} className="text-gray-400 mt-1" />
                <p className="font-medium text-gray-800 dark:text-gray-200">{settings.leadership.superintendentes}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Secretaria</p>
              <div className="flex items-start gap-2">
                <User size={16} className="text-gray-400 mt-1" />
                <p className="font-medium text-gray-800 dark:text-gray-200">{settings.leadership.secretarios}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Tesouraria</p>
              <div className="flex items-start gap-2">
                <User size={16} className="text-gray-400 mt-1" />
                <p className="font-medium text-gray-800 dark:text-gray-200">{settings.leadership.tesoureiro}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
