import type { AiConfig, KnowledgeGraph, RuntimeMessage } from './types';

export const STORAGE_KEY = 'fillit_knowledge_graph';
export const CHANNEL_NAME = 'fillit_knowledge_graph_channel';
export const AI_CONFIG_KEY = 'fillit_ai_config';

type StorageChanges = Record<string, { newValue?: unknown }>;
type StorageListener = (changes: StorageChanges) => void;

function hasChromeStorage(): boolean {
  return typeof globalThis !== 'undefined' &&
    Boolean((globalThis as { chrome?: { storage?: { local?: unknown } } }).chrome?.storage?.local);
}

function hasBrowserStorage(): boolean {
  return typeof browser !== 'undefined' &&
    Boolean(browser.storage?.local);
}

function getFallbackValue(): KnowledgeGraph | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as KnowledgeGraph : null;
  } catch {
    return null;
  }
}

async function getStoredGraph(): Promise<KnowledgeGraph | null> {
  if (hasBrowserStorage() || hasChromeStorage()) {
    try {
      const result = await browser.storage.local.get(STORAGE_KEY);
      return (result[STORAGE_KEY] as KnowledgeGraph | undefined) ?? null;
    } catch {
      // Fall through to the page-local fallback when the extension API is unavailable.
    }

  }
  return getFallbackValue();
}

function getFallbackAiConfig(): AiConfig | null {
  try {
    const raw = globalThis.localStorage?.getItem(AI_CONFIG_KEY);
    return raw ? JSON.parse(raw) as AiConfig : null;
  } catch {
    return null;
  }
}

export async function getAiConfig(): Promise<AiConfig> {
  const fallback: AiConfig = { provider: 'local', apiKey: '', model: 'gemini-2.0-flash' };
  if (hasBrowserStorage() || hasChromeStorage()) {
    try {
      const result = await browser.storage.local.get(AI_CONFIG_KEY);
      return { ...fallback, ...(result[AI_CONFIG_KEY] as Partial<AiConfig> | undefined) };
    } catch {
      // Use the local preview fallback when the extension API is unavailable.
    }
  }
  return { ...fallback, ...(getFallbackAiConfig() ?? {}) };
}

export async function setAiConfig(config: AiConfig): Promise<void> {
  const snapshot = { ...config };
  if (hasBrowserStorage() || hasChromeStorage()) {
    try {
      await browser.storage.local.set({ [AI_CONFIG_KEY]: snapshot });
      return;
    } catch {
      // Use localStorage in localhost previews.
    }
  }
  try {
    globalThis.localStorage?.setItem(AI_CONFIG_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage is optional in ordinary web-page preview contexts.
  }
}

export async function setStoredGraph(graph: KnowledgeGraph): Promise<void> {
  const snapshot = { ...graph, updatedAt: Date.now() };
  if (hasBrowserStorage() || hasChromeStorage()) {
    try {
      await browser.storage.local.set({ [STORAGE_KEY]: snapshot });
      return;
    } catch {
      // Fall through to the page-local fallback.
    }
  }
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(snapshot);
      channel.close();
    }
  } catch {
    // Storage is optional in ordinary web-page preview contexts.
  }
}

export async function getGraphSnapshot(): Promise<KnowledgeGraph | null> {
  return getStoredGraph();
}

export function subscribeToGraph(callback: (graph: KnowledgeGraph) => void): () => void {
  const listener: StorageListener = (changes) => {
    const graph = changes[STORAGE_KEY]?.newValue as KnowledgeGraph | undefined;
    if (graph) callback(graph);
  };

  if (hasBrowserStorage() || hasChromeStorage()) {
    try {
      browser.storage.onChanged.addListener(listener);
      return () => browser.storage.onChanged.removeListener(listener);
    } catch {
      // Fall through to BroadcastChannel/localStorage.
    }
  }

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const onMessage = (event: MessageEvent<KnowledgeGraph>) => {
      if (event.data) callback(event.data);
    };
    channel.addEventListener('message', onMessage);
    return () => {
      channel.removeEventListener('message', onMessage);
      channel.close();
    };
  }

  return () => undefined;
}

export async function sendGraphMessage(message: RuntimeMessage): Promise<KnowledgeGraph | null> {
  if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
    try {
      return await browser.runtime.sendMessage(message) as KnowledgeGraph | null;
    } catch {
      // A regular web tab has no extension runtime; use the local fallback.
    }
  }
  if (message.type === 'UPDATE_GRAPH' && message.graph) {
    await setStoredGraph(message.graph);
    return message.graph;
  }
  return null;
}
