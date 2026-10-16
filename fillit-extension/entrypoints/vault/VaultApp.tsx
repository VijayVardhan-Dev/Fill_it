import { useEffect, useState } from 'react';
import type { KnowledgeGraph, Persona } from '../../core/types';
import { getGraphSnapshot, sendGraphMessage, subscribeToGraph } from '../../core/storageBridge';

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

  useEffect(() => {
    void getGraphSnapshot().then((snapshot) => {
      if (snapshot) {
        setGraph(snapshot);
        setSelectedId(snapshot.activePersonaId);
      }
    });
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
        </section>
      </div>
    </main>
  );
}
