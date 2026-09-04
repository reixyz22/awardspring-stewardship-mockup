/**
 * The Gemini-backed assistant. Runs the function-calling loop: ask the
 * model, execute whatever tool it asks for, feed the real result back,
 * repeat until it has enough to answer in plain text.
 *
 * @doc Every shape used here (GoogleGenAI, chats.create, sendMessage,
 *      response.functionCalls, createPartFromFunctionResponse) was verified
 *      against node_modules/@google/genai/dist/genai.d.ts directly - the
 *      SDK's actual shipped types, not a doc page. A web search on this
 *      turned up a second "Interactions API" that could not be verified
 *      (inconsistent, likely-hallucinated code), so this uses the
 *      confirmed-real generateContent/Chat API instead.
 */
import { GoogleGenAI, createPartFromFunctionResponse } from '@google/genai';
import { tools, toolByName } from './tools.ts';
import { friendlyGeminiError } from './gemini-error.ts';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `You are the AwardSpring stewardship assistant.
You know things ONLY by calling the tools you've been given - real donor,
gift, fund, and scholarship data, through AwardSpring's documented API.
Never invent a donor, a dollar amount, or a date. If no tool can answer a
question, say so plainly instead of guessing.

You cannot approve or send anything, and there is no tool that would let
you - that is a human decision only, made by clicking Approve in this
app's own interface. Never imply that you have taken an action a tool
result doesn't actually confirm.`;

export interface AssistantToolCall { name: string; args: Record<string, unknown> }
export interface AssistantResult { text: string; toolCalls: AssistantToolCall[] }

export async function askAssistant(message: string): Promise<AssistantResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Add it to .env - see .env.example.');
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const chat = ai.chats.create({
    model: MODEL,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: tools.map((t) => t.declaration) }],
    },
  });

  const toolCalls: AssistantToolCall[] = [];

  try {
    let response = await chat.sendMessage({ message });

    // Keep executing whatever the model asks for and handing back real
    // results until it stops asking - this is the whole "never invent an
    // answer" guarantee, enforced by code rather than just by the prompt.
    while (response.functionCalls && response.functionCalls.length > 0) {
      const parts = [];
      for (const call of response.functionCalls) {
        const name = call.name ?? '';
        const args = call.args ?? {};
        const tool = toolByName.get(name);
        const result = tool ? await tool.run(args) : { error: `No such tool: ${name}` };
        toolCalls.push({ name, args });
        parts.push(createPartFromFunctionResponse(call.id ?? '', name, { result }));
      }
      response = await chat.sendMessage({ message: parts });
    }

    return { text: response.text ?? '', toolCalls };
  } catch (err) {
    throw new Error(friendlyGeminiError(err));
  }
}
