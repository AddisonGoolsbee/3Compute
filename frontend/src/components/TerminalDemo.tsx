import { useEffect, useRef, useState } from 'react';
import { Play, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Demo programs (canonical 3Compute set — keep these as-is)
// ---------------------------------------------------------------------------

interface DemoProgram {
  label: string;
  filename: string;
  code: string[];
  runCommand: string;
  output: string[];
}

const DEMO_PROGRAMS: DemoProgram[] = [
  {
    label: 'Simple web API',
    filename: 'api.py',
    code: [
      'from flask import Flask, jsonify',
      '',
      'app = Flask(__name__)',
      '',
      'todos = [',
      '    {"id": 1, "task": "Learn Python"},',
      '    {"id": 2, "task": "Build something cool"},',
      ']',
      '',
      '@app.route("/todos")',
      'def get_todos():',
      '    return jsonify(todos)',
      '',
      'app.run(host="0.0.0.0", port=3000)',
    ],
    runCommand: '$ python api.py',
    output: [
      ' * Running on http://0.0.0.0:3000',
      ' * Your app is live at:',
      '   https://jdoe.app.3compute.org/todos',
    ],
  },
  {
    label: 'Number guessing game',
    filename: 'guess.py',
    code: [
      'import random',
      '',
      'def play():',
      '    secret = random.randint(1, 100)',
      '    attempts = 0',
      '    print("Guess a number between 1 and 100!")',
      '    while True:',
      '        guess = int(input("> "))',
      '        attempts += 1',
      '        if guess < secret:',
      '            print("Too low!")',
      '        elif guess > secret:',
      '            print("Too high!")',
      '        else:',
      '            print(f"Correct in {attempts} tries!")',
      '            break',
      '',
      'play()',
    ],
    runCommand: '$ python guess.py',
    output: [
      'Guess a number between 1 and 100!',
      '> 50',
      'Too low!',
      '> 75',
      'Too high!',
      '> 63',
      'Correct in 3 tries!',
    ],
  },
  {
    label: 'Bubble sort',
    filename: 'sort.py',
    code: [
      'def bubble_sort(arr):',
      '    n = len(arr)',
      '    for i in range(n):',
      '        for j in range(n - i - 1):',
      '            if arr[j] > arr[j + 1]:',
      '                arr[j], arr[j + 1] = arr[j + 1], arr[j]',
      '    return arr',
      '',
      'data = [64, 34, 25, 12, 22, 11, 90]',
      'print("Before:", data)',
      'print("After: ", bubble_sort(data))',
    ],
    runCommand: '$ python sort.py',
    output: [
      'Before: [64, 34, 25, 12, 22, 11, 90]',
      'After:  [11, 12, 22, 25, 34, 64, 90]',
    ],
  },
];

// ---------------------------------------------------------------------------
// Python tokenizer (Daylight palette)
// ---------------------------------------------------------------------------

type TokenType = 'keyword' | 'string' | 'number' | 'comment' | 'decorator' | 'ident' | 'other';

const PY_KEYWORDS = new Set([
  'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'import', 'from',
  'as', 'class', 'True', 'False', 'None', 'and', 'or', 'not', 'is', 'with',
  'try', 'except', 'finally', 'raise', 'pass', 'break', 'continue', 'lambda',
  'yield', 'global', 'nonlocal', 'print', 'int', 'str', 'float', 'list',
  'dict', 'tuple', 'range', 'input', 'len',
]);

const TOKEN_VAR: Record<TokenType, string> = {
  keyword: 'var(--code-keyword)',
  string: 'var(--code-string)',
  number: 'var(--code-number)',
  comment: 'var(--code-comment)',
  decorator: 'var(--code-decorator)',
  ident: 'var(--code-ident)',
  other: 'var(--code-other)',
};

function tokenizePython(line: string): { t: TokenType; v: string }[] {
  const out: { t: TokenType; v: string }[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];

    // Comment to end-of-line
    if (c === '#') {
      out.push({ t: 'comment', v: line.slice(i) });
      break;
    }

    // f-string prefix (f"..." or f'...')
    if ((c === 'f' || c === 'F') && (line[i + 1] === '"' || line[i + 1] === '\'')) {
      const quote = line[i + 1];
      let j = i + 2;
      while (j < line.length && line[j] !== quote) j++;
      out.push({ t: 'string', v: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // String literal
    if (c === '"' || c === '\'') {
      const quote = c;
      let j = i + 1;
      while (j < line.length && line[j] !== quote) j++;
      out.push({ t: 'string', v: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Number
    if (/\d/.test(c)) {
      let j = i;
      while (j < line.length && /[\d.]/.test(line[j])) j++;
      out.push({ t: 'number', v: line.slice(i, j) });
      i = j;
      continue;
    }

    // Decorator
    if (c === '@') {
      let j = i + 1;
      while (j < line.length && /[\w.]/.test(line[j])) j++;
      out.push({ t: 'decorator', v: line.slice(i, j) });
      i = j;
      continue;
    }

    // Identifier or keyword
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < line.length && /\w/.test(line[j])) j++;
      const word = line.slice(i, j);
      out.push({ t: PY_KEYWORDS.has(word) ? 'keyword' : 'ident', v: word });
      i = j;
      continue;
    }

    // Operators / punctuation / whitespace
    let j = i;
    while (j < line.length && !/[\w@'"#\d\s]/.test(line[j])) j++;
    out.push({ t: 'other', v: line.slice(i, Math.max(j, i + 1)) });
    i = Math.max(j, i + 1);
  }
  return out;
}

function PyLine({ line, lineNo }: { line: string; lineNo: number }) {
  return (
    <div className="flex gap-3 items-baseline">
      <span
        className="select-none text-right shrink-0 tabular-nums"
        style={{ color: 'var(--ink-faint)', width: 22, fontSize: 12 }}
      >
        {lineNo}
      </span>
      <span className="whitespace-pre">
        {line === '' ? ' ' : tokenizePython(line).map((tok, j) => (
          <span key={j} style={{ color: TOKEN_VAR[tok.t] }}>{tok.v}</span>
        ))}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TerminalDemo component
// ---------------------------------------------------------------------------

type Phase = 'typing-code' | 'ready' | 'typing-run' | 'typing-output' | 'done';

export default function TerminalDemo() {
  const [programIndex, setProgramIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing-code');
  const [visibleCodeLines, setVisibleCodeLines] = useState(0);
  const [runChars, setRunChars] = useState(0);
  const [visibleOutLines, setVisibleOutLines] = useState(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const program = DEMO_PROGRAMS[programIndex];

  function clearAll() {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }

  function sched(fn: () => void, d: number) {
    const id = setTimeout(fn, d);
    timeouts.current.push(id);
  }

  useEffect(() => {
    clearAll();
    const prog = DEMO_PROGRAMS[programIndex];
    setVisibleCodeLines(0);
    setRunChars(0);
    setVisibleOutLines(0);
    setPhase('typing-code');
    prog.code.forEach((_, i) => sched(() => {
      setVisibleCodeLines(i + 1);
      if (i === prog.code.length - 1) setPhase('ready');
    }, 80 * (i + 1)));
    return clearAll;
  }, [programIndex]);

  function handleRun() {
    if (phase !== 'ready') return;
    setPhase('typing-run');
    setRunChars(0);
    const cmd = program.runCommand;
    cmd.split('').forEach((_, i) => sched(() => setRunChars(i + 1), 35 * (i + 1)));
    sched(() => {
      setPhase('typing-output');
      program.output.forEach((_, i) => sched(() => {
        setVisibleOutLines(i + 1);
        if (i === program.output.length - 1) setPhase('done');
      }, 180 * (i + 1)));
    }, 35 * cmd.length + 150);
  }

  function handleNext() {
    setProgramIndex((i) => (i + 1) % DEMO_PROGRAMS.length);
  }

  return (
    <div className="border border-rule rounded-xl shadow-lg w-full max-w-[500px] bg-paper-elevated overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-paper-tinted border-b border-rule px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-[11px] h-[11px] rounded-full bg-tomato" />
          <span className="w-[11px] h-[11px] rounded-full bg-ochre" />
          <span className="w-[11px] h-[11px] rounded-full bg-forest" />
        </div>
        <span className="text-xs font-mono text-ink-muted">{program.filename}</span>
        <div className="flex items-center gap-1">
          {DEMO_PROGRAMS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setProgramIndex(i)}
              aria-label={`Switch to ${p.label} demo`}
              className={
                'text-[11px] font-semibold px-2 py-0.5 rounded-sm cursor-pointer transition-colors ' +
                (i === programIndex
                  ? 'bg-ochre-soft text-ochre'
                  : 'bg-transparent text-ink-muted hover:text-ink-default')
              }
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Code pane */}
      <div
        className="bg-ide-bg px-5 pt-4 pb-3 font-mono text-[13px] overflow-x-auto"
        style={{ lineHeight: '24px' }}
      >
        {program.code.map((line, i) => (
          <div
            key={i}
            className="transition-opacity duration-75"
            style={{ opacity: i < visibleCodeLines ? 1 : 0 }}
          >
            <PyLine line={line} lineNo={i + 1} />
          </div>
        ))}
      </div>

      {/* Output pane */}
      <div
        className="bg-paper-tinted border-t border-rule px-5 py-3.5 font-mono text-[13px] text-ink-default"
        style={{ minHeight: 100 }}
      >
        {(phase === 'typing-code' || phase === 'ready') && (
          <div>
            <span style={{ color: 'var(--c-ochre)' }}>$</span>
            {' '}
            <span
              className="inline-block align-middle animate-pulse"
              style={{ width: 8, height: 14, background: 'var(--ink-muted)' }}
            />
          </div>
        )}
        {runChars > 0 && (
          <div>
            <span style={{ color: 'var(--c-ochre)' }}>$</span>
            {' '}
            <span style={{ color: 'var(--ink-strong)' }}>
              {program.runCommand.slice(2, runChars)}
            </span>
            {phase === 'typing-run' && (
              <span
                className="inline-block align-middle animate-pulse ml-0.5"
                style={{ width: 8, height: 14, background: 'var(--ink-muted)' }}
              />
            )}
          </div>
        )}
        {program.output.slice(0, visibleOutLines).map((line, i) => (
          <div key={i} style={{ color: 'var(--c-forest)' }}>{line}</div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-paper-tinted border-t border-rule px-4 py-2.5 flex items-center justify-between gap-4">
        <span className="text-[12.5px] text-ink-muted truncate whitespace-nowrap overflow-hidden">
          {program.label}
        </span>
        {phase === 'done' ? (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Show the next example"
            className="inline-flex items-center gap-1.5 font-semibold text-xs px-3.5 py-1.5 rounded-sm transition-colors bg-navy text-white cursor-pointer hover:brightness-105"
          >
            Next example
            <ChevronRight size={12} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRun}
            disabled={phase !== 'ready'}
            aria-label="Run the code"
            className={
              'inline-flex items-center gap-1.5 font-semibold text-xs px-3.5 py-1.5 rounded-sm transition-colors ' +
              (phase === 'ready'
                ? 'bg-forest text-white cursor-pointer hover:brightness-105'
                : 'bg-paper-deeper text-ink-subtle cursor-not-allowed')
            }
          >
            <Play size={11} />
            Run
          </button>
        )}
      </div>
    </div>
  );
}
