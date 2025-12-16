
import React, { useState, useMemo } from 'react';
import { Award, PieChart, Users, Search, Download, FileSpreadsheet, X, Calendar, BookOpen, DollarSign, Eye, Trophy, Filter } from 'lucide-react';
import { ClassRoom, AttendanceRecord, Student } from '../types';
import { StorageService } from '../services/storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  classes: ClassRoom[];
  attendance: AttendanceRecord[];
  students: Student[];
}

const Reports: React.FC<ReportsProps> = ({ classes, attendance, students }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassRoom | null>(null);
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Filter Attendance based on Date Range
  const filteredAttendance = useMemo(() => {
    return attendance.filter(r => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });
  }, [attendance, startDate, endDate]);

  // Calculate rankings for classes including Percentage based on filtered data
  const ranking = useMemo(() => {
    return classes.map(cls => {
      const classRecords = filteredAttendance.filter(r => r.classId === cls.id);
      
      // Count active students (enrolled) in this class
      const activeStudents = students.filter(s => s.classId === cls.id && s.active);
      const enrolledCount = activeStudents.length;
      
      // Calculate Total Present ONLY for Active Students AND Unique Per Date
      // Formula: Absences = (Enrolled * Sessions) - ActivePresent(Unique)
      const uniqueClassPresences = new Set<string>();
      classRecords.forEach(r => {
          r.presentStudentIds.forEach(sid => {
              if (activeStudents.some(s => s.id === sid)) {
                  uniqueClassPresences.add(`${r.date}-${sid}`);
              }
          });
      });
      const totalPresent = uniqueClassPresences.size;

      const totalVisitors = classRecords.reduce((acc, r) => acc + r.visitorsCount, 0);
      const totalBibles = classRecords.reduce((acc, r) => acc + r.biblesCount, 0);
      const totalMagazines = classRecords.reduce((acc, r) => acc + r.magazinesCount, 0);
      const totalOfferings = classRecords.reduce((acc, r) => acc + r.offeringValue, 0);
      
      const totalOverall = totalPresent + totalVisitors; // Present + Visitors

      const sessions = classRecords.length;
      const avg = sessions > 0 ? (totalPresent / sessions) : 0;
      
      // Calculate absences: (Matriculados * Aulas) - Presentes
      const totalPotentialPresence = sessions * enrolledCount;
      const totalAbsent = Math.max(0, totalPotentialPresence - totalPresent);
      
      // Percentage Calculation
      const percentage = totalPotentialPresence > 0 ? (totalPresent / totalPotentialPresence) * 100 : 0;

      return {
        ...cls,
        enrolledCount,
        avgAttendance: avg,
        percentage,
        totalPresent,
        totalAbsent,
        totalVisitors,
        totalOverall,
        totalBibles,
        totalMagazines,
        totalOfferings,
        sessions,
        records: classRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Most recent first
      };
    }).sort((a, b) => b.percentage - a.percentage); // Sort by percentage
  }, [classes, filteredAttendance, students]);

  // Calculate stats per student based on filtered data
  const studentStats = useMemo(() => {
    return students
      .filter(s => s.active) // Only active students
      .map(student => {
        const classRecords = filteredAttendance.filter(r => r.classId === student.classId);
        const totalClasses = classRecords.length;
        
        // Count UNIQUE dates present, avoiding duplicate counts if record repeated
        const uniqueDatesPresent = new Set(
            classRecords
                .filter(r => r.presentStudentIds.includes(student.id))
                .map(r => r.date)
        );
        const presentCount = uniqueDatesPresent.size;

        const percentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;
        
        return {
          id: student.id,
          name: student.name,
          className: classes.find(c => c.id === student.classId)?.name || 'Sem Classe',
          classId: student.classId,
          presentCount,
          totalClasses,
          percentage
        };
      })
      .sort((a, b) => {
          // Sort by Percentage DESC, then by Total Presences DESC
          if (b.percentage !== a.percentage) return b.percentage - a.percentage;
          return b.presentCount - a.presentCount;
      });
  }, [students, filteredAttendance, classes]);

  // Filtered version for display (Includes Search by Class and LIMIT 6)
  const filteredStudentStats = useMemo(() => {
      const lowerTerm = searchTerm.toLowerCase();
      return studentStats
        .filter(s => 
            s.name.toLowerCase().includes(lowerTerm) || 
            s.className.toLowerCase().includes(lowerTerm)
        )
        .slice(0, 6); // Limit to top 6
  }, [studentStats, searchTerm]);

  // Helper for color coding percentage
  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600 bg-green-100';
    if (pct >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProgressBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // --- Export Functions ---

  const handleExportCSV = () => {
    // CSV Header
    const headers = ['Posição', 'Aluno', 'Classe', 'Matriculados na Classe', 'Presenças', 'Total de Aulas', 'Frequência (%)'];
    
    // Map data to rows - Using filteredStudentStats to match screen
    const rows = filteredStudentStats.map((s, index) => {
      // Find class stats
      const classStat = ranking.find(r => r.name === s.className);
      const enrolled = classStat ? classStat.enrolledCount : 0;
      
      return [
        (index + 1).toString(),
        s.name,
        s.className,
        enrolled,
        s.presentCount,
        s.totalClasses,
        s.percentage.toFixed(2)
      ]
    });

    // Create CSV Content
    const csvContent = [
      headers.join(','), 
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Create Blob and Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ranking_alunos_ebd_${startDate || 'geral'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const settings = StorageService.getSettings();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const primaryColor = [37, 99, 235]; 
    const grayColor = [100, 116, 139]; 
    const leftMargin = 14;
    const rightMargin = pageWidth - 14;
    
    // --- Header ---
    let logoOffset = 0;
    if (settings && settings.logoUrl) {
        try { doc.addImage(settings.logoUrl, 'JPEG', leftMargin, 10, 30, 30); logoOffset = 35; } catch (e) {}
    }
    const textStartX = leftMargin + logoOffset;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(settings?.churchName || 'Nome da Igreja', textStartX, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Escola Bíblica Dominical', textStartX, 27);
    
    // Date Period String
    const formatDate = (d: string) => d.split('-').reverse().join('/');
    const periodStr = startDate || endDate 
        ? `Período: ${startDate ? formatDate(startDate) : 'Início'} até ${endDate ? formatDate(endDate) : 'Hoje'}`
        : `Histórico Completo • ${new Date().toLocaleDateString()}`;

    doc.setFontSize(10);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(`Relatório Administrativo Geral • ${periodStr}`, textStartX, 34);
    
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, 42, rightMargin, 42);

    let startY = 50;

    // Consolidado Classes
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Consolidado por Classe', leftMargin, startY);
    const classRows = ranking.map((cls) => [
      cls.name, cls.enrolledCount.toString(), cls.totalPresent.toString(), cls.totalAbsent.toString(),
      cls.totalVisitors.toString(), cls.totalOverall.toString(), cls.totalBibles.toString(),
      cls.totalMagazines.toString(), `R$ ${cls.totalOfferings.toFixed(2)}`, `${cls.percentage.toFixed(1)}%`
    ]);
    autoTable(doc, {
      startY: startY + 5,
      head: [['Classe', 'Matr.', 'Pres.', 'Aus.', 'Visit.', 'Total(P+V)', 'Bíb.', 'Rev.', 'Ofertas', '% Freq.']],
      body: classRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    // Summary Totals (RELATORIO GERAL)
    let finalY = (doc as any).lastAutoTable.finalY || 100;

    // Check for page break
    if (finalY > pageHeight - 120) {
        doc.addPage();
        finalY = 20;
    } else {
        finalY += 15;
    }
    
    // Calculate Comprehensive Totals using RANKING data 
    // This ensures consistency because ranking data already applied strict unique logic.
    let totalEnrolledOverall = 0;
    let totalPotentialAttendance = 0;
    let totalPresences = 0;
    let totalVisitors = 0;
    let totalBibles = 0;
    let totalMagazines = 0;
    let totalOfferings = 0;

    ranking.forEach(r => {
      totalEnrolledOverall += r.enrolledCount;
      totalPotentialAttendance += (r.sessions * r.enrolledCount);
      totalPresences += r.totalPresent; // Already unique per date
      totalVisitors += r.totalVisitors;
      totalBibles += r.totalBibles;
      totalMagazines += r.totalMagazines;
      totalOfferings += r.totalOfferings;
    });

    const totalAbsences = Math.max(0, totalPotentialAttendance - totalPresences);
    const totalOverallPeople = totalPresences + totalVisitors;
    const globalPercentage = totalPotentialAttendance > 0 
        ? (totalPresences / totalPotentialAttendance) * 100 
        : 0;
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('RELATÓRIO GERAL', leftMargin, finalY);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Indicador', 'Total']],
        body: [
            ['Total de Matriculados', totalEnrolledOverall.toString()],
            ['Total de Presenças (Únicas)', totalPresences.toString()],
            ['Total de Ausências', totalAbsences.toString()],
            ['Total de Visitantes', totalVisitors.toString()],
            ['Total (Presentes + Visitantes)', totalOverallPeople.toString()],
            ['Total de Bíblias', totalBibles.toString()],
            ['Total de Revistas', totalMagazines.toString()],
            ['Total de Ofertas', `R$ ${totalOfferings.toFixed(2)}`],
            ['Frequência Geral (%)', `${globalPercentage.toFixed(2)}%`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74], halign: 'center' }, // Green Header
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 100 },
            1: { halign: 'center', fontStyle: 'bold' }
        },
        styles: { fontSize: 10, cellPadding: 4 }
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(200);
        doc.line(leftMargin, pageHeight - 20, rightMargin, pageHeight - 20);
        doc.setFontSize(8);
        doc.setTextColor(100);
        const address = settings?.address || 'Endereço não cadastrado';
        doc.text(address, pageWidth / 2, pageHeight - 15, { align: 'center' });
        doc.text(`Página ${i} de ${totalPages}`, leftMargin, pageHeight - 10);
        doc.text('Créditos: Carlos Alves de Araujo - EBD Gestor Pro', rightMargin, pageHeight - 10, { align: 'right' });
    }
    doc.save(`relatorio_geral_ebd_${startDate || 'completo'}.pdf`);
  };

  const handleExportStudentRankingPDF = () => {
    // 1. Calculate Stats based on FILTERED attendance
    // AND apply Search Filter
    const lowerTerm = searchTerm.toLowerCase();
    
    // We get the full calculated list first
    const baseStats = students
      .filter(s => s.active)
      .map(student => {
        const classRecords = filteredAttendance.filter(r => r.classId === student.classId);
        const totalClasses = classRecords.length;
        
        // Count UNIQUE dates present
        const uniqueDatesPresent = new Set(
            classRecords
                .filter(r => r.presentStudentIds.includes(student.id))
                .map(r => r.date)
        );
        const presentCount = uniqueDatesPresent.size;
        
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
          // Sort by Presence Count DESC, then Percentage DESC
          if (b.presentCount !== a.presentCount) return b.presentCount - a.presentCount;
          return b.percentage - a.percentage;
      });

    // Apply Search Filter to the base list
    const searchedStats = baseStats.filter(s => 
        s.name.toLowerCase().includes(lowerTerm) || 
        s.className.toLowerCase().includes(lowerTerm)
    );

    // Limit to Top 6 for the "General" section (Matching Screen Logic)
    const top6Stats = searchedStats.slice(0, 6);

    // 2. Generate PDF - LANDSCAPE Mode
    const doc = new jsPDF({ orientation: 'landscape' });
    const settings = StorageService.getSettings();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    const primaryColor = [245, 158, 11]; // Amber 500
    const secondaryColor = [30, 64, 175]; // Blue 800
    const grayColor = [100, 116, 139]; 
    const leftMargin = 14;
    const rightMargin = pageWidth - 14;

    // --- Header Helper ---
    const drawHeader = (title: string) => {
        let logoOffset = 0;
        if (settings && settings.logoUrl) {
            try { doc.addImage(settings.logoUrl, 'JPEG', leftMargin, 10, 30, 30); logoOffset = 35; } catch (e) {}
        }
        const textStartX = leftMargin + logoOffset;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text(settings?.churchName || 'Nome da Igreja', textStartX, 20);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(title, textStartX, 27);
        
        // Formatted Date Range & Filter Info
        const formatDate = (d: string) => d.split('-').reverse().join('/');
        const rangeText = startDate || endDate 
            ? `Período: ${startDate ? formatDate(startDate) : 'Início'} a ${endDate ? formatDate(endDate) : 'Hoje'}`
            : 'Período: Histórico Completo';
        
        const filterText = searchTerm ? ` | Filtro: "${searchTerm}"` : '';

        doc.setFontSize(10);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text(`${rangeText}${filterText} • Gerado em: ${new Date().toLocaleDateString()}`, textStartX, 34);

        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(leftMargin, 42, rightMargin, 42);
    };

    // Draw First Page Header
    drawHeader('Ranking de Presença: Top 3 (Filtrado)');

    let currentY = 50;

    // --- SECTION 1: Top 3 Per Class (Filtered) ---
    // If a search term is active, we only show classes that contain matching students
    
    const classesToShow = classes.filter(cls => {
        // Does this class have any students in the searched list?
        return searchedStats.some(s => s.classId === cls.id);
    });

    if (classesToShow.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text("Nenhum registro encontrado para os filtros selecionados.", leftMargin, currentY + 10);
        currentY += 20;
    }

    classesToShow.forEach((cls) => {
        // Filter students for this class from the SEARCHED list only
        // This ensures strictly "data replicated in filter"
        const classStudents = searchedStats
            .filter(s => s.classId === cls.id)
            .sort((a, b) => {
                if (b.presentCount !== a.presentCount) return b.presentCount - a.presentCount;
                return b.percentage - a.percentage;
            });
        
        // Take Top 3 (of the filtered results)
        const top3 = classStudents.slice(0, 3);
        
        if (top3.length === 0) return; 

        // Check page break logic
        if (currentY > pageHeight - 50) {
            doc.addPage();
            drawHeader('Ranking de Presença: Top 3 (Filtrado) (Cont.)');
            currentY = 50;
        }

        // Class Header Section (Background Bar) - Horizontal Adjusted
        doc.setFillColor(243, 244, 246); // Light gray
        doc.rect(leftMargin, currentY, pageWidth - (leftMargin * 2), 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`Classe: ${cls.name}`, leftMargin + 2, currentY + 5.5);
        
        currentY += 9; 

        // Table for this class
        const rows = top3.map((s, index) => {
            let rankLabel = `${index + 1}º`;
            // Add Emojis for medals
            if (index === 0) rankLabel = "🥇 1º Lugar (Ouro)"; 
            if (index === 1) rankLabel = "🥈 2º Lugar (Prata)";
            if (index === 2) rankLabel = "🥉 3º Lugar (Bronze)";

            return [
                rankLabel,
                s.name,
                s.presentCount.toString(),
                `${s.percentage.toFixed(1)}%`
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Posição', 'Nome do Aluno', 'Presenças', 'Freq.']],
            body: rows,
            theme: 'grid', 
            headStyles: { 
                fillColor: [255, 255, 255], 
                textColor: [80, 80, 80], 
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [200, 200, 200],
                fontSize: 9
            },
            bodyStyles: {
                textColor: [50, 50, 50]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 50 }, // Rank column width for emoji
                1: { cellWidth: 'auto' }, 
                2: { halign: 'center', cellWidth: 40, fontStyle: 'bold' },
                3: { halign: 'center', cellWidth: 30 }
            },
            didParseCell: (data) => {
                // Color Code the Medals
                if (data.section === 'body' && data.column.index === 0) {
                    const text = data.cell.raw as string;
                    if (text.includes('1º')) {
                        data.cell.styles.textColor = [218, 165, 32]; // Gold Color
                    } else if (text.includes('2º')) {
                        data.cell.styles.textColor = [128, 128, 128]; // Silver Color
                    } else if (text.includes('3º')) {
                        data.cell.styles.textColor = [160, 82, 45]; // Bronze Color
                    }
                }
            },
            styles: { 
                fontSize: 9, 
                cellPadding: 2,
                lineColor: [230, 230, 230],
                lineWidth: 0.1
            },
            margin: { left: leftMargin, right: rightMargin }
        });

        // Update Y for next loop
        currentY = (doc as any).lastAutoTable.finalY + 8;
    });

    // --- SECTION 2: General Ranking (Top 6 Filtered) (New Page) ---
    doc.addPage();
    drawHeader('Ranking Geral de Frequência (Top 6 Filtrado)');

    const generalRows = top6Stats.map((s, index) => [
      `${index + 1}º`,
      s.name,
      s.className,
      s.presentCount.toString(),
      s.totalClasses.toString(),
      `${s.percentage.toFixed(1)}%`
    ]);

    if (top6Stats.length === 0) {
         doc.text("Nenhum dado para exibir.", leftMargin, 60);
    } else {
        autoTable(doc, {
        startY: 50,
        head: [['Pos.', 'Nome do Aluno', 'Classe', 'Presenças', 'Aulas', 'Freq. %']],
        body: generalRows,
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' }, 
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 20, halign: 'center' },
            3: { halign: 'center', fontStyle: 'bold' },
            4: { halign: 'center' },
            5: { halign: 'center', fontStyle: 'bold' }
        },
        styles: { fontSize: 10, cellPadding: 3 },
        alternateRowStyles: { fillColor: [241, 245, 249] } 
        });
    }

    // --- Footer for all pages ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(200);
        doc.line(leftMargin, pageHeight - 20, rightMargin, pageHeight - 20);
        doc.setFontSize(8);
        doc.setTextColor(100);
        
        const address = settings?.address || 'Endereço não cadastrado';
        doc.text(address, pageWidth / 2, pageHeight - 15, { align: 'center' });
        
        doc.text(`Página ${i} de ${totalPages}`, leftMargin, pageHeight - 10);
        doc.text('Créditos: Carlos Alves de Araujo - EBD Gestor Pro', rightMargin, pageHeight - 10, { align: 'right' });
    }

    doc.save(`ranking_ebd_top6_${startDate || 'busca'}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <PieChart className="text-purple-600" />
            Relatórios Gerenciais
        </h2>
      </div>

      {/* Date Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Inicial</label>
            <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </div>
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Final</label>
            <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </div>
        <div className="flex-1 flex items-center gap-2 pb-2 text-sm text-gray-500">
            {(startDate || endDate) ? (
                <button onClick={() => {setStartDate(''); setEndDate('')}} className="text-red-500 hover:underline flex items-center gap-1 font-medium bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                    <X size={14} /> Limpar Filtro
                </button>
            ) : (
                <span className="flex items-center gap-2 text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"><Filter size={14}/> Exibindo todo o histórico</span>
            )}
        </div>
      </div>

      {/* Comprehensive Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award size={24} className="text-yellow-300" />
            <h3 className="font-bold text-lg">Consolidado Geral por Classe</h3>
          </div>
          <span className="text-xs bg-indigo-500 bg-opacity-50 px-2 py-1 rounded text-indigo-100 hidden sm:inline-block">
            {startDate || endDate ? 'Dados Filtrados' : 'Histórico completo acumulado'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Classe</th>
                <th className="px-4 py-3 text-center" title="Matriculados">Matr.</th>
                <th className="px-4 py-3 text-center text-blue-600">Pres.</th>
                <th className="px-4 py-3 text-center text-red-500">Aus.</th>
                <th className="px-4 py-3 text-center text-purple-600">Vis.</th>
                <th className="px-4 py-3 text-center text-indigo-600 font-bold" title="Presentes + Visitantes">Total (P+V)</th>
                <th className="px-4 py-3 text-center">Bib.</th>
                <th className="px-4 py-3 text-center">Rev.</th>
                <th className="px-4 py-3 text-center text-green-600">Ofertas</th>
                <th className="px-4 py-3 text-center">% Freq.</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {ranking.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => setSelectedClass(item)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-4 font-bold text-gray-700">{item.name}</td>
                  <td className="px-4 py-4 text-center font-medium">{item.enrolledCount}</td>
                  <td className="px-4 py-4 text-center font-bold text-blue-700">{item.totalPresent}</td>
                  <td className="px-4 py-4 text-center font-medium text-red-600">{item.totalAbsent}</td>
                  <td className="px-4 py-4 text-center font-medium text-purple-600">{item.totalVisitors}</td>
                  <td className="px-4 py-4 text-center font-bold text-indigo-600 bg-indigo-50">{item.totalOverall}</td>
                  <td className="px-4 py-4 text-center text-gray-600">{item.totalBibles}</td>
                  <td className="px-4 py-4 text-center text-gray-600">{item.totalMagazines}</td>
                  <td className="px-4 py-4 text-center font-medium text-green-700">R$ {item.totalOfferings.toFixed(2)}</td>
                  <td className="px-4 py-4 text-center">
                     <span className={`px-2 py-1 rounded text-xs font-bold ${getPercentageColor(item.percentage)}`}>
                        {item.percentage.toFixed(0)}%
                     </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button className="text-gray-400 group-hover:text-blue-600">
                        <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Student Frequency Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            <h3 className="font-bold text-lg text-gray-800">Frequência Individual</h3>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar aluno ou classe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3 w-16">Pos.</th>
                <th className="px-6 py-3">Aluno</th>
                <th className="px-6 py-3">Classe</th>
                <th className="px-6 py-3">Presenças</th>
                <th className="px-6 py-3">Frequência (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredStudentStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    Nenhum aluno encontrado neste período.
                  </td>
                </tr>
              ) : (
                filteredStudentStats.map((student, index) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-400">
                        {index + 1}º
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 text-gray-600">{student.className}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-semibold">{student.presentCount}</span>
                      <span className="text-gray-400 text-xs ml-1">/ {student.totalClasses} aulas</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getProgressBarColor(student.percentage)}`} 
                            style={{ width: `${student.percentage}%` }}
                          ></div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getPercentageColor(student.percentage)}`}>
                          {student.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
             Exibindo os top 6 resultados da busca. Para ver todos, exporte o relatório.
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Exportar Dados</h3>
        <p className="text-sm text-gray-500 mb-4">Baixe os relatórios completos para análise.</p>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleExportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet size={16} /> Exportar Excel (CSV)
          </button>
          <button 
            onClick={handleExportPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download size={16} /> Relatório Geral (PDF)
          </button>
          <button 
            onClick={handleExportStudentRankingPDF}
            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors flex items-center gap-2"
          >
            <Trophy size={16} /> Ranking Top 3 + Geral (Filtrado)
          </button>
        </div>
      </div>

      {/* Class Details Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedClass.name}</h3>
                <p className="text-sm text-gray-500">Histórico de Aulas e Observações {startDate && `(${startDate} - ${endDate || 'Hoje'})`}</p>
              </div>
              <button 
                onClick={() => setSelectedClass(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-2 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-auto p-6">
              {/* Stats Summary for Class */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-blue-500 font-bold uppercase">Total Ofertas</p>
                  <p className="text-xl font-bold text-blue-700">R$ {(selectedClass as any).totalOfferings.toFixed(2)}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-xs text-indigo-500 font-bold uppercase">Total (Pres + Vis)</p>
                  <p className="text-xl font-bold text-indigo-700">{(selectedClass as any).totalOverall}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-xs text-green-500 font-bold uppercase">Aulas Registradas</p>
                  <p className="text-xl font-bold text-green-700">{(selectedClass as any).sessions}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-xs text-purple-500 font-bold uppercase">Média Presença</p>
                  <p className="text-xl font-bold text-purple-700">{(selectedClass as any).avgAttendance.toFixed(1)}</p>
                </div>
              </div>

              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Data</th>
                    <th className="px-4 py-3 text-center">Visitantes</th>
                    <th className="px-4 py-3 text-center">Bíblias</th>
                    <th className="px-4 py-3 text-center">Revistas</th>
                    <th className="px-4 py-3 text-right">Oferta</th>
                    <th className="px-4 py-3 rounded-r-lg w-1/3">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {((selectedClass as any).records && (selectedClass as any).records.length > 0) ? (
                    (selectedClass as any).records.map((record: any) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                           <Calendar size={14} className="text-gray-400" />
                           {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{record.visitorsCount}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{record.biblesCount}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{record.magazinesCount}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">R$ {record.offeringValue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-500 italic text-xs">
                          {record.notes ? record.notes : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        Nenhum registro de aula encontrado para esta classe no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
              <button 
                onClick={() => setSelectedClass(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
