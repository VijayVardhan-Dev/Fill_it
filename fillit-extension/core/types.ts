/** A field the extension knows how to fill with a native value setter. */
export type FillableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export type PersonaId = string;

/**
 * The extractor keeps evidence in separate rings so matching can prefer a
 * real label over nearby copy, and nearby copy over a broad section heading.
 */
export interface FieldContext {
  fieldType: string;
  isDropdownField: boolean;
  autocomplete: string;
  name: string;
  id: string;
  explicitText: string[];
  nearbyText: string[];
  sectionText: string[];
}

export type ProfileField =
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'phoneE164'
  | 'phoneNational'
  | 'city'
  | 'state'
  | 'country'
  | 'streetAddress'
  | 'company'
  | 'jobTitle'
  | 'website'
  | 'github'
  | 'linkedin'
  | 'portfolio'
  | 'degree'
  | 'school'
  | 'cgpa'
  | 'graduationDate'
  | 'startDate'
  | 'dateOfBirth'
  | 'yearsExperience'
  | 'bio';

export interface Persona {
  id: PersonaId;
  name: string;
  headline: string;
  /** Local, fictional values used to exercise Sprint 1 without a backend. */
  profile: Record<ProfileField, string>;
}

export interface ProjectItem {
  id: string;
  name: string;
  role: string;
  description: string;
  url: string;
  technologies: string[];
  startDate: string;
  endDate: string;
}

export interface LearnedField {
  id: string;
  personaId: PersonaId;
  label: string;
  value: string;
  fieldType: string;
  source: string;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeGraph {
  version: number;
  updatedAt: number;
  activePersonaId: PersonaId;
  personas: Persona[];
  projects: ProjectItem[];
  learnedFields: LearnedField[];
}

export type MessageType =
  | 'SAVE_LEARNED_FIELD'
  | 'UPDATE_GRAPH'
  | 'RESET_DEFAULT_GRAPH'
  | 'GET_GRAPH';

export interface SaveLearnedFieldMessage {
  type: 'SAVE_LEARNED_FIELD';
  field: Omit<LearnedField, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface UpdateGraphMessage {
  type: 'UPDATE_GRAPH';
  graph: KnowledgeGraph;
}

export interface RuntimeMessage {
  type: MessageType;
  graph?: KnowledgeGraph;
  field?: SaveLearnedFieldMessage['field'];
}

export interface SuggestionOption {
  id: string;
  label: string;
  value: string;
  source: string;
  personaId: PersonaId;
  kind?: 'profile' | 'learned' | 'project';
  projectId?: string;
}
