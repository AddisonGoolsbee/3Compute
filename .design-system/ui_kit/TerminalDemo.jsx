// Animated terminal demo — light paper variant
const DEMO_PROGRAMS = [
  {
    label: 'Hello, world',
    filename: 'hello.py',
    code: ['# Your first Python program', 'name = "Alex"', 'print(f"Hello, {name}!")', 'print("Welcome to CS Room.")'],
    runCommand: '$ python hello.py',
    output: ['Hello, Alex!', 'Welcome to CS Room.'],
  },
  {
    label: 'A simple calculator',
    filename: 'calc.py',
    code: ['def add(a, b):', '    return a + b', '', 'def multiply(a, b):', '    return a * b', '', 'print("3 + 4 =", add(3, 4))', 'print("5 x 6 =", multiply(5, 6))'],
    runCommand: '$ python calc.py',
    output: ['3 + 4 = 7', '5 x 6 = 30'],
  },
  {
    label: 'Number guessing game',
    filename: 'guess.py',
    code: ['import random', '', 'secret = random.randint(1, 100)', 'print("Guess 1-100.")', '', 'while True:', '    guess = int(input("> "))', '    if guess == secret:', '        print("Got it!")', '        break'],
    runCommand: '$ python guess.py',
    output: ['Guess 1-100.', '> 50', '> 75', '> 63', 'Got it!'],
  },
];

const TerminalDemo = () => {
  const [programIndex, setProgramIndex] = React.useState(0);
  const [phase, setPhase] = React.useState('typing-code');
  const [visibleCodeLines, setVisibleCodeLines] = React.useState(0);
  const [runChars, setRunChars] = React.useState(0);
  const [visibleOutLines, setVisibleOutLines] = React.useState(0);
  const timeouts = React.useRef([]);
  const program = DEMO_PROGRAMS[programIndex];

  const clearAll = () => { timeouts.current.forEach(clearTimeout); timeouts.current = []; };
  const sched = (fn, d) => { const id = setTimeout(fn, d); timeouts.current.push(id); };

  React.useEffect(() => {
    clearAll();
    const prog = DEMO_PROGRAMS[programIndex];
    setVisibleCodeLines(0); setRunChars(0); setVisibleOutLines(0); setPhase('typing-code');
    prog.code.forEach((_, i) => sched(() => {
      setVisibleCodeLines(i + 1);
      if (i === prog.code.length - 1) setPhase('ready');
    }, 80 * (i + 1)));
    return clearAll;
  }, [programIndex]);

  const handleRun = () => {
    if (phase !== 'ready') return;
    setPhase('typing-run'); setRunChars(0);
    const cmd = program.runCommand;
    cmd.split('').forEach((_, i) => sched(() => setRunChars(i + 1), 35 * (i + 1)));
    sched(() => {
      setPhase('typing-output');
      program.output.forEach((_, i) => sched(() => {
        setVisibleOutLines(i + 1);
        if (i === program.output.length - 1) setPhase('done');
      }, 180 * (i + 1)));
    }, 35 * cmd.length + 150);
  };

  return (
    <div style={{ borderRadius: 'var(--r-xl)', overflow: 'hidden',
      border: '1px solid var(--rule)', boxShadow: 'var(--shadow-lg)',
      width: '100%', maxWidth: 500, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--paper-tinted)', borderBottom: '1px solid var(--rule)', padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 6, background: '#e85d3f' }} />
          <span style={{ width: 11, height: 11, borderRadius: 6, background: '#e09733' }} />
          <span style={{ width: 11, height: 11, borderRadius: 6, background: '#2d6a4f' }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{program.filename}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {DEMO_PROGRAMS.map((p, i) => (
            <button key={i} onClick={() => setProgramIndex(i)}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 'var(--r-sm)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: i === programIndex ? 'var(--c-ochre-soft)' : 'transparent',
                color: i === programIndex ? 'var(--c-ochre)' : 'var(--ink-muted)', fontWeight: 600,
              }}>{i + 1}</button>
          ))}
        </div>
      </div>
      <div style={{ background: '#fff', padding: '16px 20px 12px',
        fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: '24px', minHeight: 220 }}>
        {program.code.map((line, i) => (
          <div key={i} style={{ opacity: i < visibleCodeLines ? 1 : 0, transition: 'opacity 0.075s' }}>
            <PyLine line={line} lineNo={i + 1} />
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--ide-bg)', borderTop: '1px solid var(--rule)',
        padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: 13, minHeight: 100, color: 'var(--ink-default)' }}>
        {(phase === 'typing-code' || phase === 'ready') && (
          <div style={{ color: 'var(--c-ochre)', display: 'flex', alignItems: 'center', gap: 4 }}>
            $<span className="cursor-blink" style={{ width: 8, height: 14, background: 'var(--ink-muted)' }} />
          </div>
        )}
        {runChars > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: 'var(--c-ochre)' }}>{program.runCommand.split(' ')[0]} </span>
            <span style={{ color: 'var(--ink-strong)' }}>{program.runCommand.slice(2, runChars)}</span>
            {phase === 'typing-run' && <span className="cursor-blink" style={{ width: 8, height: 14, background: 'var(--ink-muted)', marginLeft: 2 }} />}
          </div>
        )}
        {program.output.slice(0, visibleOutLines).map((line, i) => (
          <div key={i} style={{ color: 'var(--c-forest)' }}>{line}</div>
        ))}
      </div>
      <div style={{ background: 'var(--paper-tinted)', borderTop: '1px solid var(--rule)',
        padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-muted)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>{program.label}</span>
        <button onClick={handleRun} disabled={phase !== 'ready'}
          style={{
            background: phase === 'ready' ? 'var(--c-forest)' : 'var(--paper-deeper)',
            color: phase === 'ready' ? '#fff' : 'var(--ink-subtle)',
            fontWeight: 600, padding: '6px 14px', borderRadius: 'var(--r-sm)',
            border: 'none', fontSize: 12, fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            cursor: phase === 'ready' ? 'pointer' : 'not-allowed',
          }}>
          <I.Play size={11} /> Run
        </button>
      </div>
    </div>
  );
};

window.TerminalDemo = TerminalDemo;
