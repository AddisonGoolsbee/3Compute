import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { useEffect, useRef } from 'react';

/** Simulated PTY for the public demo: a real xterm.js, fed by a tiny
 *  client-side dispatcher. No backend, no Socket.IO, no abuse surface. */

interface DemoTerminalProps {
  /** Demo classroom tree, used to answer ``ls`` / ``cat``. Map of relative
   *  path → file content. Directory entries are inferred from the keys. */
  files: Record<string, string>;
  /** Optional welcome banner printed once at the top of the buffer. */
  greeting?: string;
  /** Starting cwd (relative to the simulated root). Reflected in the prompt
   *  so e.g. ``cd cs-101-demo-classroom/fizzbuzz`` shows
   *  ``~/cs-101-demo-classroom/fizzbuzz$`` like a real shell. */
  initialCwd?: string;
  /** Username shown in the prompt — student@demo or instructor@demo. */
  promptUser?: string;
}

// Standard ANSI color escapes that pick up the paper-toned theme palette
// configured below. Avoid 256-color indices so the prompt re-skins cleanly
// if the theme is ever retuned.
function buildPrompt(user: string, cwd: string): string {
  const path = cwd ? `~/${cwd}` : '~';
  return `\x1b[34m${user}\x1b[0m:\x1b[36m${path}\x1b[0m$ `;
}
const HELP = [
  'Available demo commands:',
  '  ls [path]         list files in a directory',
  '  cat <file>        print a file',
  '  pwd               print working directory',
  '  cd <dir>          change directory',
  '  python <file>     run a Python file (canned output)',
  '  pytest [path]     run tests (canned output)',
  '  clear             clear the screen',
  '  help              show this list',
  '',
  'Sign up for a real shell that runs your code.',
];

function listDirEntries(
  files: Record<string, string>, dir: string,
): { dirs: string[]; files: string[] } {
  const norm = dir === '' ? '' : dir.replace(/\/$/, '') + '/';
  const dirs = new Set<string>();
  const direct = new Set<string>();
  for (const path of Object.keys(files)) {
    if (norm && !path.startsWith(norm)) continue;
    const rest = path.slice(norm.length);
    const slash = rest.indexOf('/');
    if (slash === -1) {
      direct.add(rest);
    } else {
      dirs.add(rest.slice(0, slash));
    }
  }
  return {
    dirs: [...dirs].sort(),
    files: [...direct].sort(),
  };
}

function dirExists(files: Record<string, string>, dir: string): boolean {
  if (dir === '' || dir === '/') return true;
  const norm = dir.replace(/\/$/, '') + '/';
  return Object.keys(files).some((p) => p.startsWith(norm));
}

export function DemoTerminal({
  files, greeting, initialCwd = '', promptUser = 'student@demo',
}: DemoTerminalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  // Mutable shell state; ref so closures stay in sync without re-running effect.
  const stateRef = useRef<{ buffer: string; cwd: string }>({
    buffer: '',
    cwd: initialCwd,
  });
  // Mirror `files` into a ref so command handlers always see the latest
  // prefetched FS without forcing the xterm-init effect to re-run. The demo
  // streams ~60 files in one at a time; rebuilding xterm on every arrival
  // produced visible jitter.
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  useEffect(() => {
    if (!ref.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      // xterm defaults to 1.0; matching that gives the tight, OS-terminal
      // line packing users expect. The real IDE TerminalSession uses 1.4
      // but the demo audience benchmarks against iTerm/Terminal.app, which
      // sit closer to 1.0.
      lineHeight: 1,
      fontFamily: '"DM Mono", ui-monospace, Menlo, monospace',
      // Mirror the production xterm theme from components/TerminalSession.tsx
      // so the demo palette is indistinguishable from the real shell.
      theme: {
        background: '#fbf7ec',
        foreground: '#2d2d35',
        cursor: '#1a1a1f',
        cursorAccent: '#fbf7ec',
        selectionBackground: '#d8e3eecc',
        selectionForeground: '#1a1a1f',
        black: '#1a1a1f',
        red: '#e85d3f',
        green: '#2d6a4f',
        yellow: '#b07a1f',
        blue: '#1f4e79',
        magenta: '#6d3aed',
        cyan: '#0e7490',
        white: '#6b6a6e',
        brightBlack: '#908e8a',
        brightRed: '#d24e32',
        brightGreen: '#2d6a4f',
        brightYellow: '#e09733',
        brightBlue: '#1f4e79',
        brightMagenta: '#6d3aed',
        brightCyan: '#0e7490',
        brightWhite: '#1a1a1f',
      },
      scrollback: 2000,
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);

    let raf = 0;
    const tryFit = () => {
      if (!ref.current) return;
      const w = term.element?.clientWidth ?? 0;
      const h = term.element?.clientHeight ?? 0;
      if (w > 0 && h > 0) {
        try { fit.fit(); } catch { /* ignore */ }
      } else {
        raf = requestAnimationFrame(tryFit);
      }
    };
    tryFit();

    // Re-fit once DM Mono finishes loading. xterm measures row height from
    // the active font; on cold page loads the fallback font is in effect
    // when ``term.open`` runs, which leaves rows visually too spaced. A
    // re-fit after fonts.ready remeasures with the real glyph metrics.
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        if (!ref.current) return;
        try { fit.fit(); } catch { /* ignore */ }
      });
    }

    const onResize = () => { try { fit.fit(); } catch { /* ignore */ } };
    window.addEventListener('resize', onResize);

    termRef.current = term;
    fitRef.current = fit;

    if (greeting) {
      // Soft green for the greeting; matches the theme palette.
      term.writeln(`\x1b[32m${greeting}\x1b[0m`);
    }
    // Dim/bright-black for the help hint so it sits visibly behind the prompt
    // on the cream background but still feels secondary.
    term.writeln('\x1b[90mType "help" for commands. Editing and running here is simulated.\x1b[0m');
    term.write(buildPrompt(promptUser, stateRef.current.cwd));

    const writePrompt = () => term.write(buildPrompt(promptUser, stateRef.current.cwd));

    const printFile = (p: string) => {
      const content = filesRef.current[p];
      if (content === undefined) {
        term.writeln(`cat: ${p}: No such file or directory`);
        return;
      }
      // Strip trailing newline so we don't double-space.
      const out = content.endsWith('\n') ? content.slice(0, -1) : content;
      out.split('\n').forEach((line) => term.writeln(line));
    };

    const runCommand = (raw: string) => {
      const line = raw.trim();
      if (!line) return;
      const parts = line.split(/\s+/);
      const cmd = parts[0];
      // Strip shell quoting and expand ``~`` so commands the IDE dispatches
      // (e.g. ``cd ~/'classroom/assignments/fibonacci'`` from the explorer's
      // "Open in terminal") work the same as in the real shell. Treat ``~``
      // as the simulated root, so ``~/x`` becomes the absolute path ``/x``
      // which ``resolve`` handles below.
      const expandArg = (raw: string): string => {
        const unquoted = raw.replace(/['"]/g, '');
        if (unquoted === '~') return '/';
        if (unquoted.startsWith('~/')) return '/' + unquoted.slice(2);
        // The IDE Run button emits ``/app/...`` to match the real container
        // mount point; the simulated FS doesn't have that prefix, so strip
        // it transparently.
        if (unquoted === '/app' || unquoted === '/app/') return '/';
        if (unquoted.startsWith('/app/')) return unquoted.slice(4);
        return unquoted;
      };
      const args = parts.slice(1).map(expandArg);
      const cwd = stateRef.current.cwd;

      const resolve = (p: string): string => {
        if (!p || p === '.') return cwd;
        if (p === '/') return '';
        // Normalize relative-to-cwd. Treats absolute paths as relative to root
        // (this is a faux filesystem rooted at the classroom).
        let base = p.startsWith('/') ? '' : cwd;
        for (const seg of p.split('/')) {
          if (!seg || seg === '.') continue;
          if (seg === '..') {
            base = base.includes('/') ? base.replace(/\/[^/]+$/, '') : '';
          } else {
            base = base ? `${base}/${seg}` : seg;
          }
        }
        return base;
      };

      switch (cmd) {
      case 'help': {
        HELP.forEach((l) => term.writeln(l));
        break;
      }
      case 'clear': {
        term.clear();
        break;
      }
      case 'pwd': {
        term.writeln('/app' + (cwd ? '/' + cwd : ''));
        break;
      }
      case 'ls': {
        const target = resolve(args[0] ?? '');
        if (!dirExists(filesRef.current, target)) {
          term.writeln(`ls: ${args[0] ?? target}: No such file or directory`);
          break;
        }
        const { dirs, files: fs } = listDirEntries(filesRef.current, target);
        if (dirs.length === 0 && fs.length === 0) {
          // empty dir
          break;
        }
        const items = [
          ...dirs.map((d) => `\x1b[34m${d}/\x1b[0m`),
          ...fs,
        ];
        term.writeln(items.join('  '));
        break;
      }
      case 'cd': {
        const target = resolve(args[0] ?? '');
        if (!dirExists(filesRef.current, target)) {
          term.writeln(`cd: ${args[0] ?? ''}: No such file or directory`);
          break;
        }
        stateRef.current.cwd = target;
        break;
      }
      case 'cat': {
        if (!args[0]) {
          term.writeln('cat: missing operand');
          break;
        }
        printFile(resolve(args[0]));
        break;
      }
      case 'python':
      case 'python3': {
        if (!args[0]) {
          term.writeln('Python 3.12.0 (demo)');
          term.writeln('Interactive Python is not available in the demo.');
          break;
        }
        const target = resolve(args[0]);
        if (filesRef.current[target] === undefined) {
          term.writeln(`python: can't open file '${args[0]}': No such file`);
          break;
        }
        term.writeln(`\x1b[32mRunning ${args[0]} (simulated)\x1b[0m`);
        term.writeln('No top-level output. Run "pytest" to grade.');
        break;
      }
      case 'pytest': {
        // Discover test files under the current dir. Each assignment ships a
        // single ``test_*.py`` so the demo audience sees per-function output
        // when cd'd into one, and a multi-file collection when run at the
        // classroom root.
        const cwdNorm = cwd.replace(/\/$/, '');
        const prefix = cwdNorm ? cwdNorm + '/' : '';
        const snapshot = filesRef.current;
        const testFiles: { rel: string; absKey: string; content: string }[] = [];
        for (const k of Object.keys(snapshot)) {
          if (prefix && !k.startsWith(prefix)) continue;
          const rel = prefix ? k.slice(prefix.length) : k;
          // Only direct test_*.py descendants under cwd's tree.
          const base = rel.split('/').pop() ?? '';
          if (!base.startsWith('test_') || !base.endsWith('.py')) continue;
          testFiles.push({ rel, absKey: k, content: snapshot[k] });
        }
        // Parse out def test_*(...): names, in source order.
        const collected: { file: string; name: string }[] = [];
        for (const tf of testFiles) {
          const matches = [...tf.content.matchAll(/^\s*def\s+(test_[A-Za-z_0-9]*)\s*\(/gm)];
          for (const m of matches) {
            collected.push({ file: tf.rel, name: m[1] });
          }
        }

        const ts = (Math.random() * 0.05 + 0.02).toFixed(2);
        const platformLine = 'platform linux -- Python 3.12.4, pytest-8.3.4, pluggy-1.5.0';
        const cachedirLine = 'cachedir: .pytest_cache';
        const rootdirLine = `rootdir: /app${cwdNorm ? '/' + cwdNorm : ''}`;
        const pluginsLine = 'plugins: anyio-4.7.0';

        term.writeln('\x1b[1m============================= test session starts ==============================\x1b[0m');
        term.writeln(platformLine);
        term.writeln(cachedirLine);
        term.writeln(rootdirLine);
        term.writeln(pluginsLine);

        if (collected.length === 0) {
          term.writeln('collected 0 items');
          term.writeln('');
          term.writeln('\x1b[33m============================ no tests ran in 0.01s ============================\x1b[0m');
          term.writeln('');
          term.writeln('\x1b[2mTip: cd into an assignment folder (fizzbuzz, palindrome, fibonacci) and run pytest there.\x1b[0m');
          break;
        }

        term.writeln(`collected ${collected.length} items`);
        term.writeln('');

        // Per-test PASSED lines, à la ``pytest -v``.
        const total = collected.length;
        let passed = 0;
        for (let i = 0; i < collected.length; i++) {
          const { file, name } = collected[i];
          const pct = Math.round(((i + 1) / total) * 100);
          const padding = ' '.repeat(Math.max(1, 56 - file.length - name.length - 4));
          term.writeln(`${file}::${name} \x1b[32mPASSED\x1b[0m${padding}[${pct}%]`);
          passed++;
        }
        term.writeln('');
        term.writeln(`\x1b[32m============================== ${passed} passed in ${ts}s ===============================\x1b[0m`);
        term.writeln('');
        term.writeln('\x1b[2mTests run against the simulated FS — sign up to wire pytest to a real container.\x1b[0m');
        break;
      }
      case 'echo': {
        term.writeln(args.join(' '));
        break;
      }
      case 'exit':
      case 'logout': {
        term.writeln('(Demo terminal stays open — refresh the page to reset.)');
        break;
      }
      default: {
        term.writeln(`${cmd}: command not found in demo. Type "help" for available commands.`);
      }
      }
    };

    // Programmatic input from the Run button. We echo the command as if the
    // user typed it so the simulated terminal feels live. Only honored on
    // the visible terminal — the panel toggles visibility, not unmounting.
    const onRunCommand = (e: Event) => {
      if (!ref.current) return;
      const detail = (e as CustomEvent).detail as { command?: string } | undefined;
      const cmd = (detail?.command ?? '').trim();
      if (!cmd) return;
      // Skip if this terminal is hidden by its parent (multi-tab support).
      const visible = ref.current.offsetParent !== null;
      if (!visible) return;
      // Clear in-progress input first so we don't merge with whatever the
      // user was typing.
      stateRef.current.buffer = '';
      term.write('\r' + ' '.repeat(80) + '\r' + buildPrompt(promptUser, stateRef.current.cwd));
      term.write(cmd);
      term.write('\r\n');
      runCommand(cmd);
      writePrompt();
    };
    window.addEventListener('csroom:demo-run', onRunCommand as EventListener);

    const onKey = term.onData((data: string) => {
      const buf = stateRef.current.buffer;
      // Handle a few control sequences explicitly.
      if (data === '\r') {
        term.write('\r\n');
        runCommand(buf);
        stateRef.current.buffer = '';
        writePrompt();
        return;
      }
      if (data === '\x7f' || data === '\b') {
        // backspace
        if (buf.length > 0) {
          stateRef.current.buffer = buf.slice(0, -1);
          term.write('\b \b');
        }
        return;
      }
      if (data === '\x03') {
        // Ctrl+C — cancel current line.
        term.write('^C\r\n');
        stateRef.current.buffer = '';
        writePrompt();
        return;
      }
      if (data === '\x0c') {
        // Ctrl+L — clear.
        term.clear();
        writePrompt();
        term.write(buf);
        return;
      }
      // Ignore other control sequences to keep the demo honest about what
      // works (no arrow-key history, no tab completion). Visible ASCII only.
      const printable = [...data].filter((c) => {
        const code = c.charCodeAt(0);
        return code >= 0x20 && code !== 0x7f;
      }).join('');
      if (!printable) return;
      stateRef.current.buffer = buf + printable;
      term.write(printable);
    });

    return () => {
      onKey.dispose();
      window.removeEventListener('csroom:demo-run', onRunCommand as EventListener);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  // Recreate only when the cosmetic shell config changes (role flip swaps
  // promptUser, page nav swaps initialCwd/greeting). File contents stream
  // in via `filesRef`, so prefetch progress doesn't tear xterm down.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, initialCwd, promptUser]);

  return (
    // bg-ide-bg matches the xterm theme background so the panel chrome
    // doesn't show a dark frame around the terminal canvas. The parent
    // DemoTerminalPanel already supplies the rounded-lg + border, so this
    // div is a plain canvas host.
    <div className="h-full w-full bg-ide-bg overflow-hidden">
      <div ref={ref} className="h-full w-full p-2" />
    </div>
  );
}
