import './App.css';

function App() {
  const openVault = () => {
    const popupUrl = browser.runtime.getURL('/popup.html');
    void browser.tabs.create({ url: popupUrl.replace('/popup.html', '/vault.html') });
  };

  return (
    <main className="toolbar">
      <header className="toolbar__header">
        <div className="toolbar__mark">F</div>
        <div>
          <h1>FillIt</h1>
          <p>Local profile utility</p>
        </div>
        <span className="toolbar__status" aria-label="Ready" />
      </header>
      <section className="toolbar__card">
        <span className="toolbar__eyebrow">QUICK START</span>
        <p>Focus any supported form field to open FillIt suggestions.</p>
        <div className="toolbar__shortcut">
          <span>Keyboard navigation</span>
          <kbd>↑ ↓</kbd>
          <kbd>↵</kbd>
        </div>
      </section>
      <button type="button" className="toolbar__vault" onClick={openVault}>
        <span>⌘</span>
        <span><strong>Open Knowledge Vault</strong><small>Edit personas, projects & learned fields</small></span>
        <b>↗</b>
      </button>
      <footer className="toolbar__footer">
        <span>Privacy-first · runs locally</span>
        <span className="toolbar__version">v0.1</span>
      </footer>
    </main>
  );
}

export default App;
