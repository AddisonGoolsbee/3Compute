// Python tokenizer + colors — light-theme variant (high-contrast on cream)
const PY_COLORS = {
  keyword: '#6d3aed', string: '#2d6a4f', number: '#d24e32',
  comment: '#908e8a', decorator: '#e09733', ident: '#1a1a1f', other: '#1f4e79'
};

const PY_KEYWORDS = new Set(['def','return','if','elif','else','for','while','in','import','from','as','class','True','False','None','and','or','not','is','with','try','except','finally','raise','pass','break','continue','lambda','yield','global','nonlocal','print','int','str','float','list','dict','tuple','range','input','len']);

function tokenizePython(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '#') { out.push({t:'comment', v: line.slice(i)}); break; }
    if (c === '"' || c === "'") {
      const quote = c; let j = i + 1;
      while (j < line.length && line[j] !== quote) j++;
      out.push({t:'string', v: line.slice(i, j+1)}); i = j + 1; continue;
    }
    if (/\d/.test(c)) {
      let j = i;
      while (j < line.length && /[\d.]/.test(line[j])) j++;
      out.push({t:'number', v: line.slice(i, j)}); i = j; continue;
    }
    if (c === '@') {
      let j = i + 1;
      while (j < line.length && /[\w.]/.test(line[j])) j++;
      out.push({t:'decorator', v: line.slice(i, j)}); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < line.length && /\w/.test(line[j])) j++;
      const word = line.slice(i, j);
      out.push({t: PY_KEYWORDS.has(word) ? 'keyword' : 'ident', v: word}); i = j; continue;
    }
    let j = i;
    while (j < line.length && !/[\w@'"#\d\s]/.test(line[j])) j++;
    out.push({t:'other', v: line.slice(i, Math.max(j, i+1))}); i = Math.max(j, i+1);
  }
  return out;
}

const PyLine = ({ line, lineNo }) => (
  <div style={{ display: 'flex', gap: 12 }}>
    {lineNo != null && <span style={{ color: 'var(--ink-faint)', userSelect: 'none', minWidth: 22, textAlign: 'right', fontSize: 12 }}>{lineNo}</span>}
    <span style={{ whiteSpace: 'pre' }}>
      {line === '' ? '\u00a0' : tokenizePython(line).map((tok, j) => (
        <span key={j} style={{ color: PY_COLORS[tok.t] }}>{tok.v}</span>
      ))}
    </span>
  </div>
);

window.PY_COLORS = PY_COLORS;
window.tokenizePython = tokenizePython;
window.PyLine = PyLine;
