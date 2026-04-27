const FILE_TREE = [
  { kind: 'folder', name: 'first-website', children: [
    { kind: 'file', name: 'app.py' },
    { kind: 'file', name: 'README.md' },
    { kind: 'file', name: 'requirements.txt' },
    { kind: 'folder', name: 'tests', children: [{ kind: 'file', name: 'test_app.py' }]},
  ]},
  { kind: 'file', name: 'notes.md' },
];

const FileRow = ({ item, depth, selected, onSelect, expanded, onToggle }) => {
  const isFolder = item.kind === 'folder';
  const isExpanded = expanded.has(item.name);
  return (
    <>
      <div onClick={() => isFolder ? onToggle(item.name) : onSelect(item.name)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
          paddingLeft: 8 + depth * 16, fontSize: 13.5, fontFamily: 'var(--font-sans)',
          cursor: 'pointer', borderRadius: 'var(--r-sm)',
          background: selected === item.name ? 'var(--paper-deeper)' : 'transparent',
          color: 'var(--ink-strong)', fontWeight: selected === item.name ? 600 : 400,
        }}
        onMouseEnter={(e) => selected !== item.name && (e.currentTarget.style.background = 'var(--paper-tinted)')}
        onMouseLeave={(e) => selected !== item.name && (e.currentTarget.style.background = 'transparent')}>
        {isFolder ? (
          <>
            <span style={{ width: 12, color: 'var(--ink-muted)', display: 'inline-flex' }}>
              {isExpanded ? <I.ChevronDown size={12} /> : <I.ChevronRight size={12} />}
            </span>
            <span style={{ color: 'var(--c-ochre)', display: 'inline-flex' }}><I.Folder size={14} /></span>
          </>
        ) : (
          <>
            <span style={{ width: 12 }} />
            <span style={{ color: 'var(--ink-muted)', display: 'inline-flex' }}><I.FileText size={13} /></span>
          </>
        )}
        <span>{item.name}</span>
      </div>
      {isFolder && isExpanded && item.children?.map((c) => (
        <FileRow key={c.name} item={c} depth={depth + 1} selected={selected}
          onSelect={onSelect} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  );
};

const Explorer = ({ selected, onSelect }) => {
  const [expanded, setExpanded] = React.useState(new Set(['first-website']));
  const toggle = (n) => setExpanded(prev => {
    const next = new Set(prev); next.has(n) ? next.delete(n) : next.add(n); return next;
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--ide-bg)', border: '1px solid var(--ide-rule)',
      borderRadius: 'var(--r-lg)', padding: 6, gap: 6 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 6,
        background: 'var(--ide-elevated)', borderRadius: 'var(--r-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px' }}>
          <I.Folder size={15} style={{ color: 'var(--c-ochre)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-strong)' }}>Files</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button style={{ background: '#fff', color: 'var(--ink-default)',
            border: '1px solid var(--ide-rule)', padding: '6px 8px', borderRadius: 'var(--r-sm)',
            fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <I.Upload size={12} /> Upload
          </button>
          <button style={{ background: '#fff', color: 'var(--ink-default)',
            border: '1px solid var(--ide-rule)', padding: '6px 8px', borderRadius: 'var(--r-sm)',
            fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <I.Plus size={12} /> New
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 2 }}>
        {FILE_TREE.map((item) => (
          <FileRow key={item.name} item={item} depth={0} selected={selected}
            onSelect={onSelect} expanded={expanded} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
};

window.Explorer = Explorer;
