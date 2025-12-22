
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const generateLessonPlan = async (topic: string, ageGroup: string, context?: string): Promise<string> => {
  if (!apiKey) {
    return "Erro: Chave de API não configurada (API_KEY).";
  }

  try {
    const prompt = `
      Você é um assistente pedagógico experiente de Escola Bíblica Dominical (EBD).
      Crie um esboço de aula curto e prático.
      
      Público Alvo: ${ageGroup}
      Tema: ${topic}
      Contexto Adicional: ${context || 'Nenhum'}

      Estrutura desejada (use Markdown):
      1. Versículo Chave
      2. Objetivo da Aula
      3. Quebra-gelo / Introdução (3-5 min)
      4. Tópicos Principais (Resumidos)
      5. Aplicação Prática
      6. Ideia de Dinâmica ou Atividade Visual
      
      Mantenha a linguagem encorajadora e adequada à faixa etária.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar o conteúdo.";
  } catch (error) {
    console.error("Erro ao chamar Gemini API:", error);
    return "Ocorreu um erro ao tentar gerar a aula. Verifique sua conexão ou tente novamente.";
  }
};
