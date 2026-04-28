const EDITOR_FILES = {
  'app.py': ['# A simple Flask website.', 'from flask import Flask', '', 'app = Flask(__name__)', '', '@app.route("/")', 'def home():', '    return "Welcome to my website!"', '', '@app.route("/about")', 'def about():', '    return "I am learning Python at CS Room."', '', 'if __name__ == "__main__":', '    app.run(host="0.0.0.0", port=3000)'],
  'README.md': ['# first-website', '', 'My very first Flask app.', '', '## Run it', '', '    python app.py'],
  'requirements.txt': ['flask==3.0.0', 'pytest==8.0.0'],
  'test_app.py': ['from app import app', '', 'def test_home():', '    client = app.test_client()', '    response = client.get("/")', '    assert response.status_code == 200'],
  'notes.md': ['# Class notes', '', '- Variables', '- Functions', '- Loops'],
};

const EditorTab = ({ name, active, onClick, onClose }) => (
  <div onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
      borderRight: '1px solid var(--ide-rule)', cursor: 'pointer',
      background: active ? 'var(--ide-bg)' : 'transparent',
      borderBottom: active ? '2px solid var(--c-ochre)' : '2px solid transparent',
      color: active ? 'var(--ink-strong)' : 'var(--ink-muted)',
      fontSize: 13, fontFamily: 'var(--font-mono)',
    }}>
    <I.FileText size={12} /> {name}
    <span onClick={(e) => { e.stopPropagation(); onClose && onClose(); }}
      style={{ color: 'var(--ink-subtle)', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</span>
  </div>
);

const Editor = ({ openFiles, activeFile, onActivate, onClose }) => {
  const lines = EDITOR_FILES[activeFile] || ['# (empty file)'];
  const isMd = activeFile?.endsWith('.md');
  const isTxt = activeFile?.endsWith('.txt');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--ide-bg)', border: '1px solid var(--ide-rule)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', background: 'var(--ide-elevated)',
        borderBottom: '1px solid var(--ide-rule)', overflow: 'hidden' }}>
        {openFiles.map((f) => (
          <EditorTab key={f} name={f} active={f === activeFile}
            onClick={() => onActivate(f)} onClose={() => onClose(f)} />
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 0',
        fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: '22px' }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '0 18px' }}>
            <span style={{ userSelect: 'none', color: 'var(--ink-faint)', fontSize: 12,
              lineHeight: '22px', width: 22, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ whiteSpace: 'pre',
              color: isMd ? 'var(--ink-default)' : isTxt ? 'var(--ink-muted)' : 'inherit' }}>
              {(isMd || isTxt) ? line || '\u00a0' :
                (line === '' ? '\u00a0' : tokenizePython(line).map((tok, j) => (
                  <span key={j} style={{ color: PY_COLORS[tok.t] }}>{tok.v}</span>
                )))}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 14px',
        background: 'var(--ide-elevated)', borderTop: '1px solid var(--ide-rule)',
        fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)',
        flexShrink: 0, lineHeight: 1.4, whiteSpace: 'nowrap' }}>
        <span>{lines.length} lines</span><span>UTF-8</span><span>LF</span>
        <span style={{ marginLeft: 'auto' }}>
          {activeFile?.endsWith('.py') ? 'Python' : activeFile?.endsWith('.md') ? 'Markdown' : 'Plaintext'}
        </span>
      </div>
    </div>
  );
};

window.Editor = Editor;
window.EDITOR_FILES = EDITOR_FILES;
