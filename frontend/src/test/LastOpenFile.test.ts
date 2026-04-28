import { describe, it, expect, beforeEach } from 'vitest';
import {
  findFileByLocation,
  getLastOpenLocation,
  setLastOpenLocation,
  pickInitialFile,
  Files,
  FileType,
} from '../util/Files';

const sampleTree: Files = [
  {
    name: 'Personal-Website',
    location: '/Personal-Website',
    files: [
      { name: 'app.py', location: '/Personal-Website/app.py' },
      { name: 'README.md', location: '/Personal-Website/README.md' },
      {
        name: 'static',
        location: '/Personal-Website/static',
        files: [
          { name: 'style.css', location: '/Personal-Website/static/style.css' },
        ],
      },
    ],
  },
  { name: 'notes.txt', location: '/notes.txt' },
];

describe('findFileByLocation', () => {
  it('finds a top-level file', () => {
    const found = findFileByLocation(sampleTree, '/notes.txt');
    expect(found).toEqual({ name: 'notes.txt', location: '/notes.txt' });
  });

  it('finds a file inside a folder', () => {
    const found = findFileByLocation(sampleTree, '/Personal-Website/app.py');
    expect(found?.name).toBe('app.py');
  });

  it('finds a file nested two folders deep', () => {
    const found = findFileByLocation(
      sampleTree,
      '/Personal-Website/static/style.css',
    );
    expect(found?.name).toBe('style.css');
  });

  it('returns undefined for a missing file (deleted after reload)', () => {
    expect(findFileByLocation(sampleTree, '/Personal-Website/gone.py')).toBeUndefined();
  });

  it('returns undefined when the location matches a folder, not a file', () => {
    // We only want to restore real files; folders shouldn't open in the editor.
    expect(findFileByLocation(sampleTree, '/Personal-Website')).toBeUndefined();
    expect(findFileByLocation(sampleTree, '/Personal-Website/static')).toBeUndefined();
  });

  it('returns undefined when files is undefined (loader failed)', () => {
    expect(findFileByLocation(undefined, '/notes.txt')).toBeUndefined();
  });

  it('returns undefined when the location is undefined (nothing saved)', () => {
    expect(findFileByLocation(sampleTree, undefined)).toBeUndefined();
  });

  it('returns undefined for an empty tree', () => {
    expect(findFileByLocation([], '/notes.txt')).toBeUndefined();
  });
});

describe('getLastOpenLocation / setLastOpenLocation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns undefined when nothing has been saved', () => {
    expect(getLastOpenLocation()).toBeUndefined();
  });

  it('round-trips a location through localStorage', () => {
    setLastOpenLocation('/Personal-Website/app.py');
    expect(getLastOpenLocation()).toBe('/Personal-Website/app.py');
  });

  it('clears the stored location when given undefined', () => {
    setLastOpenLocation('/notes.txt');
    expect(getLastOpenLocation()).toBe('/notes.txt');
    setLastOpenLocation(undefined);
    expect(getLastOpenLocation()).toBeUndefined();
  });

  it('overwrites the previous value (last write wins)', () => {
    // Simulates two browser tabs: tab A writes X, tab B then writes Y.
    // Whichever tab reloads first sees Y. There is no auto-broadcast of
    // changes to other live tabs — that's by design.
    setLastOpenLocation('/a.py');
    setLastOpenLocation('/b.py');
    expect(getLastOpenLocation()).toBe('/b.py');
  });

  it('survives a JSON-shaped value already in storage (no parse crash)', () => {
    // Defensive: an older build may have written a JSON-encoded string.
    // The current reader treats whatever is there as the raw location;
    // the next write replaces it.
    window.localStorage.setItem('3compute:last-open-file', '"/legacy.py"');
    // We don't unwrap — we just don't crash. setLastOpenLocation will
    // replace it with a clean value on the next file open.
    expect(typeof getLastOpenLocation()).toBe('string');
    setLastOpenLocation('/clean.py');
    expect(getLastOpenLocation()).toBe('/clean.py');
  });
});

describe('pickInitialFile (Editor mount logic)', () => {
  // pickInitialFile is what Editor calls during its initial-file effect.
  // It models the precise behavior the user asked for: prefer the saved
  // last-open file; fall back to a project default (README/index); if
  // neither is available, return undefined and let Editor show its built-in
  // README. The earlier version of this feature lived in root.tsx and
  // failed because it ran before loaderData.files was populated. Tests
  // here lock in the timing-correct shape.

  // Tree with a top-level README so the simple picker below can find it
  // without recursing — keeps the test focused on pickInitialFile's
  // ordering logic, not the picker's tree-walk (covered by Editor).
  const tree: Files = [
    { name: 'README.md', location: '/README.md' },
    { name: 'app.py', location: '/app.py' },
    {
      name: 'static',
      location: '/static',
      files: [{ name: 'style.css', location: '/static/style.css' }],
    },
  ];

  let pickerCalls = 0;
  const pickReadme = (files: Files): FileType | undefined => {
    pickerCalls++;
    for (const item of files) {
      if (!('files' in item) && item.name.toLowerCase() === 'readme.md') return item;
    }
    return undefined;
  };

  beforeEach(() => {
    window.localStorage.clear();
    pickerCalls = 0;
  });

  it('returns the saved file when it still exists (the core feature)', () => {
    setLastOpenLocation('/app.py');
    const picked = pickInitialFile(tree, getLastOpenLocation(), pickReadme);
    expect(picked?.name).toBe('app.py');
    // We must not call the default picker if a saved file is restorable.
    expect(pickerCalls).toBe(0);
  });

  it('falls back to project README when the saved file was deleted', () => {
    setLastOpenLocation('/deleted.py');
    const picked = pickInitialFile(tree, getLastOpenLocation(), pickReadme);
    expect(picked?.name).toBe('README.md');
    expect(pickerCalls).toBe(1);
  });

  it('falls back to project README when nothing was ever saved', () => {
    const picked = pickInitialFile(tree, getLastOpenLocation(), pickReadme);
    expect(picked?.name).toBe('README.md');
    expect(pickerCalls).toBe(1);
  });

  it('returns undefined for an empty tree (Editor will fetch static README)', () => {
    setLastOpenLocation('/app.py');
    expect(pickInitialFile([], getLastOpenLocation(), pickReadme)).toBeUndefined();
    expect(pickerCalls).toBe(0);
  });

  it('returns undefined when files is undefined (loader not yet finished)', () => {
    // This is the timing case that broke the original implementation:
    // pickInitialFile is called with files=undefined, returns undefined,
    // and the caller waits for files to populate before retrying.
    setLastOpenLocation('/app.py');
    expect(pickInitialFile(undefined, getLastOpenLocation(), pickReadme)).toBeUndefined();
    expect(pickerCalls).toBe(0);
  });

  it('does not open a folder if the saved path now matches a folder', () => {
    setLastOpenLocation('/static');
    const picked = pickInitialFile(tree, getLastOpenLocation(), pickReadme);
    // Should fall back to the default picker, not return the folder.
    expect(picked?.name).toBe('README.md');
  });

  it('lets the default picker decide if it cannot find a README either', () => {
    setLastOpenLocation('/deleted.py');
    const noReadmeTree: Files = [{ name: 'note.txt', location: '/note.txt' }];
    const picked = pickInitialFile(noReadmeTree, getLastOpenLocation(), pickReadme);
    expect(picked).toBeUndefined();
    expect(pickerCalls).toBe(1);
  });
});

describe('regression: save/restore round-trip', () => {
  // Models the full lifecycle: user opens b.txt, page reloads, user sees b.txt.
  // The previous implementation broke because root.tsx initialized currentFile
  // from a possibly-empty loaderData.files and then a save effect overwrote
  // localStorage with the README path that Editor's fallback chose. This test
  // proves that as long as restoration happens against a populated tree
  // (Editor's effect timing), the round-trip is stable.

  beforeEach(() => {
    window.localStorage.clear();
  });

  const defaultPicker = (files: Files): FileType | undefined => {
    for (const item of files) {
      if (!('files' in item) && item.name.toLowerCase() === 'readme.md') return item;
    }
    return undefined;
  };

  it('reloading after opening b.txt reopens b.txt — not the README', () => {
    const tree: Files = [
      { name: 'README.md', location: '/README.md' },
      { name: 'b.txt', location: '/b.txt' },
    ];

    // 1. User opens b.txt (Editor or Explorer would call setCurrentFile).
    //    The save effect persists the location to localStorage.
    setLastOpenLocation('/b.txt');

    // 2. Page reloads. Editor mounts with currentFile=undefined and a
    //    populated file tree, then runs its initial-file picker.
    const picked = pickInitialFile(tree, getLastOpenLocation(), defaultPicker);

    // 3. Editor must end up showing b.txt — NOT the README.
    expect(picked?.name).toBe('b.txt');
  });

  it('after b.txt is deleted, reload falls back to README without crashing', () => {
    const tree: Files = [{ name: 'README.md', location: '/README.md' }];
    setLastOpenLocation('/b.txt'); // saved, but file is gone

    const picked = pickInitialFile(tree, getLastOpenLocation(), defaultPicker);
    expect(picked?.name).toBe('README.md');
  });

  it('multi-tab: tab A saves /a, tab B saves /b — whichever reloads sees /b', () => {
    const tree: Files = [
      { name: 'a.txt', location: '/a.txt' },
      { name: 'b.txt', location: '/b.txt' },
    ];
    setLastOpenLocation('/a.txt'); // tab A
    setLastOpenLocation('/b.txt'); // tab B writes after
    // Either tab reloading reads /b — by design (no live cross-tab sync).
    expect(pickInitialFile(tree, getLastOpenLocation(), defaultPicker)?.name).toBe('b.txt');
  });
});
