import { mockPersonas } from './mockKnowledgeGraph';
import { transformValue } from './transformationEngine';
import type { FieldContext, KnowledgeGraph, Persona, ProfileField, SuggestionOption } from './types';

interface MatchRule {
  key: ProfileField;
  patterns: RegExp[];
}

// More specific keys are intentionally listed first for ambiguous labels.
const matchRules: MatchRule[] = [
  { key: 'dateOfBirth', patterns: [/\b(date of birth|birth date|birthday|dob)\b/i] },
  { key: 'graduationDate', patterns: [/\b(graduation|graduated|completion date|degree date)\b/i] },
  { key: 'startDate', patterns: [/\b(start date|from date|employment start|joining date)\b/i] },
  { key: 'phoneE164', patterns: [/\b(international phone|phone with country code|country code)\b/i] },
  { key: 'phone', patterns: [/\b(phone|mobile|telephone|tel|contact number)\b/i] },
  { key: 'email', patterns: [/\b(e-?mail|email address)\b/i] },
  { key: 'fullName', patterns: [/\b(full name|your name|applicant name|candidate name)\b/i] },
  { key: 'firstName', patterns: [/\b(first name|given name|forename)\b/i] },
  { key: 'lastName', patterns: [/\b(last name|family name|surname)\b/i] },
  { key: 'streetAddress', patterns: [/\b(street address|address line|mailing address|home address)\b/i] },
  { key: 'city', patterns: [/\b(city|town|municipality)\b/i] },
  { key: 'state', patterns: [/\b(state|province|region)\b/i] },
  { key: 'country', patterns: [/\b(country|nation)\b/i] },
  { key: 'company', patterns: [/\b(company|employer|organization|organisation|business name)\b/i] },
  { key: 'jobTitle', patterns: [/\b(job title|role|position|designation|occupation)\b/i] },
  { key: 'github', patterns: [/\bgithub\b/i] },
  { key: 'linkedin', patterns: [/\blinked.?in\b/i] },
  { key: 'portfolio', patterns: [/\bportfolio\b/i] },
  { key: 'website', patterns: [/\b(website|web site|personal url|homepage)\b/i] },
  { key: 'school', patterns: [/\b(school|college|university|institution)\b/i] },
  { key: 'degree', patterns: [/\b(degree|qualification|major|course of study)\b/i] },
  { key: 'cgpa', patterns: [/\b(cgpa|gpa|grade point|academic score)\b/i] },
  { key: 'yearsExperience', patterns: [/\b(years? of experience|work experience|experience in years)\b/i] },
  { key: 'bio', patterns: [/\b(bio|about you|professional summary|about me)\b/i] },
];

function autocompleteKey(value: string): ProfileField | undefined {
  const token = value.toLowerCase().split(/\s+/).at(-1);
  const keys: Record<string, ProfileField> = {
    name: 'fullName',
    'given-name': 'firstName',
    'family-name': 'lastName',
    email: 'email',
    tel: 'phone',
    'street-address': 'streetAddress',
    'address-level2': 'city',
    'address-level1': 'state',
    'country-name': 'country',
    organization: 'company',
    'organization-title': 'jobTitle',
    url: 'website',
    bday: 'dateOfBirth',
  };
  return token ? keys[token] : undefined;
}

function scoreRule(rule: MatchRule, context: FieldContext): number {
  const matches = (text: string) => rule.patterns.some((pattern) => pattern.test(text));
  const score =
    (context.explicitText.some(matches) ? 8 : 0) +
    (context.nearbyText.some(matches) ? 4 : 0) +
    (context.sectionText.some(matches) ? 2 : 0);
  return score;
}

/** Pick a profile key deterministically, using the closest ring as strongest evidence. */
function inferProfileField(context: FieldContext): ProfileField | undefined {
  const fromAutocomplete = autocompleteKey(context.autocomplete);
  if (fromAutocomplete) return fromAutocomplete;

  const inputType = context.fieldType.toLowerCase();
  if (inputType === 'email') return 'email';
  if (inputType === 'tel') return 'phone';
  if (inputType === 'date') {
    const dateContext = context.explicitText.join(' ').toLowerCase();
    if (/birth|birthday|\bdob\b/.test(dateContext)) return 'dateOfBirth';
    if (/graduat|completion|degree/.test(dateContext)) return 'graduationDate';
    return 'startDate';
  }
  if (inputType === 'url') {
    const all = context.explicitText.join(' ').toLowerCase();
    if (all.includes('github')) return 'github';
    if (all.includes('linkedin')) return 'linkedin';
    if (all.includes('portfolio')) return 'portfolio';
    return 'website';
  }

  const ranked = matchRules
    .map((rule, index) => ({ key: rule.key, score: scoreRule(rule, context), index }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked[0]?.key;
}

function getProjectPrompt(context: FieldContext): boolean {
  return [...context.explicitText, ...context.nearbyText, ...context.sectionText]
    .some((value) => /project|experience|portfolio item|work sample/i.test(value));
}

/** Return zero or one best match. The UI exposes persona switching separately. */
export function matchField(context: FieldContext, persona: Persona): SuggestionOption[] {
  const key = inferProfileField(context);
  if (!key) return [];
  const rawValue = persona.profile[key];
  if (!rawValue) return [];

  return [{
    id: `${persona.id}-${key}`,
    label: key === 'phoneE164' ? 'International phone' : key === 'phoneNational' ? 'Phone number' : key,
    value: transformValue(key, rawValue, context),
    source: `${persona.name} profile`,
    personaId: persona.id,
  }];
}

export function matchGraph(context: FieldContext, graph: KnowledgeGraph, personaId = graph.activePersonaId): SuggestionOption[] {
  const persona = graph.personas.find((item) => item.id === personaId) ?? graph.personas[0];
  if (!persona) return [];
  const suggestions = matchField(context, persona);
  const learned = graph.learnedFields
    .filter((item) => item.personaId === persona.id)
    .filter((item) => [...context.explicitText, context.name, context.id].some((text) => text.toLowerCase().includes(item.label.toLowerCase()) || item.label.toLowerCase().includes(text.toLowerCase())))
    .map((item) => ({
      id: `learned-${item.id}`,
      label: item.label,
      value: transformValue(item.label, item.value, context),
      source: 'Learned field',
      personaId: item.personaId,
      kind: 'learned' as const,
    }));
  const projects = getProjectPrompt(context)
    ? graph.projects.map((project) => ({
      id: `project-${project.id}`,
      label: project.name,
      value: project.description || project.name,
      source: `${project.name} · ${project.role}`,
      personaId: persona.id,
      kind: 'project' as const,
      projectId: project.id,
    }))
    : [];
  return [...learned, ...projects, ...suggestions];
}

/** Useful for callers that need the Sprint 1 personas without importing the data module. */
export function getDefaultPersona(): Persona {
  return mockPersonas[0]!;
}
