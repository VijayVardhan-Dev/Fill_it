import { useEffect, useState } from 'react';
import type { KnowledgeGraph, Persona } from '../../core/types';
import { getAiConfig, getGraphSnapshot, sendGraphMessage, setAiConfig, subscribeToGraph } from '../../core/storageBridge';
import { parseResumeText } from '../../core/aiCoPilotEngine';
import type { AiConfig } from '../../core/types';

const emptyPersona = (): Persona => ({
  id: crypto.randomUUID(),
  name: 'New persona',
  headline: 'Custom profile',
  profile: {
    fullName: '', firstName: '', lastName: '', email: '', phone: '', phoneE164: '', phoneNational: '',
    city: '', state: '', country: '', streetAddress: '', company: '', jobTitle: '', website: '',
    github: '', linkedin: '', portfolio: '', degree: '', school: '', cgpa: '', graduationDate: '',
    startDate: '', dateOfBirth: '', yearsExperience: '', bio: '',
  },
});

export function VaultApp() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [saved, setSaved] = useState(false);
  const [aiConfig, setAiConfigState] = useState<AiConfig>({ provider: 'local', apiKey: '', model: 'gemini-2.0-flash' });
  const [resumeText, setResumeText] = useState('');
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    void getGraphSnapshot().then((snapshot) => {
      if (snapshot) {
        setGraph(snapshot);
        setSelectedId(snapshot.activePersonaId);
      }
    });
    void getAiConfig().then(setAiConfigState);
    return subscribeToGraph((snapshot) => {
      setGraph(snapshot);
      setSelectedId((current) => current || snapshot.activePersonaId);
    });
  }, []);

  if (!graph) return <main className="vault-loading">Loading Knowledge Vault…</main>;
  const persona = graph.personas.find((item) => item.id === selectedId) ?? graph.personas[0]!;

  const update = (patch: Partial<Persona>) => {
    setGraph({
      ...graph,
      updatedAt: Date.now(),
      personas: graph.personas.map((item) => item.id === persona.id ? { ...item, ...patch } : item),
    });
    setSaved(false);
  };
  const save = () => {
    if (!graph) return;
    void sendGraphMessage({ type: 'UPDATE_GRAPH', graph }).then(() => setSaved(true));
  };
  const addPersona = () => {
    const next = emptyPersona();
    setGraph({ ...graph, personas: [...graph.personas, next], activePersonaId: next.id });
    setSelectedId(next.id);
  };
  const updateAiConfig = (patch: Partial<AiConfig>) => {
    const next = { ...aiConfig, ...patch };
    setAiConfigState(next);
    void setAiConfig(next);
  };
  const importResume = () => {
    setImportStatus('Parsing locally…');
    void parseResumeText(resumeText).then((profile) => {
      setGraph({ ...graph, updatedAt: Date.now(), personas: graph.personas.map((item) => item.id === persona.id ? { ...item, profile: { ...item.profile, ...profile } } : item) });
      setResumeText('');
      setImportStatus('Profile fields staged. Save changes to commit.');
    }).catch(() => setImportStatus('Could not parse that text.'));
  };

  return (
    <main className="vault">
      <header className="vault-header">
        <div className="vault-brand"><span>F</span><div><strong>FillIt</strong><small>Knowledge Vault</small></div></div>
        <div className="vault-actions">
          <span className="vault-sync">{saved ? 'Saved locally' : 'Local changes'}</span>
          <button onClick={save}>Save changes</button>
        </div>
      </header>
      <div className="vault-layout">
        <aside className="vault-sidebar">
          <p className="vault-eyebrow">PERSONAS</p>
          {graph.personas.map((item) => (
            <button className={item.id === persona.id ? 'vault-persona active' : 'vault-persona'} key={item.id} onClick={() => setSelectedId(item.id)}>
              <span>{item.name.slice(0, 1)}</span><b>{item.name}</b><small>{item.headline}</small>
            </button>
          ))}
          <button className="vault-add" onClick={addPersona}>+ Add persona</button>
          <p className="vault-eyebrow vault-eyebrow--projects">PROJECTS</p>
          <p className="vault-muted">{graph.projects.length} project{graph.projects.length === 1 ? '' : 's'} in your graph</p>
          <p className="vault-eyebrow vault-eyebrow--projects">LEARNED</p>
          <p className="vault-muted">{graph.learnedFields.length} learned field{graph.learnedFields.length === 1 ? '' : 's'}</p>
        </aside>
        <section className="vault-main">
          <div className="vault-title"><div><p className="vault-eyebrow">IDENTITY</p><h1>{persona.name} profile</h1></div><span className="vault-chip">Indexed locally</span></div>
          <div className="vault-card">
            <div className="vault-grid">
              <label>Display name<input value={persona.name} onChange={(event) => update({ name: event.currentTarget.value })} /></label>
              <label>Headline<input value={persona.headline} onChange={(event) => update({ headline: event.currentTarget.value })} /></label>
              {(['fullName', 'email', 'phone', 'company', 'jobTitle', 'city', 'country', 'website', 'degree', 'school', 'bio'] as const).map((key) => (
                <label key={key}>{key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}<input value={persona.profile[key]} onChange={(event) => update({ profile: { ...persona.profile, [key]: event.currentTarget.value } })} /></label>
              ))}
            </div>
          </div>
          <div className="vault-title vault-title--section"><div><p className="vault-eyebrow">LEARNED FIELDS</p><h2>Progressive memory</h2></div></div>
          <div className="vault-card vault-learned">
            {graph.learnedFields.filter((item) => item.personaId === persona.id).map((item) => <div key={item.id}><b>{item.label}</b><span>{item.value}</span><small>{item.source}</small></div>)}
            {!graph.learnedFields.some((item) => item.personaId === persona.id) && <p className="vault-muted">Fields you save from the Silent Learner will appear here.</p>}
          </div>
          <div className="vault-title vault-title--section"><div><p className="vault-eyebrow">AI ENGINE & SMART IMPORT</p><h2>Private by default</h2></div></div>
          <div className="vault-card vault-ai-card">
            <div className="vault-ai-grid">
              <label>Provider<select value={aiConfig.provider} onChange={(event) => updateAiConfig({ provider: event.currentTarget.value as AiConfig['provider'] })}><option value="local">Smart Local Synthesizer</option><option value="gemini">Live Gemini</option><option value="groq">Live Groq</option></select></label>
              <label>Model<input value={aiConfig.model} onChange={(event) => updateAiConfig({ model: event.currentTarget.value })} placeholder="gemini-2.0-flash" /></label>
              <label className="vault-ai-key">API key<input type="password" value={aiConfig.apiKey} onChange={(event) => updateAiConfig({ apiKey: event.currentTarget.value })} placeholder="Optional; stored locally" /></label>
            </div>
            <p className="vault-muted">Only safe professional context is sent to a live provider. Passwords, government IDs, and raw financial numbers stay local.</p>
            <label className="vault-import-label">Paste resume or profile text<textarea value={resumeText} onChange={(event) => setResumeText(event.currentTarget.value)} placeholder="Paste text to extract name, bio, email, and phone…" /></label>
            <div className="vault-import-actions"><button onClick={importResume} disabled={!resumeText.trim()}>Parse into this persona</button><span>{importStatus}</span></div>
          </div>
        </section>
      </div>
    </main>
  );
}
