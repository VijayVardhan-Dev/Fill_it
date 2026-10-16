import { getAiConfig } from './storageBridge';
import type {
  AiFieldExplanation,
  KnowledgeGraph,
  PageContextPacket,
  Persona,
  RuntimeMessage,
  TextareaDraft,
} from './types';

const LOCAL_PRIVACY_NOTE = 'Keep passwords, government IDs, and financial numbers out of this field.';

function activePersona(graph: KnowledgeGraph): Persona {
  return graph.personas.find((item) => item.id === graph.activePersonaId) ?? graph.personas[0]!;
}

function sanitizeResumeText(value: string): string {
  return value
    .split(/\r?\n/)
    .filter((line) => !/(password|passcode|ssn|social security|government id|passport|bank|routing|credit card|account number)/i.test(line))
    .map((line) => line.replace(/\b\d{6,}\b/g, '[redacted number]'))
    .join('\n')
    .slice(0, 12000);
}

function profileContext(graph: KnowledgeGraph): string {
  const persona = activePersona(graph);
  const profile = persona.profile;
  return [
    `Job title: ${profile.jobTitle}`,
    `Headline: ${persona.headline}`,
    `School: ${profile.school}`,
    `Company: ${profile.company}`,
    `Bio: ${profile.bio}`,
    `Projects: ${graph.projects.map((project) => `${project.name} (${project.role}): ${project.description}`).join('; ')}`,
  ].filter((item) => !item.endsWith(': ')).join('\n');
}

function fieldLabel(packet: PageContextPacket): string {
  return packet.fieldLabel || packet.helperText[0] || packet.pageTitle || 'this field';
}

export function synthesizeFieldExplanation(packet: PageContextPacket, graph: KnowledgeGraph): AiFieldExplanation {
  const label = fieldLabel(packet);
  const persona = activePersona(graph);
  const relatedProject = graph.projects.find((project) =>
    `${project.name} ${project.description} ${project.technologies.join(' ')}`.toLowerCase().includes(label.toLowerCase().split(' ')[0] ?? ''),
  );
  return {
    summary: `${label} asks for a professional response tailored to ${packet.pageTitle || 'this application'}.`,
    whatToWrite: relatedProject
      ? `Lead with your ${relatedProject.role} work on ${relatedProject.name}, then connect the result to the question.`
      : `Use ${persona.profile.jobTitle || persona.headline || 'your professional experience'} as the anchor and include one concrete outcome.`,
    tips: [
      packet.constraints.length ? `Respect: ${packet.constraints.join(', ')}.` : 'Answer directly in 2–4 sentences.',
      packet.helperText[0] ? `Prompt hint: ${packet.helperText[0]}` : 'Use a specific example rather than a generic claim.',
      LOCAL_PRIVACY_NOTE,
    ],
    privacyNote: LOCAL_PRIVACY_NOTE,
  };
}

function localDrafts(prompt: string, graph: KnowledgeGraph, refinement?: RuntimeMessage['refinement']): TextareaDraft[] {
  const persona = activePersona(graph);
  const project = graph.projects[0];
  const anchor = project ? `${project.name}: ${project.description}` : persona.profile.bio || persona.headline;
  const base = persona.profile.bio || `${persona.profile.jobTitle || persona.headline} with a focus on practical, accessible products.`;
  const drafts: TextareaDraft[] = [
    { id: 'technical', label: 'Technical Focus', value: `${base} I would approach “${prompt}” by applying a clear technical plan, measuring the result, and iterating from real user feedback. ${anchor}` },
    { id: 'concise', label: 'Concise Pitch', value: `I bring ${persona.profile.jobTitle || 'hands-on product engineering'} experience to “${prompt}”, turning ambiguous requirements into simple, useful outcomes.` },
    { id: 'impact', label: 'Founder/Impact Angle', value: `“${prompt}” is an opportunity to create durable user value. I combine product judgment with execution to move from a real problem to a measurable outcome, as shown by ${project?.name || 'my recent work'}.` },
  ];
  if (refinement === 'Shorter') return drafts.map((draft) => ({ ...draft, value: draft.value.split('. ').slice(0, 2).join('. ') }));
  if (refinement === 'More Technical') return drafts.map((draft) => ({ ...draft, value: `${draft.value} I would validate the approach with instrumentation, accessibility checks, and a small feedback loop.` }));
  if (refinement === 'Formal') return drafts.map((draft) => ({ ...draft, value: draft.value.replace(/I would|I bring/g, 'My approach is to') }));
  return drafts;
}

function canUseRuntime(): boolean {
  return typeof browser !== 'undefined' && Boolean(browser.runtime?.sendMessage) && !['localhost', '127.0.0.1'].includes(location.hostname);
}

async function request(message: RuntimeMessage, local: () => Promise<unknown>): Promise<unknown> {
  if (canUseRuntime()) {
    try {
      return await browser.runtime.sendMessage(message);
    } catch {
      // A restricted preview can still use the local synthesizer.
    }
  }
  return local();
}

export async function askAiCopilot(packet: PageContextPacket, graph: KnowledgeGraph): Promise<AiFieldExplanation> {
  return request({ type: 'ASK_AI_COPILOT', packet }, async () => synthesizeFieldExplanation(packet, graph)) as Promise<AiFieldExplanation>;
}

export async function generateTextareaDrafts(prompt: string, graph: KnowledgeGraph, refinement?: RuntimeMessage['refinement']): Promise<TextareaDraft[]> {
  return request({ type: 'GENERATE_TEXTAREA_DRAFTS', prompt, refinement }, async () => localDrafts(prompt, graph, refinement)) as Promise<TextareaDraft[]>;
}

export async function parseResumeText(resumeText: string): Promise<Partial<Persona['profile']>> {
  return request({ type: 'PARSE_RESUME_TEXT', resumeText }, async () => {
    const lines = resumeText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return {
      fullName: lines[0] ?? '',
      bio: lines.slice(1, 4).join(' '),
      email: lines.find((line) => /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(line)) ?? '',
      phone: lines.find((line) => /\+?\d[\d\s().-]{7,}/.test(line)) ?? '',
    };
  }) as Promise<Partial<Persona['profile']>>;
}

export async function executeLiveAi(
  message: RuntimeMessage,
  graph: KnowledgeGraph,
): Promise<AiFieldExplanation | TextareaDraft[] | Partial<Persona['profile']>> {
  const config = await getAiConfig();
  if (config.provider === 'local' || !config.apiKey) {
    if (message.type === 'ASK_AI_COPILOT' && message.packet) return synthesizeFieldExplanation(message.packet, graph);
    if (message.type === 'GENERATE_TEXTAREA_DRAFTS') return localDrafts(message.prompt ?? '', graph, message.refinement);
    return {};
  }
  const system = `You are FillIt, a concise professional writing copilot. Never request or infer secrets. Use only this safe profile context:\n${profileContext(graph)}`;
  const user = message.type === 'ASK_AI_COPILOT'
    ? JSON.stringify(message.packet)
    : message.type === 'GENERATE_TEXTAREA_DRAFTS'
      ? `Return exactly three JSON drafts labelled Technical Focus, Concise Pitch, Founder/Impact Angle for: ${message.prompt ?? ''}`
      : `Extract safe professional profile fields from this resume text. Do not return passwords, IDs, or financial numbers:\n${sanitizeResumeText(message.resumeText ?? '')}`;
  if (config.provider === 'groq') {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model || 'llama-3.1-8b-instant', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.4 }),
    });
    if (!response.ok) throw new Error(`Groq request failed (${response.status}).`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return parseAiPayload(data.choices?.[0]?.message?.content ?? '');
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model || 'gemini-2.0-flash')}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ parts: [{ text: user }] }], generationConfig: { responseMimeType: 'application/json' } }),
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status}).`);
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return parseAiPayload(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
}

function parseAiPayload(value: string): AiFieldExplanation | TextareaDraft[] | Partial<Persona['profile']> {
  const start = value.indexOf('{');
  const arrayStart = value.indexOf('[');
  const json = start >= 0 && (arrayStart < 0 || start < arrayStart) ? value.slice(start) : value.slice(arrayStart);
  try {
    return JSON.parse(json.replace(/```json|```/g, '').trim()) as AiFieldExplanation | TextareaDraft[] | Partial<Persona['profile']>;
  } catch {
    throw new Error('The AI provider returned an unreadable response.');
  }
}
