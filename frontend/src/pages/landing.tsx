import { useContext, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router';
import { LogoBirdflop } from '@luminescent/ui-react';
import {
  Terminal,
  Users,
  LayoutTemplate,
  ArrowRight,
  Code,
  BookOpen,
  Share2,
  UserPlus,
  Laptop,
  Send,
  GraduationCap,
  Play,
  Globe,
  Zap,
  Server,
  Heart,
  ChevronRight,
  FlaskConical,
  FileText,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';

// ---------------------------------------------------------------------------
// Terminal demo data
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
    label: 'Simple Web API',
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
    label: 'Number Guessing Game',
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
    label: 'Bubble Sort',
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

// Syntax highlight a single line of Python source
function highlightLine(line: string): React.ReactNode {
  if (line === '') return <br />;

  // Very simple token-level coloriser (no regex backtracking issues)
  const keywords = new Set([
    'import', 'from', 'def', 'return', 'while', 'for', 'if', 'elif',
    'else', 'in', 'range', 'True', 'False', 'None', 'break', 'int',
  ]);

  // Tokenise: strings, comments, identifiers, numbers, operators, whitespace
  const tokens: { type: string; value: string }[] = [];
  let i = 0;
  while (i < line.length) {
    // String literals
    if (line[i] === '"' || line[i] === '\'') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) j++;
      tokens.push({ type: 'string', value: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // f-string prefix
    if ((line[i] === 'f' || line[i] === 'F') && (line[i + 1] === '"' || line[i + 1] === '\'')) {
      const quote = line[i + 1];
      let j = i + 2;
      while (j < line.length && line[j] !== quote) j++;
      tokens.push({ type: 'string', value: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // Comment
    if (line[i] === '#') {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }
    // Number
    if (/\d/.test(line[i])) {
      let j = i;
      while (j < line.length && /[\d.]/.test(line[j])) j++;
      tokens.push({ type: 'number', value: line.slice(i, j) });
      i = j;
      continue;
    }
    // Identifier or keyword
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i;
      while (j < line.length && /\w/.test(line[j])) j++;
      const word = line.slice(i, j);
      tokens.push({ type: keywords.has(word) ? 'keyword' : 'ident', value: word });
      i = j;
      continue;
    }
    // Decorator
    if (line[i] === '@') {
      let j = i + 1;
      while (j < line.length && /\w/.test(line[j])) j++;
      tokens.push({ type: 'decorator', value: line.slice(i, j) });
      i = j;
      continue;
    }
    // Everything else (operators, punctuation, spaces)
    tokens.push({ type: 'other', value: line[i] });
    i++;
  }

  const colorMap: Record<string, string> = {
    keyword: '#c792ea',
    string: '#c3e88d',
    number: '#f78c6c',
    comment: '#546e7a',
    decorator: '#82aaff',
    ident: '#e0e0e0',
    other: '#89ddff',
  };

  return (
    <>
      {tokens.map((tok, idx) => (
        <span key={idx} style={{ color: colorMap[tok.type] }}>
          {tok.value}
        </span>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// TerminalDemo component
// ---------------------------------------------------------------------------

type Phase = 'typing-code' | 'ready' | 'typing-run' | 'typing-output' | 'done';

function TerminalDemo() {
  const [programIndex, setProgramIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing-code');
  const [visibleCodeLines, setVisibleCodeLines] = useState(0);
  const [runCommandChars, setRunCommandChars] = useState(0);
  const [visibleOutputLines, setVisibleOutputLines] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const program = DEMO_PROGRAMS[programIndex];

  function clearAllTimeouts() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }

  function schedule(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
  }

  function startSequence(idx: number) {
    clearAllTimeouts();
    const prog = DEMO_PROGRAMS[idx];
    setVisibleCodeLines(0);
    setRunCommandChars(0);
    setVisibleOutputLines(0);
    setPhase('typing-code');

    const LINE_DELAY = 80;
    prog.code.forEach((_, lineIdx) => {
      schedule(() => {
        setVisibleCodeLines(lineIdx + 1);
        if (lineIdx === prog.code.length - 1) setPhase('ready');
      }, LINE_DELAY * (lineIdx + 1));
    });
  }

  // Start on mount and when programIndex changes
  useEffect(() => {
    startSequence(programIndex);
    return clearAllTimeouts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programIndex]);

  function handleRun() {
    if (phase !== 'ready') return;
    setPhase('typing-run');
    setRunCommandChars(0);

    const cmd = program.runCommand;
    const CHAR_DELAY = 35;
    cmd.split('').forEach((_, charIdx) => {
      schedule(() => setRunCommandChars(charIdx + 1), CHAR_DELAY * (charIdx + 1));
    });

    const cmdDuration = CHAR_DELAY * cmd.length + 150;
    schedule(() => {
      setPhase('typing-output');
      const OUT_DELAY = 180;
      program.output.forEach((_, i) => {
        schedule(() => {
          setVisibleOutputLines(i + 1);
          if (i === program.output.length - 1) {
            setPhase('done');
          }
        }, OUT_DELAY * (i + 1));
      });
    }, cmdDuration);
  }

  function handleNext() {
    const next = (programIndex + 1) % DEMO_PROGRAMS.length;
    setProgramIndex(next);
  }

  return (
    <div
      className="rounded-xl overflow-hidden border border-gray-700 shadow-2xl shadow-black/60 w-full max-w-lg mx-auto lg:mx-0"
      aria-label="Interactive terminal demo showing a student's 3Compute coding session"
      role="region"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between bg-gray-900 border-b border-gray-700 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <span className="text-xs text-gray-400 font-mono">{program.filename}</span>
        <div className="flex items-center gap-2">
          {/* Program selector */}
          {DEMO_PROGRAMS.map((p, i) => (
            <button
              key={i}
              onClick={() => setProgramIndex(i)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                i === programIndex
                  ? 'bg-[#54daf4]/20 text-[#54daf4]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              aria-label={`Switch to ${p.label} demo`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Code pane */}
      <div className="bg-[#0d1117] px-5 pt-4 pb-3 font-mono text-sm leading-6 overflow-x-auto">
        {program.code.map((line, i) => (
          <div key={i} className={`flex gap-4 transition-opacity duration-75 ${i < visibleCodeLines ? 'opacity-100' : 'opacity-0'}`}>
            <span className="select-none text-gray-600 text-xs leading-6 w-4 text-right flex-shrink-0">
              {i + 1}
            </span>
            <span className="whitespace-pre">
              {line === '' ? <span>&nbsp;</span> : highlightLine(line)}
            </span>
          </div>
        ))}
      </div>

      {/* Terminal pane */}
      <div className="bg-[#0a0e13] border-t border-gray-800 px-5 py-3 font-mono text-sm min-h-[100px] overflow-x-auto">
        {/* Idle $ prompt */}
        {(phase === 'typing-code' || phase === 'ready') && (
          <div className="text-gray-500 flex items-center gap-1">
            $<span className="inline-block w-2 h-[14px] bg-gray-500 animate-pulse" />
          </div>
        )}
        {/* Run command typed char-by-char */}
        {runCommandChars > 0 && (
          <div className="text-gray-400 flex items-center">
            <span>{program.runCommand.slice(0, runCommandChars)}</span>
            {phase === 'typing-run' && (
              <span className="inline-block w-2 h-[14px] bg-gray-400 animate-pulse ml-0.5" />
            )}
          </div>
        )}
        {/* Output lines, cursor trails the last visible one */}
        {program.output.slice(0, visibleOutputLines).map((line, i) => (
          <div key={i} className="text-[#54daf4] flex items-center">
            <span>{line}</span>
            {phase === 'typing-output' && i === visibleOutputLines - 1 && (
              <span className="inline-block w-2 h-[14px] bg-[#54daf4] animate-pulse ml-0.5" />
            )}
          </div>
        ))}
        {/* New $ prompt after run completes */}
        {phase === 'done' && (
          <div className="text-gray-500 flex items-center gap-1 mt-1">
            $<span className="inline-block w-2 h-[14px] bg-gray-500 animate-pulse" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border-t border-gray-700 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs text-gray-500">{program.label}</span>
        <div className="flex items-center gap-2">
          {phase === 'done' && (
            <button
              onClick={handleNext}
              className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1 rounded border border-gray-700 hover:border-gray-500"
            >
              Next example
            </button>
          )}
          <button
            onClick={handleRun}
            disabled={phase !== 'ready'}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded transition-colors ${
              phase === 'ready'
                ? 'bg-[#2a9bb8] hover:bg-[#238da8] text-white cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
            aria-label="Run the code"
          >
            <Play size={12} />
            Run
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Classroom demo data & component
// ---------------------------------------------------------------------------

const DEMO_STUDENTS = [
  { name: 'Alice Chen', email: 'alice@school.edu', scores: { 'Data-Encoding': [7, 8], 'Tic-Tac-Toe': [3, 4], 'Weather-App': [2, 3] } },
  { name: 'Ben Torres', email: 'ben@school.edu', scores: { 'Data-Encoding': [6, 8], 'Tic-Tac-Toe': [4, 4], 'Weather-App': [3, 3] } },
  { name: 'Chloe Park', email: 'chloe@school.edu', scores: { 'Data-Encoding': [8, 8], 'Tic-Tac-Toe': [4, 4], 'Weather-App': [3, 3] } },
  { name: 'David Kim', email: 'david@school.edu', scores: { 'Data-Encoding': [5, 8], 'Tic-Tac-Toe': [2, 4], 'Weather-App': [1, 3] } },
  { name: 'Emma Davis', email: 'emma@school.edu', scores: { 'Data-Encoding': [7, 8], 'Tic-Tac-Toe': [4, 4], 'Weather-App': [2, 3] } },
];

const DEMO_TEMPLATES = ['Data-Encoding', 'Tic-Tac-Toe', 'Weather-App'];

const DEMO_TEST_OUTPUT = `Running tests for Data-Encoding...

test_hex_encode .......... PASSED
test_hex_decode .......... PASSED
test_base64_encode ....... PASSED
test_base64_decode ....... PASSED
test_caesar_encrypt ...... PASSED
test_caesar_decrypt ...... PASSED
test_binary_encode ....... FAILED
  Expected: '01001000 01101001'
  Got:      '1001000 1101001'
test_binary_decode ....... PASSED

7/8 tests passed`;

const DEMO_CODE = `def hex_encode(text):
    return ' '.join(format(ord(c), '02x') for c in text)

def hex_decode(hex_str):
    bytes_list = hex_str.strip().split()
    return ''.join(chr(int(b, 16)) for b in bytes_list)

def binary_encode(text):
    return ' '.join(format(ord(c), 'b') for c in text)
    #        should be '08b' ^  missing zero-pad!`;

function ClassroomDemo() {
  const [step, setStep] = useState(0);

  const steps = [
    { label: 'Students tab', desc: 'See every student and their test scores at a glance' },
    { label: 'Drill into student', desc: 'Expand a student to view their files and code' },
    { label: 'Run tests', desc: 'Run tests against a student\'s code and see detailed output' },
    { label: 'Gradebook', desc: 'Track all scores in a spreadsheet-style view with flexible grading' },
  ];

  return (
    <div className="rounded-2xl border border-[#54daf4]/20 bg-[#54daf4]/5 overflow-hidden">
      <div className="px-8 pt-8 pb-4 text-center">
        <h3 className="text-2xl font-bold mb-2">Track every student&rsquo;s progress</h3>
        <p className="text-gray-400 text-sm max-w-lg mx-auto">
          See scores, drill into code, run tests, and manage grades.
        </p>
      </div>

      {/* Step indicator pills */}
      <div className="flex items-center justify-center gap-2 mb-4 px-4">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              step === i
                ? 'bg-[#54daf4]/20 text-[#54daf4] font-medium'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Mock UI panels */}
      <div className="mx-4 mb-4 rounded-xl border border-gray-700 bg-[#0d1117] overflow-hidden" style={{ minHeight: 340 }}>
        {step === 0 && (
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="px-3 py-1.5 rounded-lg bg-gray-700 text-white text-sm">Data-Encoding</div>
              <div className="px-3 py-1.5 rounded-lg text-gray-400 text-sm">Tic-Tac-Toe</div>
              <div className="px-3 py-1.5 rounded-lg text-gray-400 text-sm">Weather-App</div>
            </div>
            {DEMO_STUDENTS.map((s) => {
              const [p, t] = s.scores['Data-Encoding'];
              return (
                <div key={s.email} className="flex items-center gap-4 px-3 py-2.5 hover:bg-gray-800/20 rounded-lg">
                  <ChevronRight size={14} className="text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-gray-600 ml-2">{s.email}</span>
                  </div>
                  <span className={`font-mono text-sm tabular-nums ${p === t ? 'text-green-400' : 'text-gray-500'}`}>
                    {p}/{t}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {(step === 1 || step === 2) && (
          <div className="p-4 overflow-y-auto" style={{ maxHeight: 340 }}>
            {/* Assignment selector */}
            <div className="flex items-center gap-1.5 mb-3">
              <div className="px-3 py-1.5 rounded-lg bg-gray-700 text-white text-sm">Data-Encoding</div>
              <div className="px-3 py-1.5 rounded-lg text-gray-400 text-sm">Tic-Tac-Toe</div>
              <div className="px-3 py-1.5 rounded-lg text-gray-400 text-sm">Weather-App</div>
            </div>
            {/* Alice expanded */}
            <button className="w-full flex items-center gap-4 px-3 py-2.5 bg-gray-800/20 rounded-t-lg text-left">
              <span className="text-gray-500" style={{ transform: 'rotate(90deg)' }}>
                <ChevronRight size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">Alice Chen</span>
                <span className="text-xs text-gray-600 ml-2">alice@school.edu</span>
              </div>
              <span className="font-mono text-sm tabular-nums text-gray-500">7/8</span>
            </button>
            <div className="ml-8 mr-3 mb-3 border border-gray-800 rounded-b-lg overflow-hidden bg-gray-900/50">
              <div className="flex" style={{ height: 220 }}>
                <div className="w-48 border-r border-gray-800 overflow-y-auto flex-shrink-0">
                  <div className={`px-3 py-1.5 text-sm truncate flex items-center gap-2 ${step === 2 ? 'bg-blue-900/30 text-blue-300' : 'text-blue-400'}`}>
                    <FlaskConical size={12} className="flex-shrink-0" /> <span className="truncate">View test output</span>
                  </div>
                  <div className="border-b border-gray-800/50" />
                  {['encoding.py', 'decode.py', 'test_encoding.py'].map((f, i) => (
                    <div key={f} className={`px-3 py-1.5 text-sm truncate flex items-center gap-2 ${step === 1 && i === 0 ? 'bg-gray-800 text-white' : 'text-gray-400'}`}>
                      <FileText size={12} className="flex-shrink-0 opacity-50" /> <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                  {step === 1 ? (
                    <>
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 flex-shrink-0">
                        <span className="text-xs text-gray-500 font-mono truncate">encoding.py</span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 shrink-0 ml-3">
                          <ExternalLink size={11} />
                          Open in IDE
                        </span>
                      </div>
                      <div className="flex-1 overflow-auto bg-[#0d1117] px-4 pt-3 pb-2 font-mono text-sm leading-6">
                        {DEMO_CODE.split('\n').map((line, i) => (
                          <div key={i} className="flex gap-4">
                            <span className="select-none text-gray-600 text-xs leading-6 w-4 text-right flex-shrink-0">{i + 1}</span>
                            <span className="whitespace-pre">{line === '' ? <span>&nbsp;</span> : highlightLine(line)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 flex-shrink-0">
                        <span className="text-xs text-gray-500">
                          Test output
                          <span className="ml-2 text-gray-400">7/8 passed</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 shrink-0 ml-3">
                          <RefreshCw size={11} /> Re-run
                        </span>
                      </div>
                      <div className="flex-1 p-3 overflow-auto">
                        <pre className="whitespace-pre-wrap text-gray-300 text-xs leading-relaxed font-mono">{DEMO_TEST_OUTPUT}</pre>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Remaining students collapsed */}
            {DEMO_STUDENTS.slice(1).map((s) => {
              const [p, t] = s.scores['Data-Encoding'];
              return (
                <div key={s.email} className="flex items-center gap-4 px-3 py-2.5 hover:bg-gray-800/20 rounded-lg">
                  <ChevronRight size={14} className="text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-gray-600 ml-2">{s.email}</span>
                  </div>
                  <span className={`font-mono text-sm tabular-nums ${p === t ? 'text-green-400' : 'text-gray-500'}`}>
                    {p}/{t}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {step === 3 && (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                <span className="px-3 py-1 text-xs bg-gray-700 text-white">Equal weights</span>
                <span className="px-3 py-1 text-xs text-gray-500">Custom weights</span>
                <span className="px-3 py-1 text-xs text-gray-500">Manual scores</span>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm" style={{ borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-gray-800/40">
                    <th style={{ padding: '8px 12px' }} className="text-left text-xs text-gray-500 font-medium">Student</th>
                    {DEMO_TEMPLATES.map((t) => (
                      <th key={t} style={{ padding: '8px 12px' }} className="text-xs text-gray-500 font-medium text-center">{t}</th>
                    ))}
                    <th style={{ padding: '8px 12px' }} className="text-xs text-gray-500 font-medium text-center">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_STUDENTS.map((s) => {
                    let totalW = 0, weightedS = 0;
                    for (const t of DEMO_TEMPLATES) {
                      const [p, tot] = s.scores[t as keyof typeof s.scores];
                      if (tot > 0) { totalW += 1; weightedS += p / tot; }
                    }
                    const avg = totalW > 0 ? Math.round((weightedS / totalW) * 100) : 0;
                    return (
                      <tr key={s.email} className="border-t border-gray-800/50">
                        <td style={{ padding: '8px 12px' }} className="text-sm">{s.name}</td>
                        {DEMO_TEMPLATES.map((t) => {
                          const [p, tot] = s.scores[t as keyof typeof s.scores];
                          return (
                            <td key={t} style={{ padding: '8px 12px' }} className="text-center">
                              <span className={`font-mono text-xs tabular-nums ${p === tot ? 'text-green-400' : 'text-gray-500'}`}>
                                {p}/{tot}
                              </span>
                            </td>
                          );
                        })}
                        <td style={{ padding: '8px 12px' }} className="text-center">
                          <span className="font-mono text-xs tabular-nums text-gray-400">{avg}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 pb-6">
        <p className="text-sm text-gray-400">{steps[step].desc}</p>
        <button
          onClick={() => setStep((s) => (s + 1) % steps.length)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500"
        >
          {steps[(step + 1) % steps.length].label}
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const userData = useContext(UserDataContext);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (userData?.userInfo) {
      setIsLoggedIn(true);
    } else {
      fetch(`${apiUrl}/auth/me`, { credentials: 'include' })
        .then((r) => setIsLoggedIn(r.ok))
        .catch(() => setIsLoggedIn(false));
    }
  }, [userData?.userInfo]);

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    // Remove the nav's bottom border so it blends flush into the hero gradient
    const style = document.createElement('style');
    style.id = 'landing-nav-border';
    style.textContent = 'nav > div { border-bottom: none !important; }';
    document.head.appendChild(style);
    return () => {
      document.documentElement.style.overflowY = 'hidden';
      document.getElementById('landing-nav-border')?.remove();
    };
  }, []);

  return (
    <div className="-mt-20 text-white">
      {/* Hero gradient — absolute so it stays at the top and scrolls away */}
      <div className="absolute inset-x-0 top-0 h-screen pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(84,218,244,0.12)_0%,_rgba(84,94,182,0.06)_40%,_transparent_70%)]" />
      {/* Dot grid — covers hero area */}
      <div
        className="absolute inset-x-0 top-0 h-screen pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(84, 218, 244, 0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Hero */}
      <section className="relative min-h-screen flex items-center">

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-28 lg:py-32">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: headline + CTAs */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tight mb-5 leading-tight">
                The coding classroom{' '}
                <span className="text-[#54daf4]">that stays with students</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-300 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Free coding environment for teachers and students. Create or import lessons,
                run Python in the browser, and let students build projects they keep.
              </p>

              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                {isLoggedIn ? (
                  <Link
                    to="/ide"
                    className="lum-btn lum-pad-md text-base rounded-lg bg-[#2a9bb8] hover:bg-[#238da8] text-white font-semibold inline-flex items-center gap-2 transition-colors shadow-lg shadow-[#2a9bb8]/20"
                  >
                    Go to Dashboard
                    <ArrowRight size={18} />
                  </Link>
                ) : (
                  <a
                    href={`${apiUrl}/auth/login`}
                    className="lum-btn lum-pad-md text-base rounded-lg bg-[#2a9bb8] hover:bg-[#238da8] text-white font-semibold inline-flex items-center gap-2 transition-colors shadow-lg shadow-[#2a9bb8]/20"
                  >
                    Sign in with Google
                    <ArrowRight size={18} />
                  </a>
                )}
                <a
                  href="#how-it-works"
                  className="lum-btn lum-pad-md text-base rounded-lg border border-gray-600 hover:border-gray-400 font-semibold inline-flex items-center gap-2 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById('how-it-works')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  How it works
                </a>
                <Link
                  to="/lessons"
                  className="lum-btn lum-pad-md text-base rounded-lg border border-gray-600 hover:border-gray-400 font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  Browse Lessons
                  <LayoutTemplate size={16} />
                </Link>
              </div>
            </div>

            {/* Right: terminal demo */}
            <div className="flex-1 w-full lg:max-w-[480px]">
              <TerminalDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-5">Built to spark curiosity</h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-6">
            3Compute is a project by Birdflop, a 501(c)(3) nonprofit dedicated to
            igniting and nurturing a passion for technology and computer science.
            We believe accessible tools are the best catalyst for that curiosity.
            Everything on 3Compute is free: no strings attached.
          </p>
          <a
            href="https://www.paypal.com/US/fundraiser/charity/5036975"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#54daf4]/40 hover:border-[#54daf4] text-[#54daf4] hover:bg-[#54daf4]/10 transition-colors text-sm font-semibold"
          >
            <Heart size={15} />
            Donate Today
          </a>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#54daf4]/10 flex items-center justify-center">
                  <BookOpen size={20} className="text-[#54daf4]" />
                </div>
                <h3 className="text-xl font-semibold">For Teachers</h3>
              </div>
              <div className="space-y-5">
                <Step number={1} icon={<Code size={18} />} text="Create a classroom and import or write a lesson" />
                <Step number={2} icon={<Share2 size={18} />} text="Share the access code with students" />
                <Step number={3} icon={<Users size={18} />} text="Watch progress update as students work" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#54daf4]/10 flex items-center justify-center">
                  <UserPlus size={20} className="text-[#54daf4]" />
                </div>
                <h3 className="text-xl font-semibold">For Students</h3>
              </div>
              <div className="space-y-5">
                <Step number={1} icon={<UserPlus size={18} />} text="Join with the code your teacher gave you" />
                <Step number={2} icon={<Laptop size={18} />} text="Open your personal browser coding environment" />
                <Step number={3} icon={<Send size={18} />} text="Write, run, and keep your projects forever" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What you get</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Terminal size={28} />}
              title="Full IDE in your browser"
              description="A full coding environment with no installation. Open a browser and start writing code."
            />
            <FeatureCard
              icon={<Users size={28} />}
              title="Classroom management"
              description="Create a classroom, share an access code, and students join with one click. See everyone's work in one place."
            />
            <FeatureCard
              icon={<LayoutTemplate size={28} />}
              title="Import, modify, or create lessons"
              description="Import pre-built lessons, modify them to fit your class, or build your own from scratch."
            />
          </div>
        </div>
      </section>

      {/* Classroom demo */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <ClassroomDemo />
        </div>
      </section>

      {/* Student ownership */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="px-10 py-12 lg:px-16 lg:py-14">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Students own their projects</h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Class ends, but the code keeps running. Every student project stays online for free, long after the lesson is over.
              </p>
            </div>

            {/* Deploy flow diagram */}
            <div className="flex flex-col items-center">
              {/* Source node */}
              <div className="flex items-center gap-3 bg-gray-800/80 border border-gray-600 rounded-xl px-6 py-4 shadow-lg">
                <Terminal size={20} className="text-[#54daf4]" />
                <div>
                  <div className="text-sm font-semibold">Your Python code</div>
                  <div className="text-xs text-gray-500 font-mono">app.py · api.py · script.py</div>
                </div>
              </div>

              {/* Arrow down to deploy */}
              <div className="flex flex-col items-center py-1">
                <div className="w-px h-4 bg-[#54daf4]/40" />
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M6 8L0 0H12L6 8Z" fill="rgba(84,218,244,0.4)" />
                </svg>
              </div>

              {/* Deploy node */}
              <div className="flex items-center gap-3 bg-[#54daf4]/10 border border-[#54daf4]/40 rounded-xl px-6 py-4 shadow-lg shadow-[#54daf4]/10">
                <Server size={20} className="text-[#54daf4]" />
                <div>
                  <div className="text-sm font-semibold text-[#54daf4]">Deploy to 3Compute</div>
                  <div className="text-xs text-gray-400">one command · stays running · free</div>
                </div>
              </div>

              {/* Branching SVG */}
              <div className="w-full max-w-2xl mt-1">
                <svg viewBox="0 0 600 60" className="w-full overflow-visible" style={{ height: 60 }}>
                  <defs>
                    <marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                      <path d="M0,0 L0,8 L8,4 z" fill="rgba(84,218,244,0.5)" />
                    </marker>
                  </defs>
                  <line x1="300" y1="0" x2="300" y2="20" stroke="rgba(84,218,244,0.4)" strokeWidth="1.5" strokeDasharray="4 3">
                    <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite" />
                  </line>
                  <path d="M300,20 Q300,40 110,55" stroke="rgba(84,218,244,0.4)" strokeWidth="1.5" fill="none" strokeDasharray="4 3" markerEnd="url(#arr)">
                    <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite" />
                  </path>
                  <line x1="300" y1="20" x2="300" y2="55" stroke="rgba(84,218,244,0.4)" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arr)">
                    <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite" />
                  </line>
                  <path d="M300,20 Q300,40 490,55" stroke="rgba(84,218,244,0.4)" strokeWidth="1.5" fill="none" strokeDasharray="4 3" markerEnd="url(#arr)">
                    <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite" />
                  </path>
                </svg>

                <div className="grid grid-cols-3 gap-4 -mt-1">
                  <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-4 text-center">
                    <div className="w-10 h-10 rounded-lg bg-[#54daf4]/15 flex items-center justify-center text-[#54daf4] mx-auto mb-3">
                      <Globe size={22} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">Host websites</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Serve a website at a public URL. Flask, FastAPI, or anything else.</p>
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-4 text-center">
                    <div className="w-10 h-10 rounded-lg bg-[#54daf4]/15 flex items-center justify-center text-[#54daf4] mx-auto mb-3">
                      <Zap size={22} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">Build REST APIs</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Expose endpoints other apps can call, hosted on free infrastructure.</p>
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-gray-900/70 p-4 text-center">
                    <div className="w-10 h-10 rounded-lg bg-[#54daf4]/15 flex items-center justify-center text-[#54daf4] mx-auto mb-3">
                      <Code size={22} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">Any Python app</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Scripts, scrapers, games, automation. If it runs on Linux, it runs here.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-xl mx-auto text-center">
          <GraduationCap size={32} className="mx-auto mb-4 text-[#54daf4]" />
          <h2 className="text-2xl font-bold mb-3">Free for everyone</h2>
          <p className="text-gray-400 mb-6">
            3Compute is free for schools, clubs, and individual learners. No credit card, no trial period.
          </p>
          {isLoggedIn ? (
            <Link
              to="/ide"
              className="lum-btn lum-pad-md text-lg rounded-lg bg-[#2a9bb8] hover:bg-[#238da8] text-white font-semibold inline-flex items-center gap-2 transition-colors shadow-lg shadow-[#2a9bb8]/20"
            >
              Go to Dashboard
              <ArrowRight size={20} />
            </Link>
          ) : (
            <a
              href={`${apiUrl}/auth/login`}
              className="lum-btn lum-pad-md text-lg rounded-lg bg-[#2a9bb8] hover:bg-[#238da8] text-white font-semibold inline-flex items-center gap-2 transition-colors shadow-lg shadow-[#2a9bb8]/20"
            >
              Get started
              <ArrowRight size={20} />
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700/50 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <LogoBirdflop size={20} fillGradient={['#54daf4', '#545eb6']} />
            <span className="text-gray-400 text-sm">3Compute by Birdflop</span>
          </div>
          <p className="text-gray-600 text-xs">
            &copy; 2025&ndash;2026 Birdflop. All rights reserved. Birdflop is a registered 501(c)(3) nonprofit organization (EIN: 93-2401009).
          </p>
          <Link to="/terms" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
            Terms of Service &amp; Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: string;
}) {
  return (
    <div className="lum-card rounded-xl p-7 border border-gray-700 hover:border-[#54daf4]/30 transition-colors">
      <div className="w-11 h-11 rounded-lg bg-[#54daf4]/10 flex items-center justify-center text-[#54daf4] mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  icon,
  text,
}: {
  number: number;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#54daf4]/10 flex items-center justify-center text-sm font-bold text-[#54daf4]">
        {number}
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <span className="text-gray-400">{icon}</span>
        <span className="text-base">{text}</span>
      </div>
    </div>
  );
}
