// Daylight landing — colorful section blocks, scholastic serif headlines
const Landing = ({ onSignIn }) => (
  <div>
    {/* Hero */}
    <section style={{ padding: '88px 28px 96px', position: 'relative', overflow: 'hidden' }}>
      {/* abstract paper-corner shapes */}
      <div aria-hidden style={{ position: 'absolute', top: 60, right: -80, width: 280, height: 280,
        background: 'var(--c-ochre-soft)', borderRadius: '50%', opacity: 0.6, zIndex: 0 }} />
      <div aria-hidden style={{ position: 'absolute', top: 220, right: 80, width: 80, height: 80,
        background: 'var(--c-tomato)', borderRadius: 18, transform: 'rotate(12deg)', opacity: 0.85, zIndex: 0 }} />

      <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1,
        display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 56, alignItems: 'center' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 18, color: 'var(--c-tomato)' }}>
            A free nonprofit project · Made for classrooms
          </div>
          <h1 className="h-display" style={{ margin: '0 0 36px', fontSize: 64, lineHeight: 1.05 }}>
            Learn to code,<br />
            <span style={{ color: 'var(--c-navy)', fontStyle: 'italic' }}>in your browser</span>,<br />
            for free.
          </h1>
          <p className="body-lg" style={{ margin: '0 0 32px', color: 'var(--ink-default)', maxWidth: 540 }}>
            CS Room is a coding classroom for high-school and college students.
            Open a browser, write Python, and publish what you build to a real web address.
            No installs, no payment, no expiration date.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <PrimaryButton size="lg" color="navy" onClick={onSignIn} icon={<I.ArrowRight size={18} />}>
              Sign in to start
            </PrimaryButton>
            <GhostButton icon={<I.BookOpen size={16} />}>Browse lessons</GhostButton>
          </div>
          <p className="body-sm" style={{ marginTop: 24, color: 'var(--ink-muted)' }}>
            <span style={{ color: 'var(--c-forest)', fontWeight: 600 }}>● </span>
            Used in classrooms across 14 states. <a href="#"
            style={{ color: 'var(--c-navy)', textDecoration: 'none', fontWeight: 600 }}>Add yours →</a>
          </p>
        </div>
        <div style={{ justifySelf: 'end' }}>
          <TerminalDemo />
        </div>
      </div>
    </section>

    {/* Mission band — colored block */}
    <section style={{ padding: '72px 28px', background: 'var(--c-navy)',
      color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden style={{ position: 'absolute', top: -40, left: -40, width: 180, height: 180,
        background: 'var(--c-tomato)', borderRadius: '50%', opacity: 0.4 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: -60, right: 40, width: 120, height: 120,
        background: 'var(--c-ochre)', borderRadius: 24, transform: 'rotate(-18deg)', opacity: 0.5 }} />
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <div className="eyebrow" style={{ color: '#f4a948', marginBottom: 16 }}>Why we built this</div>
        <h2 className="h-2" style={{ margin: '0 0 16px', color: '#fff' }}>
          Every classroom should have access.
        </h2>
        <p className="body-lg" style={{ color: '#e8e1ce' }}>
          Computer science classrooms shouldn't depend on whether a school can afford
          managed Chromebooks, software licenses, or cloud credits. CS Room is run by
          Birdflop, a 501(c)(3) nonprofit, and is funded by donations.
        </p>
        <div style={{ marginTop: 28, display: 'inline-flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button style={{
            background: 'var(--c-tomato)', color: '#fff', border: 'none',
            padding: '12px 24px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15,
            fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', gap: 8, boxShadow: '0 6px 20px -4px rgba(232,93,63,0.5)',
          }}>
            <I.Heart size={16} /> Donate
          </button>
          <button style={{
            background: 'transparent', color: '#fff', border: '1.5px solid #fff',
            padding: '12px 24px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15,
            fontFamily: 'inherit', cursor: 'pointer',
          }}>Read our annual report</button>
        </div>
      </div>
    </section>

    {/* Three audiences — colored cards */}
    <section style={{ padding: '88px 28px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 className="h-2" style={{ margin: 0 }}>One workspace, three roles</h2>
          <p className="body" style={{ color: 'var(--ink-muted)', marginTop: 12 }}>
            Sign in with Google. Everything else depends on whether you joined as a student,
            teacher, or both.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          {[
            { spot: <SpotEditor size={170} />, color: 'navy', tag: 'Students',
              title: 'Build and publish', body: "Get a personal Linux workspace. Write Python in the browser. Publish to a public address you keep — long after class ends." },
            { spot: <SpotClassroom size={170} />, color: 'tomato', tag: 'Teachers',
              title: 'Run your classroom', body: "Create a class, share a code, import lessons. See every student's progress and tests in one gradebook." },
            { spot: <SpotLesson size={170} />, color: 'forest', tag: 'Lesson authors',
              title: 'Write and share lessons', body: 'Browse our open library, fork any lesson, or write your own with Markdown plus a test file.' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'var(--paper-elevated)',
              border: `1.5px solid var(--c-${c.color})`,
              borderRadius: 'var(--r-2xl)', padding: 28, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>{c.spot}</div>
              <Pill color={c.color}>{c.tag}</Pill>
              <h3 className="h-3" style={{ margin: '12px 0 10px' }}>{c.title}</h3>
              <p className="body" style={{ color: 'var(--ink-muted)', margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Feature grid — alternating accents */}
    <section style={{ padding: '64px 28px', background: 'var(--paper-tinted)' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <h2 className="h-2" style={{ margin: '0 0 40px', textAlign: 'center' }}>What's included</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px 56px' }}>
          {[
            { icon: <I.Terminal size={22} />, color: 'navy', title: 'A real Python workspace',
              body: 'A persistent Linux environment with editor, file explorer, and terminal.' },
            { icon: <I.Globe size={22} />, color: 'forest', title: 'Public web addresses',
              body: 'Run any server and publish to name.app.csroom.org. Share with classmates or family.' },
            { icon: <I.FlaskConical size={22} />, color: 'plum', title: 'Auto-graded tests',
              body: "Lessons ship with tests. Students see what's passing as they work; teachers see the same view in the gradebook." },
            { icon: <I.BookOpen size={22} />, color: 'ochre', title: 'An open lesson library',
              body: 'Modify any community lesson, or write your own using Markdown plus a tests directory.' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 18 }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)',
                background: `var(--c-${f.color}-soft)`, color: `var(--c-${f.color})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <h4 className="h-4" style={{ margin: '6px 0 6px' }}>{f.title}</h4>
                <p className="body" style={{ color: 'var(--ink-muted)', margin: 0 }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Closing CTA */}
    <section style={{ padding: '88px 28px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center',
        padding: '56px 40px', background: 'var(--paper-elevated)',
        border: '1px solid var(--rule-soft)', borderRadius: 'var(--r-2xl)',
        boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 16 }}>
          <SpotGlobe size={140} />
        </div>
        <h2 className="h-2" style={{ margin: '0 0 12px' }}>Free, for as long as we exist.</h2>
        <p className="body-lg" style={{ color: 'var(--ink-muted)', marginBottom: 28 }}>
          No payment, no trial, no enterprise tier. Donations go directly toward
          server costs and lesson development.
        </p>
        <div style={{ display: 'inline-flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <PrimaryButton size="lg" color="navy" onClick={onSignIn}>Sign in to start</PrimaryButton>
          <GhostButton icon={<I.Heart size={16} />}>Donate</GhostButton>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

window.Landing = Landing;
