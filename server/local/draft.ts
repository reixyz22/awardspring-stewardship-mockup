/**
 * One-shot letter generation - no tool-calling loop, unlike the assistant.
 * Every fact this letter could state is supplied by the caller (the browser
 * already fetched it, for the Donor Brief), so there's nothing left for the
 * model to look up. It's told to copy facts verbatim if it uses them and
 * invent nothing else - see src/lib/provenance.ts for how the UI proves
 * that afterward, rather than trusting the model's word for it.
 */
import { GoogleGenAI } from '@google/genai';
import { friendlyGeminiError } from './gemini-error.ts';

const MODEL = 'gemini-2.5-flash';

export interface DraftRequest {
  donorName: string;
  /** Exact strings the model must copy verbatim if it uses them - checked
   * against the output afterward by src/lib/provenance.ts. */
  facts: string[];
  /** What each fact actually MEANS, labeled - without this the model will
   * copy a number correctly but misattribute it (verified: it once wrote
   * "your gift of $5,000" when $5,000 was a STUDENT's award, not the
   * donor's own gift - copying verbatim isn't the same as understanding
   * what was copied). */
  context: string;
  familiarity: string;
  tone: string;
  note: string;
}

export async function generateDraft(req: DraftRequest): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Add it to .env - see .env.example.');
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `Write a short thank-you letter to a donor named ${req.donorName}.

Tone: ${req.tone}. How well the staff member writing this knows the donor: ${req.familiarity}.
${req.note ? `Specific thing to mention: ${req.note}` : ''}

Here is what is actually true about this donor - read carefully what each
number IS before using it. In particular, an amount a STUDENT was awarded
is not the same as an amount this donor gave, and must never be described
as the donor's own gift:

${req.context}

If you state any of these exact values, copy them EXACTLY as written,
character for character, with the meaning given above: ${req.facts.join(', ')}
Do not state any other number, name, or date that isn't listed above.

Write only the letter body. No subject line, no signature block.`;

  try {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
    return response.text ?? '';
  } catch (err) {
    throw new Error(friendlyGeminiError(err));
  }
}
