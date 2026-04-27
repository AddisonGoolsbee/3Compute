const Nav = ({ user, route, onNavigate }) => {
  const isLoggedIn = !!user;
  const isTeacher = user?.role === 'teacher';
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '18px 28px',
      borderBottom: '1px solid var(--rule-soft)',
      background: 'var(--paper)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <button onClick={() => onNavigate(isLoggedIn ? 'ide' : 'landing')}
        style={{ background: 'transparent', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>
        <Logotype size={26} />
      </button>
      <div style={{ flex: 1 }} />
      {isLoggedIn ? (
        <>
          <NavLink icon={<I.Terminal size={15} />} active={route === 'ide'} onClick={() => onNavigate('ide')}>Workspace</NavLink>
          {isTeacher && <NavLink icon={<I.BookOpen size={15} />} active={route === 'lessons'} onClick={() => onNavigate('lessons')}>Lessons</NavLink>}
          <NavLink icon={<I.School size={15} />} active={route === 'classroom'} onClick={() => onNavigate('classroom')}>Classroom</NavLink>
          <div style={{ width: 1, height: 22, background: 'var(--rule-soft)', margin: '0 10px' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '4px 10px' }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%',
              background: 'var(--c-tomato)', color: '#fff',
              fontWeight: 700, fontSize: 12, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center' }}>
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
            <span style={{ fontSize: 13.5, color: 'var(--ink-default)', whiteSpace: 'nowrap' }}>{user.name}</span>
          </span>
          <NavLink icon={<I.LogOut size={14} />} onClick={() => onNavigate('landing-loggedout')}>Sign out</NavLink>
        </>
      ) : (
        <>
          <NavLink onClick={() => alert('About')}>About</NavLink>
          <NavLink onClick={() => alert('Lessons')}>Lessons</NavLink>
          <NavLink onClick={() => alert('For teachers')}>For teachers</NavLink>
          <NavLink icon={<I.Heart size={15} />} onClick={() => alert('Donate')}>Donate</NavLink>
          <div style={{ width: 1, height: 22, background: 'var(--rule-soft)', margin: '0 10px' }} />
          <PrimaryButton size="md" color="navy" onClick={() => onNavigate('login')} icon={<I.LogIn size={15} />}>
            Sign in
          </PrimaryButton>
        </>
      )}
    </nav>
  );
};

window.Nav = Nav;
