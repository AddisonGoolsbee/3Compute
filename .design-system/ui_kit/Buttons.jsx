const PrimaryButton = ({ children, icon, size = 'md', onClick, color = 'navy' }) => {
  const padding = size === 'lg' ? '14px 26px' : '11px 20px';
  const fontSize = size === 'lg' ? 16 : 14.5;
  const bgVar = `var(--c-${color})`;
  return (
    <button onClick={onClick}
      style={{
        background: bgVar, color: '#fff', fontWeight: 600,
        padding, borderRadius: 'var(--r-md)', border: 'none', fontSize,
        fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8,
        boxShadow: 'var(--shadow-cta)', cursor: 'pointer',
        whiteSpace: 'nowrap', transition: 'transform .15s, box-shadow .15s, filter .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.05)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none'; }}>
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
};

const GhostButton = ({ children, icon, onClick }) => (
  <button onClick={onClick}
    style={{
      background: 'transparent', color: 'var(--ink-strong)', fontWeight: 600,
      padding: '11px 20px', borderRadius: 'var(--r-md)',
      border: '1.5px solid var(--ink-strong)', fontSize: 14.5,
      fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8,
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-tinted)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
    {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
    {children}
  </button>
);

const NavLink = ({ children, icon, active, onClick }) => (
  <button onClick={onClick}
    style={{
      background: active ? 'var(--paper-tinted)' : 'transparent',
      color: active ? 'var(--ink-strong)' : 'var(--ink-default)',
      padding: '8px 14px', borderRadius: 'var(--r-md)', border: 'none',
      fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 7,
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-tinted)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--paper-tinted)' : 'transparent'; }}>
    {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
    {children}
  </button>
);

const Pill = ({ children, color = 'ochre' }) => (
  <span style={{
    background: `var(--c-${color}-soft)`, color: `var(--c-${color})`,
    padding: '5px 12px', borderRadius: 'var(--r-pill)',
    fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
  }}>{children}</span>
);

window.PrimaryButton = PrimaryButton;
window.GhostButton = GhostButton;
window.NavLink = NavLink;
window.Pill = Pill;
