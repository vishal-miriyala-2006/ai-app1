import { GoogleGenAI } from '@google/genai';

export const chatWithDocument = async (text, question, difficulty = 'Medium') => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return `[MOCK AI RESPONSE] You asked: "${question}". Since the API key is not set, here is a simulated answer tailored to a ${difficulty} difficulty level based on your document.`;
  }
  
  const ai = new GoogleGenAI({ apiKey }); 

  const prompt = `You are an AI study assistant for an engineering student. The student wants you to explain concepts at a ${difficulty} difficulty level. 
  
  Document Context: 
  ${text.substring(0, 25000)}
  
  Student Question: ${question}
  
  Answer the question using the provided context. If the context doesn't contain the answer, say so.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error communicating with the AI. Make sure your API key is valid.";
  }
};

export const generateQuiz = async (text, difficulty = 'Medium') => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    // Return mock quiz
    return JSON.stringify([
      { question: "What is a mock question?", options: ["A", "B", "C", "D"], answer: "A", explanation: "Because it is." }
    ]);
  }

  const ai = new GoogleGenAI({ apiKey }); 
  
  const prompt = `You are an AI study assistant. Generate a 3-question multiple-choice quiz based on the following text. The difficulty should be ${difficulty}.
  The output MUST be a valid JSON array of objects with the keys: 'question', 'options' (array of 4 strings), 'answer' (the exact text of the correct option), and 'explanation'.
  
  Document Context: 
  ${text.substring(0, 25000)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "[]";
  }
}

export const generateFlashcards = async (text, difficulty = 'Medium') => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return JSON.stringify([
      { front: "What is a mock concept?", back: "A simulated definition used without an API Key." },
      { front: "Glassmorphism", back: "A UI design style emphasizing frosted glass effects." }
    ]);
  }

  const ai = new GoogleGenAI({ apiKey }); 
  
  const prompt = `You are an AI study assistant. Extract up to 10 key concepts from the following text to create revision flip cards. The difficulty should be ${difficulty}.
  The output MUST be a valid JSON array of objects with the keys: 'front' (the term, concept, or question) and 'back' (the explanation, definition, or answer).
  
  Document Context: 
  ${text.substring(0, 25000)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "[]";
  }
}
