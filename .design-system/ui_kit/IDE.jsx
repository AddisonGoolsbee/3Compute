const IDE = () => {
  const [openFiles, setOpenFiles] = React.useState(['app.py', 'README.md']);
  const [activeFile, setActiveFile] = React.useState('app.py');
  const handleSelect = (name) => {
    if (!openFiles.includes(name)) setOpenFiles([...openFiles, name]);
    setActiveFile(name);
  };
  const handleClose = (name) => {
    const idx = openFiles.indexOf(name);
    const next = openFiles.filter(f => f !== name);
    setOpenFiles(next);
    if (activeFile === name && next.length) setActiveFile(next[Math.max(0, idx - 1)] || next[0]);
  };
  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column',
      padding: 8, gap: 8, background: 'var(--paper-tinted)' }}>
      <div style={{ flex: '1 1 62%', display: 'grid', gridTemplateColumns: '270px 1fr', gap: 8,
        minHeight: 0 }}>
        <Explorer selected={activeFile} onSelect={handleSelect} />
        <Editor openFiles={openFiles} activeFile={activeFile}
          onActivate={setActiveFile} onClose={handleClose} />
      </div>
      <div style={{ flex: '1 1 38%', minHeight: 0 }}>
        <TerminalPane />
      </div>
    </div>
  );
};

window.IDE = IDE;
