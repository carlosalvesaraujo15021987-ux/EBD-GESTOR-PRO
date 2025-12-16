import React, { useState } from 'react';
import { Sparkles, Loader2, BookOpen } from 'lucide-react';
import { generateLessonPlan } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

const AILessonPlanner: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [ageGroup, setAgeGroup] = useState('Adultos');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    const plan = await generateLessonPlan(topic, ageGroup);
    setResult(plan);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Sparkles className="text-yellow-300" />
          Planejador de Aulas IA
        </h2>
        <p className="text-blue-100 opacity-90 max-w-xl">
          Use a inteligência artificial do Google Gemini para criar esboços de aula criativos, dinâmicos e bíblicos em segundos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600"/> 
            Configurar Aula
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tema da Aula</label>
              <input 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Parábola do Semeador"
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Faixa Etária</label>
              <select 
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option>Maternal (2-3 anos)</option>
                <option>Jardim (4-6 anos)</option>
                <option>Primários (7-9 anos)</option>
                <option>Juniores (10-12 anos)</option>
                <option>Adolescentes (13-17 anos)</option>
                <option>Jovens (18-25 anos)</option>
                <option>Adultos</option>
                <option>Casais</option>
              </select>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={loading || !topic}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all flex justify-center items-center gap-2 ${
                loading || !topic ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? 'Gerando...' : 'Gerar Esboço'}
            </button>
          </div>
        </div>

        {/* Output Area */}
        <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
          {result ? (
            <article className="prose prose-blue max-w-none">
              <ReactMarkdown>{result}</ReactMarkdown>
            </article>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <Sparkles size={48} className="opacity-20" />
              <p className="text-center max-w-xs">Seu esboço de aula aparecerá aqui após ser gerado pela IA.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AILessonPlanner;
