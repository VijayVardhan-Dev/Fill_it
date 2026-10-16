import Dexie, { type Table } from 'dexie';
import { mockPersonas } from './mockKnowledgeGraph';
import { setStoredGraph } from './storageBridge';
import type { KnowledgeGraph, LearnedField, Persona, ProjectItem } from './types';

export class FillItDatabase extends Dexie {
  personas!: Table<Persona, string>;
  projects!: Table<ProjectItem, string>;
  learnedFields!: Table<LearnedField, string>;

  constructor() {
    super('FillItKnowledgeGraph');
    this.version(1).stores({
      personas: 'id',
      projects: 'id',
      learnedFields: 'id, personaId, label',
    });
  }
}

export const db = new FillItDatabase();

export function createDefaultGraph(): KnowledgeGraph {
  return {
    version: 1,
    updatedAt: Date.now(),
    activePersonaId: mockPersonas[0]!.id,
    personas: structuredClone(mockPersonas),
    projects: [
      {
        id: 'project-fillit',
        name: 'FillIt',
        role: 'Lead engineer',
        description: 'A privacy-first browser extension for fast, context-aware form filling.',
        url: '',
        technologies: ['React', 'TypeScript', 'WXT'],
        startDate: '2026-01-01',
        endDate: '',
      },
      {
        id: 'project-accessibility',
        name: 'Accessible Web Platform',
        role: 'Software engineer',
        description: 'Accessible web applications with resilient design systems and progressive enhancement.',
        url: '',
        technologies: ['React', 'Web Components'],
        startDate: '2024-01-01',
        endDate: '2025-12-31',
      },
    ],
    learnedFields: [],
  };
}

export async function readGraph(): Promise<KnowledgeGraph> {
  const [personas, projects, learnedFields] = await Promise.all([
    db.personas.toArray(),
    db.projects.toArray(),
    db.learnedFields.toArray(),
  ]);
  if (!personas.length) {
    const graph = createDefaultGraph();
    await writeGraph(graph);
    return graph;
  }
  return {
    version: 1,
    updatedAt: Date.now(),
    activePersonaId: personas[0]!.id,
    personas,
    projects,
    learnedFields,
  };
}

export async function writeGraph(graph: KnowledgeGraph): Promise<void> {
  await db.transaction('rw', db.personas, db.projects, db.learnedFields, async () => {
    await db.personas.clear();
    await db.projects.clear();
    await db.learnedFields.clear();
    await db.personas.bulkPut(graph.personas);
    await db.projects.bulkPut(graph.projects);
    await db.learnedFields.bulkPut(graph.learnedFields);
  });
  await setStoredGraph(graph);
}

export async function syncGraph(): Promise<KnowledgeGraph> {
  const graph = await readGraph();
  await setStoredGraph(graph);
  return graph;
}

export async function saveLearnedField(field: Omit<LearnedField, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeGraph> {
  const graph = await readGraph();
  const now = Date.now();
  const existing = graph.learnedFields.find((item) => item.personaId === field.personaId && item.label.toLowerCase() === field.label.toLowerCase());
  const learned: LearnedField = {
    ...field,
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  graph.learnedFields = [...graph.learnedFields.filter((item) => item.id !== learned.id), learned];
  await writeGraph(graph);
  return graph;
}

export async function resetGraph(): Promise<KnowledgeGraph> {
  const graph = createDefaultGraph();
  await writeGraph(graph);
  return graph;
}
