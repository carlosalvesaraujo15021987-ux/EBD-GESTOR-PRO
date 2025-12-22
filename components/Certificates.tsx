
import React, { useState, useRef, useEffect } from 'react';
import { FileBadge, Download, Edit, Save, Camera, Settings, BookOpen, Quote, X } from 'lucide-react';
import { Student, ClassRoom, Teacher, ChurchSettings } from '../types';
import { StorageService } from '../services/storage';
import { jsPDF } from 'jspdf';

interface CertificatesProps {
  students: Student[];
  classes: ClassRoom[];
  teachers: Teacher[];
}

const Certificates: React.FC<CertificatesProps> = ({ students, classes, teachers }) => {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [settings, setSettings] = useState<ChurchSettings | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  
  // Certificate specific fields
  const [title, setTitle] = useState('Certificado');
  const [mainText, setMainText] = useState('CERTIFICAMOS SUA BRILHANTE PARTICIPAÇÃO NA');
  const [churchSubName, setChurchSubName] = useState('ESCOLA BÍBLICA DOMINICAL');
  const [termInfo, setTermInfo] = useState('ENCERRANDO O 4º TRIMESTRE DE 2025 COM ASSIDUIDADE NA CLASSE DOS JOVENS.');
  const [verse, setVerse] = useState("'Habite ricamente em você a palavra de Cristo'. Colossenses 3.16");
  
  // Signatures
  const [pastorName, setPastorName] = useState('');
  const [superName, setSuperName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [studentLabel, setStudentLabel] = useState('ALUNO (a)');

  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = StorageService.getSettings();
    setSettings(s);
    if (s && s.leadership) {
        setPastorName(s.leadership.pastorPresidente || '');
        setSuperName(s.leadership.superintendentes || '');
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) {
        const cls = classes.find(c => c.id === selectedClassId);
        if (cls) {
            setTermInfo(`ENCERRANDO O 4º TRIMESTRE DE 2025 COM ASSIDUIDADE NA CLASSE ${cls.name.toUpperCase()}.`);
            const teacher = teachers.find(t => t.id === cls.mainTeacherId);
            if (teacher) setTeacherName(teacher.name);
        }
    }
  }, [selectedClassId, classes, teachers]);

  const classStudents = students.filter(s => s.classId === selectedClassId && s.active);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && settings) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const updated = { ...settings, certificateLogoUrl: reader.result as string };
            setSettings(updated);
            StorageService.saveSettings(updated);
        };
        reader.readAsDataURL(file);
    }
  };

  const exportPDF = (student?: Student) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const targetStudent = student || classStudents.find(s => s.id === selectedStudentId);
      if (!targetStudent) {
          alert("Por favor, selecione um aluno ou classe primeiro.");
          return;
      }

      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      
      // Margens e Centro da área branca (esquerda)
      const leftMargin = 15;
      const contentCenterX = 100;

      // --- FUNDO ---
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, width, height, 'F');

      // --- SEÇÃO DIREITA CURVA ---
      // Cor de fundo escura para a área da logo/imagem
      doc.setFillColor(15, 23, 42); 
      doc.rect(width * 0.65, 0, width * 0.35, height, 'F');
      
      // Criar a curva (Arco) usando círculos para simular o efeito do modelo
      doc.setFillColor(255, 255, 255);
      doc.circle(width * 0.65, height / 2, height * 0.7, 'F');

      // Bordas decorativas (Cinza no topo esquerdo)
      doc.setFillColor(148, 163, 184);
      doc.rect(0, 10, 40, 10, 'F');
      doc.rect(0, 25, 30, 8, 'F');
      doc.rect(0, height - 25, 30, 8, 'F');
      doc.rect(0, height - 15, 40, 10, 'F');

      // --- LOGO (NA ÁREA ESCURA À DIREITA) ---
      const logoToUse = settings?.certificateLogoUrl || settings?.logoUrl;
      const logoSize = 75;
      const logoAreaCenterX = width * 0.82; 
      const logoAreaCenterY = height / 2 - 10;

      if (logoToUse) {
          try {
              // Círculo branco sob a logo
              doc.setFillColor(255, 255, 255);
              doc.circle(logoAreaCenterX, logoAreaCenterY, 42, 'F');
              const format = logoToUse.toLowerCase().includes('png') ? 'PNG' : 'JPEG';
              doc.addImage(logoToUse, format, logoAreaCenterX - (logoSize/2), logoAreaCenterY - (logoSize/2), logoSize, logoSize);
          } catch(e) { console.warn(e); }
      }

      // --- TEXTOS ---
      doc.setTextColor(30, 41, 59);
      
      // Título "Certificado" à esquerda
      doc.setFont('times', 'normal');
      doc.setFontSize(85);
      doc.text(title, leftMargin, 45);

      // Linha horizontal sob o título
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.8);
      doc.line(leftMargin + 2, 55, 150, 55);

      // Texto de Introdução centralizado na área branca
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(mainText, contentCenterX, 85, { align: 'center' });

      // Nome da Escola
      doc.setFontSize(34);
      doc.text(churchSubName, contentCenterX, 105, { align: 'center' });

      // Detalhes do Período/Classe
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const infoLines = doc.splitTextToSize(termInfo, 140);
      doc.text(infoLines, contentCenterX, 120, { align: 'center' });

      // --- CAMPOS DE ASSINATURA (GRID 2x2) ---
      const sigLineW = 60;
      const col1X = leftMargin;
      const col2X = 95;
      const sigFontSize = 9;
      
      // Fila 1
      const row1Y = 165;
      doc.setFontSize(sigFontSize);
      doc.setLineWidth(0.4);
      
      // Pastor
      doc.text(pastorName.toUpperCase() || '_______________________', col1X + sigLineW/2, row1Y - 4, { align: 'center' });
      doc.line(col1X, row1Y, col1X + sigLineW, row1Y);
      doc.setFont('helvetica', 'bold');
      doc.text('PASTOR', col1X + sigLineW/2, row1Y + 9, { align: 'center' });

      // Professor
      doc.setFont('helvetica', 'normal');
      doc.text(teacherName.toUpperCase() || '_______________________', col2X + sigLineW/2, row1Y - 4, { align: 'center' });
      doc.line(col2X, row1Y, col2X + sigLineW, row1Y);
      doc.setFont('helvetica', 'bold');
      doc.text('PROFESSOR(A)', col2X + sigLineW/2, row1Y + 9, { align: 'center' });

      // Fila 2
      const row2Y = 190;
      
      // Superintendente
      doc.setFont('helvetica', 'normal');
      doc.text(superName.toUpperCase() || '_______________________', col1X + sigLineW/2, row2Y - 4, { align: 'center' });
      doc.line(col1X, row2Y, col1X + sigLineW, row2Y);
      doc.setFont('helvetica', 'bold');
      doc.text('SUPERINTENDENTE', col1X + sigLineW/2, row2Y + 9, { align: 'center' });

      // Aluno (Em destaque Azul)
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text(targetStudent.name.toUpperCase(), col2X + sigLineW/2, row2Y - 4, { align: 'center' });
      doc.setTextColor(30, 41, 59);
      doc.line(col2X, row2Y, col2X + sigLineW, row2Y);
      doc.setFontSize(sigFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text(studentLabel.toUpperCase(), col2X + sigLineW/2, row2Y + 9, { align: 'center' });

      // --- RODAPÉ ---
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text(verse, contentCenterX, height - 10, { align: 'center' });

      // Créditos na área escura
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('EBD GESTOR PRO', width * 0.82, height - 15, { align: 'center' });
      
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(1);
      doc.line(width * 0.78, height - 10, width * 0.86, height - 10);

      const fileName = `certificado_${targetStudent.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error(err);
      alert("Falha ao gerar o PDF.");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileBadge className="text-amber-500" />
            Emissão de Certificados
          </h2>
          <p className="text-sm text-gray-500 font-medium">Layout profissional otimizado para impressão A4 Paisagem.</p>
        </div>
        <button 
          onClick={() => setShowEditor(!showEditor)}
          className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all border ${showEditor ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          {showEditor ? <X size={18} /> : <Settings size={18} />}
          {showEditor ? 'Fechar Painel' : 'Configurar layout'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel lateral de configurações */}
        <div className={`space-y-4 animate-fade-in ${showEditor ? 'block' : 'hidden'}`}>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                <h3 className="font-bold text-gray-700 border-b pb-3 text-sm flex items-center gap-2">
                    <Edit size={16} className="text-blue-500" /> Personalizar Textos
                </h3>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Título</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Introdução</label>
                        <input value={mainText} onChange={e => setMainText(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nome da Escola</label>
                        <input value={churchSubName} onChange={e => setChurchSubName(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Período/Classe</label>
                        <textarea rows={2} value={termInfo} onChange={e => setTermInfo(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Versículo Rodapé</label>
                        <textarea rows={2} value={verse} onChange={e => setVerse(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase">Assinaturas</h4>
                    <input placeholder="Pastor" value={pastorName} onChange={e => setPastorName(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                    <input placeholder="Superintendente" value={superName} onChange={e => setSuperName(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                    <input placeholder="Professor(a)" value={teacherName} onChange={e => setTeacherName(e.target.value)} className="w-full border border-gray-200 rounded-xl p-2.5 text-xs" />
                </div>
                <div className="pt-2">
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
                    <button onClick={() => logoInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-all">
                        <Camera size={16} /> Carregar Logo Especial
                    </button>
                </div>
            </div>
        </div>

        {/* Seleção e Preview */}
        <div className={`space-y-6 ${showEditor ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end animate-fade-in">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Classe</label>
                    <select value={selectedClassId} onChange={e => {setSelectedClassId(e.target.value); setSelectedStudentId('');}} className="w-full border border-gray-300 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 text-sm">
                        <option value="">-- Selecione uma classe --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Aluno</label>
                    <select disabled={!selectedClassId} value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 text-sm">
                        <option value="">Todos da Classe (Em Lote)</option>
                        {classStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <button disabled={!selectedClassId} onClick={() => exportPDF()} className="w-full md:w-auto bg-blue-600 text-white px-10 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg transition-all active:scale-95 disabled:opacity-40">
                    <Download size={20} /> Baixar PDF
                </button>
            </div>

            {/* MOCKUP VISUAL IGUAL AO MODELO */}
            {selectedClassId && (
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden relative min-h-[620px] flex animate-fade-in group">
                    {/* LADO ESQUERDO BRANCO */}
                    <div className="w-[65%] p-12 flex flex-col relative z-10 bg-white">
                        {/* Detalhes cinza no topo */}
                        <div className="absolute top-8 left-0 space-y-2">
                            <div className="h-6 w-32 bg-gray-400 rounded-r-full opacity-60"></div>
                            <div className="h-4 w-24 bg-gray-300 rounded-r-full opacity-40"></div>
                        </div>

                        <h1 className="text-8xl font-serif text-gray-800 mb-2 tracking-tight mt-6">{title}</h1>
                        <div className="w-[80%] h-1 bg-gray-900 mb-14 rounded-full"></div>

                        <div className="space-y-6 text-center pr-10">
                            <p className="text-gray-900 font-bold uppercase tracking-[0.2em] text-[12px]">{mainText}</p>
                            <h2 className="text-5xl font-black text-gray-900 uppercase tracking-tighter leading-tight">{churchSubName}</h2>
                            <p className="text-gray-800 font-bold leading-relaxed max-w-lg mx-auto text-sm">{termInfo}</p>
                        </div>

                        {/* GRID DE ASSINATURAS */}
                        <div className="mt-auto grid grid-cols-2 gap-y-12 gap-x-12 pb-12 pr-12">
                            <div className="flex flex-col items-center">
                                 <p className="text-xs font-bold text-gray-800 text-center mb-1">{pastorName || 'NOME DO PASTOR'}</p>
                                 <div className="border-b-2 border-gray-400 w-full mb-2"></div>
                                 <p className="text-[10px] font-bold text-gray-900 uppercase tracking-wider">PASTOR</p>
                            </div>
                            <div className="flex flex-col items-center">
                                 <p className="text-xs font-bold text-gray-800 text-center mb-1">{teacherName || 'NOME DO PROFESSOR'}</p>
                                 <div className="border-b-2 border-gray-400 w-full mb-2"></div>
                                 <p className="text-[10px] font-bold text-gray-900 uppercase tracking-wider">PROFESSOR(A)</p>
                            </div>
                            <div className="flex flex-col items-center">
                                 <p className="text-xs font-bold text-gray-800 text-center mb-1">{superName || 'NOME DO SUPERINTENDENTE'}</p>
                                 <div className="border-b-2 border-gray-400 w-full mb-2"></div>
                                 <p className="text-[10px] font-bold text-gray-900 uppercase tracking-wider">SUPERINTENDENTE</p>
                            </div>
                            <div className="flex flex-col items-center">
                                 <h4 className="text-2xl font-black text-blue-700 uppercase tracking-tight mb-1">
                                    {selectedStudentId ? classStudents.find(s => s.id === selectedStudentId)?.name : 'NOME DO ALUNO'}
                                 </h4>
                                 <div className="border-b-2 border-gray-400 w-full mb-2"></div>
                                 <p className="text-[10px] font-bold text-gray-900 uppercase tracking-wider">{studentLabel}</p>
                            </div>
                        </div>

                        <div className="text-center mt-2 pr-12">
                             <p className="text-[11px] italic text-gray-500 font-medium">
                                {verse}
                            </p>
                        </div>
                    </div>

                    {/* LADO DIREITO CURVO E ESCURO */}
                    <div className="w-[35%] bg-slate-900 relative flex flex-col items-center justify-center overflow-hidden">
                        {/* A Curva Branca */}
                        <div className="absolute left-[-200px] top-[-100px] bottom-[-100px] w-[500px] bg-white rounded-full z-0"></div>
                        
                        <div className="relative z-10 flex flex-col items-center gap-10">
                            <div className="w-64 h-64 bg-white shadow-2xl rounded-full p-8 flex items-center justify-center border-[12px] border-slate-800 ring-4 ring-white/10 group-hover:scale-105 transition-transform duration-700">
                                 {(settings?.certificateLogoUrl || settings?.logoUrl) ? (
                                     <img src={settings?.certificateLogoUrl || settings?.logoUrl || ''} className="w-full h-full object-contain" alt="Logo" />
                                 ) : (
                                     <div className="text-center">
                                        <BookOpen className="text-blue-600 w-24 h-24 opacity-30 mx-auto" />
                                        <p className="text-[10px] text-gray-300 mt-2 font-bold uppercase">Sua Logo Aqui</p>
                                     </div>
                                 )}
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-white font-black tracking-[0.4em] uppercase text-sm opacity-90">EBD GESTOR PRO</span>
                                <div className="h-1.5 w-14 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Download Individual */}
            {selectedClassId && !selectedStudentId && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in mt-6">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 text-sm">Downloads Individuais ({classStudents.length} Alunos)</h3>
                        <button 
                            onClick={() => {
                                if(window.confirm(`Baixar ${classStudents.length} certificados?`)) {
                                    classStudents.forEach((s, i) => setTimeout(() => exportPDF(s), i * 1800));
                                }
                            }}
                            className="text-xs bg-amber-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-600 shadow-md"
                        > Baixar todos da classe </button>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                        {classStudents.map(student => (
                            <div key={student.id} className="px-6 py-4 flex items-center justify-between hover:bg-blue-50/40 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{student.name.charAt(0)}</div>
                                    <span className="text-sm font-bold text-gray-700">{student.name}</span>
                                </div>
                                <button onClick={() => exportPDF(student)} className="p-2 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all"><Download size={18} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Certificates;
