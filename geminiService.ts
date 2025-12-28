
import { GoogleGenAI } from "@google/genai";
import { Task } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getTaskInsights(tasks: Task[]): Promise<string> {
  const taskSummary = tasks.map(t => 
    `- [${t.priority}] ${t.title} (${t.category}) - Due: ${t.dueDate}, Status: ${t.status}`
  ).join('\n');

  const prompt = `
    Act as a highly efficient personal productivity assistant. 
    Review the following task list and provide a concise (max 3-4 sentences) daily insight.
    Highlight the most urgent things that need attention and give a brief word of encouragement.
    
    Current Tasks:
    ${taskSummary}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No insights available at the moment.";
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Keep pushing forward! You're doing great with your planning.";
  }
}
