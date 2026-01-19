import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Users, Search, Download, FileSpreadsheet, Calendar, Medal, Trophy, Filter, Sun, CloudRain, CloudAlert, User, X, CheckSquare, Square, FileText, Cake } from 'lucide-react';
import { ClassRoom, AttendanceRecord, Student, Teacher } from '../types';
import { StorageService } from '../services/storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportsProps {
  classes: ClassRoom[];
  attendance: AttendanceRecord[];
  students: Student[];
  teachers: Teacher[];
}

type WeatherStatus = 'bom' | 'ameacador' | 'chuvoso' | '';

const Reports: React.FC<ReportsProps> = ({ classes, attendance, students, teachers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [activeReportTab, setActiveReportTab] = useState<'classes' | 'ranking'>('classes');
  
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus>('bom');
  const [sundayNumber, setSundayNumber] = useState<number>(1);

  const settings = useMemo(() => StorageService.getSettings(), []);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 2023; i <= 2030; i++) {
      years.push(i);
    }
    return years;
  }, []);

  useEffect(() => {
    if (startDate) {
      const dateParts = startDate.split('-').map(Number);
      const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const dayOfMonth = d.getDate();
      const calculatedSundayNum = Math.ceil(dayOfMonth / 7);
      setSundayNumber(calculatedSundayNum);
    }
  }, [startDate]);

  useEffect(() => {
    if (selectedQuarter) {
      const q = parseInt(selectedQuarter);
      const year = selectedYear;
      let start = '';
      let end = '';

      switch (q) {
        case 1: start = `${year}-01-01`; end = `${year}-03-31`; break;
        case 2: start = `${year}-04-01`; end = `${year}-06-30`; break;
        case 3: start = `${year}-07-01`; end = `${year}-09-30`; break;
        case 4: start = `${year}-10-01`; end = `${year}-12-31`; break;
      }
      setStartDate(start);
      setEndDate(end);
    }
  }, [selectedQuarter, selectedYear]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const filteredAttendance = useMemo(() => {
    return attendance.filter(r => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });
  }, [attendance, startDate, endDate]);

  const classRanking = useMemo(() => {
    return classes.map(cls => {
      const classRecords = filteredAttendance.filter(r => r.classId === cls.id);
      const activeStudents = students.filter(s => s.classId === cls.id && s.active);
      const enrolledCount = activeStudents.length;
      
      const totalPresent = classRecords.reduce((acc, r) => acc + r.presentStudentIds.length, 0);
      const totalVisitors = classRecords.reduce((acc, r) => acc + r.visitorsCount, 0);
      const totalBibles = classRecords.reduce((acc, r) => acc + r.biblesCount, 0);
      const totalMagazines = classRecords.reduce((acc, r) => acc + r.magazinesCount, 0);
      const totalOfferings = classRecords.reduce((acc, r) => acc + r.offeringValue, 0);
      
      const sessions = classRecords.length;
      const totalPotentialPresence = sessions * enrolledCount;
      const percentage = totalPotentialPresence > 0 ? (totalPresent / totalPotentialPresence) * 100 : 0;

      // Logic to find the teacher: 1. From Attendance Record, 2. Main Class Teacher
      const registeredTeacherId = classRecords.length > 0 ? classRecords[0].registeredByTeacherId : null;
      const teacherToDisplay = teachers.find(t => t.id === (registeredTeacherId || cls.mainTeacherId));

      return {
        ...cls,
        teacherName: teacherToDisplay ? teacherToDisplay.name : 'Não especificado',
        enrolledCount,
        totalPresent,
        totalAbsent: Math.max(0, totalPotentialPresence - totalPresent),
        totalVisitors,
        totalPV: totalPresent + totalVisitors,
        totalBibles,
        totalMagazines,
        totalOfferings,
        percentage,
        sessions,
        pot: totalPotentialPresence
      };
    }).sort((a, b) => b.percentage - a.percentage); 
  }, [classes, filteredAttendance, students, teachers]);

  const globalStats = useMemo(() => {
    return classRanking.reduce((acc, curr) => ({
      matr: acc.matr + curr.enrolledCount,
      pres: acc.pres + curr.totalPresent,
      abs: acc.abs + curr.totalAbsent,
      vis: acc.vis + curr.totalVisitors,
      pv: acc.pv + curr.totalPV,
      bibles: acc.bibles + curr.totalBibles,
      magazines: acc.magazines + curr.totalMagazines,
      offers: acc.offers + curr.totalOfferings,
      pot: acc.pot + curr.pot
    }), { matr: 0, pres: 0, abs: 0, vis: 0, pv: 0, bibles: 0, magazines: 0, offers: 0, pot: 0 });
  }, [classRanking]);

  const globalPercentage = globalStats.pot > 0 ? (globalStats.pres / globalStats.pot) * 100 : 0;

  const studentStats = useMemo(() => {
    return students
      .filter(s => s.active) 
      .map(student => {
        const classRecords = filteredAttendance.filter(r => r.classId === student.classId);
        const totalClasses = classRecords.length;
        const presentCount = classRecords.filter(r => r.presentStudentIds.includes(student.id)).length;
        const percentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;
        
        return {
          id: student.id,
          name: student.name,
          classId: student.classId,
          className: classes.find(c => c.id === student.classId)?.name || 'Sem Classe',
          presentCount,
          totalClasses,
          percentage
        };
      })
      .sort((a, b) => {
          if (b.percentage !== a.percentage) return b.percentage - a.percentage;
          return b.presentCount - a.presentCount;
      });
  }, [students, filteredAttendance, classes]);

  const filteredStudentRanking = useMemo(() => {
      const lowerTerm = searchTerm.toLowerCase();
      return studentStats.filter(s => {
          const matchesSearch = s.name.toLowerCase().includes(lowerTerm);
          const matchesClass = classFilter === '' || s.classId === classFilter;
          return matchesSearch && matchesClass;
      });
  }, [studentStats, searchTerm, classFilter]);

  const prevWeekBirthdays = useMemo(() => {
    if (!startDate) return [];
    
    // Use the start date of the report as anchor
    const reportDate = new Date(startDate + 'T12:00:00');
    
    // Range is [reportDate - 7 days, reportDate - 1 day]
    const startRange = new Date(reportDate);
    startRange.setDate(reportDate.getDate() - 7);
    
    const endRange = new Date(reportDate);
    endRange.setDate(reportDate.getDate() - 1);
    
    return students.filter(s => {
      if (!s.active || !s.birthDate) return false;
      const [by, bm, bd] = s.birthDate.split('-').map(Number);
      
      // Compare only Month and Day by creating a dummy date in the report year
      const bdayThisYear = new Date(reportDate.getFullYear(), bm - 1, bd, 12, 0, 0);
      
      // Handle the turn of the year case (if startRange is in Dec and endRange is in Jan)
      if (startRange.getFullYear() !== endRange.getFullYear()) {
         const bdayPrevYear = new Date(startRange.getFullYear(), bm - 1, bd, 12, 0, 0);
         return (bdayThisYear >= startRange && bdayThisYear <= endRange) || 
                (bdayPrevYear >= startRange && bdayPrevYear <= endRange);
      }
      
      return bdayThisYear >= startRange && bdayThisYear <= endRange;
    }).sort((a, b) => {
        const da = parseInt(a.birthDate.split('-')[2]);
        const db = parseInt(b.birthDate.split('-')[2]);
        return da - db;
    });
  }, [students, startDate]);

  const drawHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    if (settings.logoUrl) {
        try {
            const logoFormat = settings.logoUrl.includes('png') ? 'PNG' : 'JPEG';
            doc.addImage(settings.logoUrl, logoFormat, 15, 10, 22, 22);
        } catch (e) {
            console.warn('Erro ao carregar logo no PDF', e);
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('ESCOLA BÍBLICA DOMINICAL', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(settings?.churchName || 'EBD Gestor Pro', pageWidth / 2, 24, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(title.toUpperCase(), pageWidth / 2, 32, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 36, pageWidth - 15, 36);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    drawHeader(doc, 'Relatório Geral das Classes');
    
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const weatherText = `Tempo: Bom [${weatherStatus === 'bom' ? 'X' : ' '}] Ameaçador [${weatherStatus === 'ameacador' ? 'X' : ' '}] Chuvoso [${weatherStatus === 'chuvoso' ? 'X' : ' '}]`;
    const headerInfo = `${sundayNumber}º Domingo | Data: ${formatDateDisplay(startDate)} | ${weatherText}`;
    doc.text(headerInfo, pageWidth / 2, 42, { align: 'center' });

    const classRows = classRanking.map((cls) => [
      cls.name, 
      cls.teacherName, 
      cls.enrolledCount.toString(), 
      cls.totalPresent.toString(), 
      cls.totalAbsent.toString(), 
      cls.totalVisitors.toString(), 
      cls.totalPV.toString(),
      cls.totalBibles.toString(), 
      cls.totalMagazines.toString(), 
      `R$ ${cls.totalOfferings.toFixed(2)}`, 
      `${cls.percentage.toFixed(0)}%`
    ]);

    const totalRow = [
      'TOTAL GERAL', 
      '', 
      globalStats.matr.toString(), 
      globalStats.pres.toString(), 
      globalStats.abs.toString(), 
      globalStats.vis.toString(), 
      globalStats.pv.toString(),
      globalStats.bibles.toString(), 
      globalStats.magazines.toString(), 
      `R$ ${globalStats.offers.toFixed(2)}`, 
      `${globalPercentage.toFixed(1)}%`
    ];

    autoTable(doc, {
      startY: 48,
      margin: { left: 10, right: 10 },
      head: [['Classe', 'Professor', 'Matr.', 'Pres.', 'Aus.', 'Vis.', 'P+V', 'Bíb.', 'Rev.', 'Ofertas', '%']],
      body: [...classRows, totalRow],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], fontSize: 8, halign: 'center' },
      styles: { fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 'auto' }, 
          1: { cellWidth: 'auto' }, 
          2: { halign: 'center', cellWidth: 10 }, 
          3: { halign: 'center', cellWidth: 10 }, 
          4: { halign: 'center', cellWidth: 10 }, 
          5: { halign: 'center', cellWidth: 10 }, 
          6: { halign: 'center', fontStyle: 'bold', cellWidth: 10 },
          7: { halign: 'center', cellWidth: 10 },
          8: { halign: 'center', cellWidth: 10 }, 
          9: { halign: 'center', cellWidth: 20 }, 
          10: { halign: 'center', fontStyle: 'bold', cellWidth: 12 }
      },
      didParseCell: (data) => {
        if (data.row.index === classRows.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Birthday Footer in PDF
    if (prevWeekBirthdays.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('ANIVERSARIANTES DA SEMANA ANTERIOR:', 15, finalY);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const birthdayNames = prevWeekBirthdays.map(s => {
           const [y, m, d] = s.birthDate.split('-');
           return `${s.name} (${d}/${m})`;
        }).join(', ');
        
        const splitNames = doc.splitTextToSize(birthdayNames, pageWidth - 30);
        doc.text(splitNames, 15, finalY + 5);
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('Nenhum aniversariante registrado na semana anterior.', 15, finalY);
    }

    doc.save(`relatorio_geral_ebd_${startDate}.pdf`);
  };

  const handleExportExcel = () => {
    const data = classRanking.map(cls => ({
        'Classe': cls.name,
        'Professor': cls.teacherName,
        'Matrícula': cls.enrolledCount,
        'Presença': cls.totalPresent,
        'Faltas': cls.totalAbsent,
        'Visitantes': cls.totalVisitors,
        'Presença + Visitantes': cls.totalPV,
        'Bíblias': cls.totalBibles,
        'Revistas': cls.totalMagazines,
        'Ofertas (R$)': cls.totalOfferings,
        'Frequência (%)': `${cls.percentage.toFixed(1)}%`
    }));

    data.push({
        'Classe': 'TOTAL GERAL',
        'Professor': '',
        'Matrícula': globalStats.matr,
        'Presença': globalStats.pres,
        'Faltas': globalStats.abs,
        'Visitantes': globalStats.vis,
        'Presença + Visitantes': globalStats.pv,
        'Bíblias': globalStats.bibles,
        'Revistas': globalStats.magazines,
        'Ofertas (R$)': globalStats.offers,
        'Frequência (%)': `${globalPercentage.toFixed(1)}%`
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Geral");
    XLSX.writeFile(workbook, `relatorio_ebd_${startDate}.xlsx`);
  };

  const handleExportRankingPDF = () => {
      const doc = new jsPDF();
      drawHeader(doc, 'Ranking de Frequência de Alunos');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${formatDateDisplay(startDate)} até ${formatDateDisplay(endDate)}`, doc.internal.pageSize.getWidth() / 2, 42, { align: 'center' });

      const rankingRows = filteredStudentRanking.map((s, idx) => [
          (idx + 1).toString(),
          s.name,
          s.className,
          s.presentCount.toString(),
          s.totalClasses.toString(),
          `${s.percentage.toFixed(1)}%`
      ]);

      autoTable(doc, {
          startY: 48,
          head: [['Pos.', 'Nome do Aluno', 'Classe', 'Presenças', 'Aulas Totais', '% Freq.']],
          body: rankingRows,
          theme: 'striped',
          headStyles: { fillColor: [245, 158, 11], fontSize: 9, halign: 'center' },
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
              0: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
              3: { halign: 'center', cellWidth: 25 },
              4: { halign: 'center', cellWidth: 25 },
              5: { halign: 'center', fontStyle: 'bold', cellWidth: 25 }
          }
      });

      doc.save(`ranking_alunos_ebd_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportRankingExcel = () => {
      const data = filteredStudentRanking.map((s, idx) => ({
          'Posição': idx + 1,
          'Nome do Aluno': s.name,
          'Classe': s.className,
          'Presenças': s.presentCount,
          'Aulas Totais': s.totalClasses,
          'Frequência (%)': `${s.percentage.toFixed(1)}%`
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ranking");
      XLSX.writeFile(workbook, `ranking_alunos_ebd_${startDate}.xlsx`);
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600 bg-green-100';
    if (pct >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <PieChart className="text-purple-600" />
            Relatórios e Estatísticas
        </h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Período / Trimestre</label>
                <div className="flex gap-2">
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none">
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)} className="border border-gray-200 rounded-xl p-3 text-sm font-bold bg-blue-50 text-blue-700 outline-none">
                        <option value="">Personalizado</option>
                        <option value="1">1º Trimestre</option>
                        <option value="2">2º Trimestre</option>
                        <option value="3">3º Trimestre</option>
                        <option value="4">4º Trimestre</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Escolher Data</label>
                <div className="flex gap-2">
                    <input type="date" value={startDate} onChange={e => {setStartDate(e.target.value); setEndDate(e.target.value); setSelectedQuarter('');}} className="border border-gray-200 rounded-xl p-3 text-sm outline-none" />
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Clima</label>
                <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                    <button onClick={() => setWeatherStatus('bom')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${weatherStatus === 'bom' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500'}`}><Sun size={14} /> Bom</button>
                    <button onClick={() => setWeatherStatus('ameacador')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${weatherStatus === 'ameacador' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500'}`}><CloudAlert size={14} /> Ameaçador</button>
                    <button onClick={() => setWeatherStatus('chuvoso')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${weatherStatus === 'chuvoso' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500'}`}><CloudRain size={14} /> Chuvoso</button>
                </div>
            </div>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setActiveReportTab('classes')} className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeReportTab === 'classes' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><Users size={18} /> Relatório Geral das Classes</button>
          <button onClick={() => setActiveReportTab('ranking')} className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeReportTab === 'ranking' ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><Medal size={18} /> Ranking de Alunos</button>
      </div>

      {activeReportTab === 'classes' ? (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                <div className="bg-gray-50 px-6 py-6 border-b border-gray-100 text-center relative">
                    {settings.logoUrl && (
                        <img src={settings.logoUrl} className="absolute left-6 top-1/2 -translate-y-1/2 h-16 w-16 object-contain hidden md:block" alt="Logo Igreja" />
                    )}
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-1 block">Escola Bíblica Dominical</span>
                    <h3 className="font-black text-gray-800 uppercase tracking-tighter text-2xl mb-1">{settings?.churchName || 'EBD Gestor Pro'}</h3>
                    <div className="flex flex-wrap justify-center items-center gap-6 text-xs font-bold text-gray-600 uppercase mt-2">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200">{sundayNumber}º Domingo</span>
                        <span className="flex items-center gap-1"><Calendar size={14} className="text-gray-400"/> Data: {formatDateDisplay(startDate)}</span>
                        <div className="flex items-center gap-4 border-l pl-4 border-gray-200">
                        <span className="flex items-center gap-1">Tempo Bom {weatherStatus === 'bom' ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-300" />}</span>
                        <span className="flex items-center gap-1">Ameaçador {weatherStatus === 'ameacador' ? <CheckSquare size={16} className="text-orange-500" /> : <Square size={16} className="text-gray-300" />}</span>
                        <span className="flex items-center gap-1">Chuvoso {weatherStatus === 'chuvoso' ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-gray-300" />}</span>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center md:justify-end gap-3">
                        <button onClick={handleExportExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-700 shadow-md active:scale-95 transition-all">
                            <FileSpreadsheet size={14} /> Exportar Excel (.xlsx)
                        </button>
                        <button onClick={handleExportPDF} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-900 shadow-md active:scale-95 transition-all">
                            <Download size={14} /> Exportar PDF Oficial
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100/50 text-gray-500 text-[10px] uppercase font-black border-b">
                    <tr>
                        <th className="px-6 py-4">Classe</th>
                        <th className="px-6 py-4">Professor</th>
                        <th className="px-6 py-4 text-center">Matr..</th>
                        <th className="px-6 py-4 text-center">Pres.</th>
                        <th className="px-6 py-4 text-center">Aus.</th>
                        <th className="px-6 py-4 text-center">Vis.</th>
                        <th className="px-6 py-4 text-center bg-indigo-50/50">P+V</th>
                        <th className="px-6 py-4 text-center">Bíb.</th>
                        <th className="px-6 py-4 text-center">Rev.</th>
                        <th className="px-6 py-4 text-center">Ofertas</th>
                        <th className="px-6 py-4 text-center">%</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                    {classRanking.map((item) => (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-700">{item.name}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500 italic">{item.teacherName}</td>
                        <td className="px-6 py-4 text-center font-medium">{item.enrolledCount}</td>
                        <td className="px-6 py-4 text-center font-medium text-blue-600">{item.totalPresent}</td>
                        <td className="px-6 py-4 text-center font-medium text-red-400">{item.totalAbsent}</td>
                        <td className="px-6 py-4 text-center font-medium">{item.totalVisitors}</td>
                        <td className="px-6 py-4 text-center font-black bg-indigo-50/30 text-indigo-700">{item.totalPV}</td>
                        <td className="px-6 py-4 text-center font-medium">{item.totalBibles}</td>
                        <td className="px-6 py-4 text-center font-medium">{item.totalMagazines}</td>
                        <td className="px-6 py-4 text-center font-black text-green-600">R$ {item.totalOfferings.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black ${getPercentageColor(item.percentage)}`}>
                                {item.percentage.toFixed(0)}%
                            </span>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                    <tfoot className="bg-gray-800 text-white font-black text-xs uppercase tracking-wider">
                    <tr>
                        <td className="px-6 py-4" colSpan={2}>TOTAL GERAL</td>
                        <td className="px-6 py-4 text-center">{globalStats.matr}</td>
                        <td className="px-6 py-4 text-center">{globalStats.pres}</td>
                        <td className="px-6 py-4 text-center">{globalStats.abs}</td>
                        <td className="px-6 py-4 text-center">{globalStats.vis}</td>
                        <td className="px-6 py-4 text-center text-indigo-300">{globalStats.pv}</td>
                        <td className="px-6 py-4 text-center">{globalStats.bibles}</td>
                        <td className="px-6 py-4 text-center">{globalStats.magazines}</td>
                        <td className="px-6 py-4 text-center text-green-400">R$ {globalStats.offers.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">{globalPercentage.toFixed(1)}%</td>
                    </tr>
                    </tfoot>
                </table>
                </div>
            </div>

            {/* Birthdays of the week footer */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 animate-fade-in">
                <div className="bg-pink-100 p-4 rounded-2xl text-pink-600">
                    <Cake size={32} />
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-1">Aniversariantes da Semana Anterior</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {prevWeekBirthdays.length > 0 ? (
                            prevWeekBirthdays.map(s => {
                                const [y, m, d] = s.birthDate.split('-');
                                return (
                                    <span key={s.id} className="bg-pink-50 text-pink-700 border border-pink-100 px-3 py-1 rounded-lg text-xs font-bold">
                                        {s.name} ({d}/{m})
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-xs text-gray-400 italic">Nenhum aniversariante na semana anterior.</span>
                        )}
                    </div>
                </div>
                <div className="text-[10px] font-bold text-gray-400 max-w-[150px] leading-tight text-right">
                    Período: {(() => {
                        const reportDate = new Date(startDate + 'T12:00:00');
                        const start = new Date(reportDate);
                        start.setDate(reportDate.getDate() - 7);
                        const end = new Date(reportDate);
                        end.setDate(reportDate.getDate() - 1);
                        return `${start.getDate().toString().padStart(2, '0')}/${(start.getMonth()+1).toString().padStart(2, '0')} a ${end.getDate().toString().padStart(2, '0')}/${(end.getMonth()+1).toString().padStart(2, '0')}`;
                    })()}
                </div>
            </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar aluno no ranking..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
                <select 
                    value={classFilter}
                    onChange={e => setClassFilter(e.target.value)}
                    className="w-full md:w-64 border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 text-sm font-bold"
                >
                    <option value="">Todas as Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleExportRankingExcel} className="flex-1 md:flex-none bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-emerald-700">
                        <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button onClick={handleExportRankingPDF} className="flex-1 md:flex-none bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-amber-700">
                        <Download size={16} /> PDF
                    </button>
                </div>
             </div>

             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black border-b">
                        <tr>
                            <th className="px-6 py-4 w-16 text-center">Pos.</th>
                            <th className="px-6 py-4">Aluno</th>
                            <th className="px-6 py-4">Classe</th>
                            <th className="px-6 py-4 text-center">Presenças</th>
                            <th className="px-6 py-4 text-center">% Freq.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudentRanking.map((s, idx) => (
                            <tr key={s.id} className="hover:bg-amber-50/30 transition-colors">
                                <td className="px-6 py-4 text-center font-black text-gray-400">
                                    {idx < 3 ? (
                                        <div className="flex justify-center">
                                            {idx === 0 && <Trophy size={20} className="text-amber-500" />}
                                            {idx === 1 && <Trophy size={20} className="text-gray-400" />}
                                            {idx === 2 && <Trophy size={20} className="text-amber-700" />}
                                        </div>
                                    ) : idx + 1}
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-700">{s.name}</td>
                                <td className="px-6 py-4 text-xs font-medium text-gray-500">{s.className}</td>
                                <td className="px-6 py-4 text-center font-bold text-blue-600">{s.presentCount} / {s.totalClasses}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black ${getPercentageColor(s.percentage)}`}>
                                        {s.percentage.toFixed(0)}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredStudentRanking.length === 0 && (
                    <div className="p-12 text-center text-gray-400 italic">Nenhum aluno encontrado para os filtros aplicados.</div>
                )}
             </div>
        </div>
      )}
    </div>
  );
};

export default Reports;