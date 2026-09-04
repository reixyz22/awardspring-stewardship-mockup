/**
 * The only calls the assistant is allowed to make.
 *
 * Deliberately 1:1 with real AwardSpring read endpoints - not app-specific
 * views like "the queue" or "LYBUNT status". SPEC.md says the assistant is
 * "backed only by the same typed API calls the UI uses"; keeping tools at
 * the API's own level, rather than pre-baking our app's business logic into
 * them, is what makes that literally true.
 *
 * There is no write-capable tool here. That's not just policy - it's the
 * actual enforcement of the hard rule (assistant never approves or sends):
 * there is nothing for the model to call even if it tried, because no such
 * tool exists to call.
 *
 * @doc @google/genai FunctionDeclaration shape verified against the
 *      installed package's own types (node_modules/@google/genai/dist/genai.d.ts),
 *      not assumed from a doc page.
 */
import type { FunctionDeclaration } from '@google/genai';
import { mockGet, mockList } from './mock-client.ts';

export interface Tool {
  declaration: FunctionDeclaration;
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

export const tools: Tool[] = [
  {
    declaration: {
      name: 'list_donors',
      description: "Search donors by name, email, or organization. Leave q empty to list all donors.",
      parametersJsonSchema: {
        type: 'object',
        properties: { q: { type: 'string', description: 'Search term, matched against name/email/organization.' } },
      },
    },
    run: (args) => mockList('/api/v1/donors', { q: args.q as string | undefined }),
  },
  {
    declaration: {
      name: 'get_donor',
      description: 'Full detail for one donor by id, including lifetime and this-year giving totals.',
      parametersJsonSchema: {
        type: 'object',
        properties: { donor_id: { type: 'integer', description: 'The donor id, from list_donors.' } },
        required: ['donor_id'],
      },
    },
    run: (args) => mockGet(`/api/v1/donors/${args.donor_id}`),
  },
  {
    declaration: {
      name: 'list_gifts',
      description: "A donor's gifts and pledges. Omit donor_id to see recent gifts across the whole institution.",
      parametersJsonSchema: {
        type: 'object',
        properties: { donor_id: { type: 'integer', description: 'Restrict to one donor, from list_donors.' } },
      },
    },
    run: (args) => mockList('/api/v1/gifts', { donor_id: args.donor_id as number | undefined }),
  },
  {
    declaration: {
      name: 'get_current_award_cycle',
      description: 'The award cycle currently in progress (or the next one, if none is current).',
      parametersJsonSchema: { type: 'object', properties: {} },
    },
    run: () => mockGet('/api/v1/award-cycles/current'),
  },
  {
    declaration: {
      name: 'list_awarded_students',
      description: 'Students awarded scholarships in a given award cycle, and how much each received.',
      parametersJsonSchema: {
        type: 'object',
        properties: {
          award_cycle_id: { type: 'integer', description: 'Required. From get_current_award_cycle.' },
          scholarship_id: { type: 'integer', description: 'Optional, restrict to one scholarship.' },
        },
        required: ['award_cycle_id'],
      },
    },
    run: (args) => mockList('/api/v1/scholarships/awarded-students', {
      award_cycle_id: args.award_cycle_id as number,
      scholarship_id: args.scholarship_id as number | undefined,
    }),
  },
];

export const toolByName = new Map(tools.map((t) => [t.declaration.name!, t]));
