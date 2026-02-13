
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const fixInvalidJson = async (brokenJson: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `The following text is supposed to be valid JSON but might have syntax errors (missing commas, quotes, etc). Please fix it and return ONLY the valid JSON string. Do not include markdown code blocks.
    
    Broken JSON:
    ${brokenJson}`,
  });
  return response.text?.trim() || brokenJson;
};

export const fixInvalidXml = async (brokenXml: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `The following text is supposed to be valid XML but might have syntax errors (missing tags, unclosed brackets, etc). Please fix it and return ONLY the valid XML string. Do not include markdown code blocks.
    
    Broken XML:
    ${brokenXml}`,
  });
  return response.text?.trim() || brokenXml;
};

export const generateTypescriptSchema = async (jsonString: string): Promise<{ typescript: string, description: string }> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this JSON and generate a clean TypeScript interface/type definition for it. Also provide a one-sentence summary of what this data structure represents. Return as JSON.
    
    JSON:
    ${jsonString}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          typescript: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["typescript", "description"]
      }
    }
  });
  
  return JSON.parse(response.text || '{}');
};

export const convertFormat = async (jsonString: string, targetFormat: 'yaml' | 'csv' | 'xml' | 'json'): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Convert the following content to ${targetFormat.toUpperCase()}. Return ONLY the converted code, no explanations or markdown blocks.
    
    Content:
    ${jsonString}`,
  });
  return response.text?.trim() || '';
};

export const explainJson = async (jsonString: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are a data expert. Analyze this data structure (JSON/XML) and content. Explain what it likely represents, identify any potential data quality issues, and suggest how it could be used in an application.
    
    Content:
    ${jsonString.substring(0, 5000)}`, // Limit length for safety
  });
  return response.text || "Could not generate insights.";
};
