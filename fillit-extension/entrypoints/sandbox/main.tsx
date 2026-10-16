import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import ReactDOM from 'react-dom/client';

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  margin: 0,
  padding: '40px 20px 72px',
  background: '#f4f6fb',
  color: '#172033',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};

const cardStyle: CSSProperties = {
  padding: 24,
  border: '1px solid #e2e7f0',
  borderRadius: 18,
  background: '#fff',
  boxShadow: '0 8px 28px rgba(30, 48, 80, .06)',
};

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 42,
  padding: '10px 12px',
  border: '1px solid #cbd3e1',
  borderRadius: 9,
  background: '#fff',
  color: '#172033',
  font: 'inherit',
};

function Field({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
}) {
  const id = `sandbox-${name}`;
  return (
    <label htmlFor={id} style={{ display: 'grid', gap: 7, color: '#34405a', fontSize: 14, fontWeight: 600 }}>
      {label}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function ShadowDomField() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // This is a real separate DOM tree; FillIt must use composedPath()[0] to
    // find the input that receives focus instead of the shadow host wrapper.
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; font: 14px/1.5 Inter, system-ui, sans-serif; color: #34405a; }
      label { display: grid; gap: 7px; font-weight: 600; }
      input { box-sizing: border-box; min-height: 42px; width: 100%; padding: 10px 12px;
        border: 1px solid #cbd3e1; border-radius: 9px; font: inherit; }
    `;
    const label = document.createElement('label');
    label.textContent = 'GitHub profile · Shadow DOM';
    const input = document.createElement('input');
    input.name = 'github';
    input.type = 'url';
    input.placeholder = 'https://github.com/…';
    label.append(input);
    shadow.append(style, label);

    return () => shadow.replaceChildren();
  }, []);

  return <div ref={hostRef} />;
}

function CustomSelect({ value, onChange }: { value: string; onChange(value: string): void }) {
  const [open, setOpen] = useState(false);
  const options = ['Bhimavaram', 'Bengaluru', 'Hyderabad'];
  const id = 'sandbox-custom-city';
  const visibleOptions = options.filter((option) => option.toLowerCase().includes(value.toLowerCase()));

  return (
    <div style={{ position: 'relative', display: 'grid', gap: 7, color: '#34405a', fontSize: 14, fontWeight: 600 }}>
      <label htmlFor={id}>City (custom combobox)</label>
      <input
        id={id}
        name="city"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="sandbox-city-options"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          // A native input powers this custom widget, so frameworks still
          // receive normal input/change events from the extension injector.
          onChange(event.currentTarget.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown') setOpen(true);
        }}
        style={inputStyle}
      />
      {open && (
        <div id="sandbox-city-options" role="listbox" style={{ position: 'absolute', zIndex: 5, top: '100%', left: 0, right: 0, padding: 5, border: '1px solid #dbe2ee', borderRadius: 10, background: '#fff', boxShadow: '0 12px 24px rgba(30,48,80,.14)' }}>
          {visibleOptions.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              style={{ display: 'block', width: '100%', padding: '8px 10px', border: 0, borderRadius: 7, background: value === option ? '#eef2ff' : 'transparent', color: '#34405a', textAlign: 'left', font: 'inherit', cursor: 'pointer' }}
            >
              {option}
            </button>
          ))}
          {!visibleOptions.length && <p style={{ margin: 0, padding: 8, color: '#69758a', fontWeight: 400 }}>No matching city</p>}
        </div>
      )}
    </div>
  );
}

function App() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    cgpa: '',
    graduationDate: '',
    company: '',
    city: '',
    country: '',
  });
  const [projectExperience, setProjectExperience] = useState('');
  const [workSample, setWorkSample] = useState('');
  const [workAuthorization, setWorkAuthorization] = useState('');
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gap: 24 }}>
        <header>
          <p style={{ margin: '0 0 8px', color: '#5546d7', fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase' }}>
            FillIt · Sprint 1
          </p>
          <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(30px, 5vw, 46px)', letterSpacing: '-.04em' }}>
            Stress-test sandbox
          </h1>
          <p style={{ maxWidth: 720, margin: 0, color: '#5f6b82', lineHeight: 1.7 }}>
            Click or focus an eligible field to see local demo suggestions. Choose a value to fill it; no field is changed automatically.
          </p>
        </header>

        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>React controlled form</h2>
          <p style={{ margin: '0 0 20px', color: '#69758a', fontSize: 14 }}>
            These inputs are controlled by React state. Filling should update both the visible field and its state.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <Field label="Full name" name="fullName" value={form.fullName} onChange={update('fullName')} />
            <Field label="Email address" name="email" type="email" value={form.email} onChange={update('email')} />
            <Field label="Phone number" name="phone" type="tel" value={form.phone} onChange={update('phone')} />
            <Field label="CGPA (0.00 format)" name="cgpa" type="number" value={form.cgpa} onChange={update('cgpa')} placeholder="0.00" />
            <Field label="Graduation date" name="graduationDate" type="date" value={form.graduationDate} onChange={update('graduationDate')} />
            <Field label="Company / employer" name="company" value={form.company} onChange={update('company')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, maxWidth: 760, marginTop: 16 }}>
            <label htmlFor="sandbox-country" style={{ display: 'grid', gap: 7, color: '#34405a', fontSize: 14, fontWeight: 600 }}>
              Country (native select)
              <select id="sandbox-country" name="country" value={form.country} onChange={(event) => update('country')(event.currentTarget.value)} style={{ ...inputStyle, appearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, #6b7280 50%), linear-gradient(135deg, #6b7280 50%, transparent 50%)', backgroundPosition: 'calc(100% - 18px) 18px, calc(100% - 12px) 18px', backgroundSize: '6px 6px, 6px 6px', backgroundRepeat: 'no-repeat' }}>
                <option value="">Choose a country</option>
                <option value="India">India</option>
                <option value="United States">United States</option>
              </select>
            </label>
            <CustomSelect value={form.city} onChange={update('city')} />
          </div>
        </section>

        <section style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Shadow DOM field</h2>
            <p style={{ margin: '0 0 16px', color: '#69758a', fontSize: 14, lineHeight: 1.6 }}>
              The field lives inside an open shadow root. This checks composed event paths and label extraction there.
            </p>
            <ShadowDomField />
          </div>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Nearby text context</h2>
            <p style={{ margin: '0 0 16px', color: '#69758a', fontSize: 14, lineHeight: 1.6 }}>
              This intentionally has no associated label. The nearby prompt is available to the geometric context ring.
            </p>
            <div style={{ display: 'grid', gap: 7, color: '#34405a', fontSize: 14, fontWeight: 600 }}>
              Your current city
              <input name="nearby-city" placeholder="Type city" value={form.city} onChange={(event) => update('city')(event.currentTarget.value)} style={inputStyle} />
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>About you · iframe test</h2>
          <p style={{ margin: '0 0 16px', color: '#69758a', fontSize: 14 }}>
            The iframe is an about:srcdoc frame. WXT is configured to inject the content script into all frames, including about:blank/srcdoc frames.
          </p>
          <iframe
            title="FillIt iframe field test"
            style={{ width: '100%', height: 150, border: '1px solid #dbe2ee', borderRadius: 12, background: '#fff' }}
            srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px/1.5 system-ui,sans-serif;color:#34405a;padding:14px;margin:0}label{display:grid;gap:7px;font-weight:600}input{box-sizing:border-box;max-width:480px;width:100%;min-height:42px;padding:10px 12px;border:1px solid #cbd3e1;border-radius:9px;font:inherit}</style></head><body><label>Professional summary<textarea aria-label="Professional summary" name="bio" placeholder="A few lines about you" style="box-sizing:border-box;width:100%;max-width:640px;min-height:60px;padding:10px 12px;border:1px solid #cbd3e1;border-radius:9px;font:inherit"></textarea></label></body></html>`}
          />
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Test #6 · Multi-project repeater loop</h2>
          <p style={{ margin: '0 0 16px', color: '#69758a', fontSize: 14 }}>
            Project and experience prompts surface every project in the live Knowledge Graph as reusable suggestions.
          </p>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <Field label="Project experience" name="project-experience" value={projectExperience} onChange={setProjectExperience} placeholder="Describe a project" />
            <Field label="Work sample / portfolio item" name="work-sample" value={workSample} onChange={setWorkSample} placeholder="Select a project" />
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Test #7 · Progressive Silent Learner</h2>
          <p style={{ margin: '0 0 16px', color: '#69758a', fontSize: 14 }}>
            Type a value that is not in the current graph, pause briefly, and save it from the Apple-style toast.
          </p>
          <Field label="Preferred work authorization (new field)" name="work-authorization" value={workAuthorization} onChange={setWorkAuthorization} placeholder="e.g. Employment visa" />
        </section>

        <footer style={{ color: '#7b879b', fontSize: 12 }}>
          Demo values are fictional and live in the extension bundle. Nothing is sent to a server.
        </footer>
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
