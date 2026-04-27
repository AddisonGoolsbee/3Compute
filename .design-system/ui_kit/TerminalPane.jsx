// Paper-light terminal — warm cream surface, ink text, ochre prompt
const TerminalPane = () => {
  const [activeTab, setActiveTab] = React.useState(0);
  const tabs = [
    { id: 1, name: 'Terminal', lines: [
      { kind: 'prompt', text: 'alex@3compute:~/first-website$ ', cmd: 'python app.py' },
      { kind: 'out', text: ' * Serving Flask app "app"' },
      { kind: 'out', text: ' * Running on http://0.0.0.0:3000', color: 'var(--c-forest)' },
      { kind: 'out', text: '   Live at: https://alex.app.3compute.org', color: 'var(--c-navy)' },
      { kind: 'prompt', text: 'alex@3compute:~/first-website$ ', cmd: '' },
    ]},
    { id: 2, name: 'Tests', lines: [
      { kind: 'prompt', text: 'alex@3compute:~/first-website$ ', cmd: 'pytest -v' },
      { kind: 'out', text: 'collected 1 item' },
      { kind: 'out', text: 'tests/test_app.py::test_home PASSED', color: 'var(--c-forest)' },
      { kind: 'out', text: '1 passed in 0.08s', color: 'var(--c-forest)' },
      { kind: 'prompt', text: 'alex@3compute:~/first-website$ ', cmd: '' },
    ]},
  ];
  const tab = tabs[activeTab];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--ide-bg)', border: '1px solid var(--ide-rule)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', background: 'var(--ide-elevated)',
        borderBottom: '1px solid var(--ide-rule)', padding: '6px 8px', alignItems: 'center', gap: 4 }}>
        {tabs.map((t, i) => (
          <button key={t.id} onClick={() => setActiveTab(i)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px',
              border: 'none', cursor: 'pointer', borderRadius: '6px 6px 0 0',
              fontFamily: 'inherit',
              background: i === activeTab ? 'var(--ide-bg)' : 'transparent',
              borderBottom: i === activeTab ? '2px solid var(--c-ochre)' : '2px solid transparent',
              color: i === activeTab ? 'var(--ink-strong)' : 'var(--ink-muted)', fontSize: 13,
            }}>
            <I.Terminal size={12} /> {t.name}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, padding: '14px 18px', fontFamily: 'var(--font-mono)',
        fontSize: 13, lineHeight: 1.6, overflow: 'auto', color: 'var(--ink-default)' }}>
        {tab.lines.map((l, i) => (
          <div key={i} style={{ color: l.color || 'var(--ink-default)' }}>
            {l.kind === 'prompt' ? (
              <>
                <span style={{ color: 'var(--c-ochre)' }}>{l.text}</span>
                <span style={{ color: 'var(--ink-strong)' }}>{l.cmd}</span>
                {!l.cmd && i === tab.lines.length - 1 && (
                  <span className="cursor-blink" style={{ display: 'inline-block', width: 7, height: 14,
                    background: 'var(--ink-muted)', verticalAlign: 'middle' }} />
                )}
              </>
            ) : l.text}
          </div>
        ))}
      </div>
    </div>
  );
};

window.TerminalPane = TerminalPane;
