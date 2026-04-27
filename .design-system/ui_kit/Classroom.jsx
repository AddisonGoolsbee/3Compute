const STUDENTS = [
  { name: 'Alice Chen',  email: 'alice@school.edu',  scores: { 'Hello-World': [3,3], 'Calculator': [4,5], 'Website': [2,4] } },
  { name: 'Ben Torres',  email: 'ben@school.edu',    scores: { 'Hello-World': [3,3], 'Calculator': [5,5], 'Website': [3,4] } },
  { name: 'Chloe Park',  email: 'chloe@school.edu',  scores: { 'Hello-World': [3,3], 'Calculator': [5,5], 'Website': [4,4] } },
  { name: 'David Kim',   email: 'david@school.edu',  scores: { 'Hello-World': [2,3], 'Calculator': [3,5], 'Website': [1,4] } },
  { name: 'Emma Davis',  email: 'emma@school.edu',   scores: { 'Hello-World': [3,3], 'Calculator': [5,5], 'Website': [2,4] } },
  { name: 'Felix Wong',  email: 'felix@school.edu',  scores: { 'Hello-World': [1,3], 'Calculator': [2,5], 'Website': [0,4] } },
];
const ASSIGNMENTS = ['Hello-World', 'Calculator', 'Website'];
const AVATAR_COLORS = ['c-tomato', 'c-navy', 'c-forest', 'c-ochre', 'c-plum', 'c-tomato'];

const StudentRow = ({ s, idx, assignment, expanded, onToggle }) => {
  const [p, t] = s.scores[assignment];
  const passing = p === t;
  const partial = p > 0 && p < t;
  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  return (
    <>
      <button onClick={() => onToggle(s.email)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 14px', borderRadius: 'var(--r-md)',
          background: expanded ? 'var(--paper-tinted)' : 'transparent',
          border: 'none', color: 'var(--ink-strong)', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => !expanded && (e.currentTarget.style.background = 'var(--paper-tinted)')}
        onMouseLeave={(e) => !expanded && (e.currentTarget.style.background = 'transparent')}>
        <span style={{ color: 'var(--ink-subtle)', display: 'inline-flex',
          transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
          <I.ChevronRight size={14} />
        </span>
        <span style={{ width: 32, height: 32, borderRadius: '50%',
          background: `var(--${avatarColor})`, color: '#fff',
          fontWeight: 700, fontSize: 12, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink-strong)' }}>{s.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-subtle)', marginTop: 1 }}>{s.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 80, height: 6, background: 'var(--paper-deeper)',
            borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(p/t)*100}%`, height: '100%',
              background: passing ? 'var(--c-forest)' : partial ? 'var(--c-ochre)' : 'var(--c-tomato)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 500,
            color: passing ? 'var(--c-forest)' : 'var(--ink-default)', minWidth: 36, textAlign: 'right' }}>
            {p}/{t}
          </span>
        </div>
      </button>
      {expanded && (
        <div style={{ margin: '0 36px 14px', border: '1px solid var(--rule-soft)',
          borderRadius: 'var(--r-md)', overflow: 'hidden', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', borderBottom: '1px solid var(--rule-soft)' }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>app.py</span>
            <span style={{ fontSize: 12.5, color: 'var(--c-navy)', display: 'inline-flex', gap: 5, alignItems: 'center' }}>
              <I.ExternalLink size={11} /> Open in workspace
            </span>
          </div>
          <div style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontSize: 12.5,
            lineHeight: '20px', background: 'var(--paper)' }}>
            {['from flask import Flask', '', 'app = Flask(__name__)', '', '@app.route("/")', 'def home():', '    return "Welcome!"'].map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--ink-faint)', width: 18, textAlign: 'right',
                  flexShrink: 0, fontSize: 11 }}>{i + 1}</span>
                <span style={{ whiteSpace: 'pre' }}>
                  {line === '' ? '\u00a0' : tokenizePython(line).map((tok, j) => (
                    <span key={j} style={{ color: PY_COLORS[tok.t] }}>{tok.v}</span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const Classroom = () => {
  const [assignment, setAssignment] = React.useState('Hello-World');
  const [expanded, setExpanded] = React.useState(null);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="eyebrow" style={{ color: 'var(--c-tomato)' }}>Period 3 · Computer Science 1</span>
          <h1 className="h-1" style={{ margin: '8px 0 0' }}>Intro to Python</h1>
          <p className="body-sm" style={{ marginTop: 6, marginBottom: 0 }}>
            {STUDENTS.length} students · {ASSIGNMENTS.length} assignments
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span className="body-sm">Access code</span>
          <code style={{ background: 'var(--c-ochre-soft)',
            border: '1px solid var(--c-ochre)', padding: '7px 14px',
            borderRadius: 'var(--r-md)', fontFamily: 'var(--font-mono)',
            fontSize: 14, letterSpacing: '0.12em', color: 'var(--c-ochre)',
            fontWeight: 600, whiteSpace: 'nowrap' }}>
            ABC-123
          </code>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: '1px solid var(--rule-soft)' }}>
        {['Students', 'Gradebook', 'Settings'].map((t, i) => (
          <button key={t} style={{
            padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: i === 0 ? 'var(--ink-strong)' : 'var(--ink-muted)',
            fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
            borderBottom: i === 0 ? '2px solid var(--c-navy)' : '2px solid transparent',
            marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <span className="caption" style={{ marginRight: 8 }}>Assignment</span>
        {ASSIGNMENTS.map((t) => (
          <button key={t} onClick={() => setAssignment(t)}
            style={{
              padding: '6px 14px', borderRadius: 'var(--r-pill)', fontSize: 13,
              border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              whiteSpace: 'nowrap',
              background: assignment === t ? 'var(--c-navy)' : 'transparent',
              borderColor: assignment === t ? 'var(--c-navy)' : 'var(--rule)',
              color: assignment === t ? '#fff' : 'var(--ink-muted)',
            }}>{t}</button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--rule-soft)',
        borderRadius: 'var(--r-lg)', padding: 8, boxShadow: 'var(--shadow-sm)' }}>
        {STUDENTS.map((s, i) => (
          <StudentRow key={s.email} s={s} idx={i} assignment={assignment}
            expanded={expanded === s.email}
            onToggle={(e) => setExpanded(prev => prev === e ? null : e)} />
        ))}
      </div>
    </div>
  );
};

window.Classroom = Classroom;
