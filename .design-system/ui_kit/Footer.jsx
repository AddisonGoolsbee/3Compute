const Footer = () => (
  <footer style={{ padding: '64px 28px 32px', borderTop: '1px solid var(--rule-soft)',
    background: 'var(--paper-tinted)', marginTop: 0 }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 32 }}>
      <div>
        <Logotype size={24} />
        <p className="body-sm" style={{ marginTop: 14, maxWidth: 320 }}>
          A free coding classroom from <a href="#"
          style={{ color: 'var(--c-navy)', textDecoration: 'none', fontWeight: 600 }}>Birdflop</a>,
          a 501(c)(3) nonprofit. Free for everyone, regardless of school budget.
        </p>
      </div>
      {[
        { title: 'Learn', links: ['Lessons', 'For students', 'For teachers'] },
        { title: 'About', links: ['Our mission', 'Birdflop', 'Annual report'] },
        { title: 'Help', links: ['Documentation', 'Contact', 'GitHub'] },
      ].map((col) => (
        <div key={col.title}>
          <div className="eyebrow" style={{ marginBottom: 14, color: 'var(--c-navy)' }}>{col.title}</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {col.links.map((l) => (
              <li key={l}><a href="#" style={{ color: 'var(--ink-default)', textDecoration: 'none', fontSize: 14 }}>{l}</a></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      paddingTop: 24, borderTop: '1px solid var(--rule-soft)',
      fontSize: 12.5, color: 'var(--ink-subtle)' }}>
      <span>© 2026 Birdflop. A 501(c)(3) nonprofit.</span>
      <span style={{ display: 'flex', gap: 24 }}>
        <a href="#" style={{ color: 'var(--ink-subtle)', textDecoration: 'none' }}>Terms</a>
        <a href="#" style={{ color: 'var(--ink-subtle)', textDecoration: 'none' }}>Privacy</a>
        <a href="#" style={{ color: 'var(--ink-subtle)', textDecoration: 'none' }}>Accessibility</a>
      </span>
    </div>
  </footer>
);

window.Footer = Footer;
