import { GoogleGenAI, Type } from '@google/genai';
import type { UnderstoodKit } from './understand.js';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    goalType: { type: Type.STRING, enum: ['recipe', 'repair', 'project', 'occasion', 'household'] },
    servings: { type: Type.NUMBER, nullable: true },
    clarifyingQuestion: { type: Type.STRING, nullable: true },
    safetyNote: { type: Type.STRING, nullable: true },
    steps: {
      type: Type.ARRAY,
      nullable: true,
      items: { type: Type.STRING },
      description: 'Ordered how-to steps for a recipe or repair. Omit (null) for simple shopping lists.',
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          hindiAlias: { type: Type.STRING, nullable: true },
          qty: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          essential: { type: Type.BOOLEAN },
          substitutes: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['name', 'qty', 'unit', 'essential'],
      },
    },
  },
  required: ['goalType', 'items'],
};

const SYSTEM_PROMPT = `You are Tokri's "Kit Bana Do" assistant for a quick-commerce grocery/hardware app in India.
Given a goal in English, Hindi, or Hinglish, return everything needed to do it — ingredients for a recipe, tools and
likely parts for a repair, materials for a school/DIY project, supplies for an occasion, or products for a household task.
For repair/electrical/gas/battery goals, include a safetyNote and suggest a professional for anything beyond basic fixes.
For recipes and repairs, include a steps array with the ordered method or procedure. Omit steps (null) for simple shopping lists, occasions, or household restocking.
If the goal is dangerous, illegal, or age-restricted, return an empty items array and explain why in clarifyingQuestion.
Respond with JSON matching the schema only.`;

const REQUEST_TIMEOUT_MS = 10_000;

export async function geminiUnderstand(prompt: string, apiKey: string): Promise<UnderstoodKit> {
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini did not return a structured kit');

  const input = JSON.parse(text) as Partial<UnderstoodKit>;
  return {
    goalType: input.goalType ?? 'household',
    servings: input.servings ?? null,
    clarifyingQuestion: input.clarifyingQuestion ?? null,
    safetyNote: input.safetyNote ?? null,
    steps: input.steps ?? null,
    items: input.items ?? [],
  };
}
