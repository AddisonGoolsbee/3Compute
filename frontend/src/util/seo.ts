import type { MetaDescriptor } from 'react-router';

// React Router 7 does NOT auto-merge child and parent meta — a child's array
// entirely replaces the parent's. This helper does the merge: it pulls meta
// from every ancestor match (deduping by tag key, since each match exposes
// the FULL computed meta including inherited tags), strips entries the
// child is about to override, and appends the child's overrides last so
// they win.

type MetaEntry = Record<string, unknown>;
type MatchLike = { meta?: MetaDescriptor[] };

function entryKey(e: MetaEntry): string {
  if ('title' in e) return 'title';
  if ('name' in e) return `name:${e.name as string}`;
  if ('property' in e) return `property:${e.property as string}`;
  if (e.tagName === 'link' && 'rel' in e) return `link-rel:${e.rel as string}`;
  return JSON.stringify(e);
}

export function mergeParentMeta(
  matches: MatchLike[],
  overrides: MetaDescriptor[],
): MetaDescriptor[] {
  const all = matches
    .slice(0, -1)
    .flatMap((m) => (m.meta ?? []) as MetaEntry[]);
  const seen = new Set<string>();
  const dedupedParent: MetaEntry[] = [];
  for (let i = all.length - 1; i >= 0; i--) {
    const k = entryKey(all[i]);
    if (seen.has(k)) continue;
    seen.add(k);
    dedupedParent.unshift(all[i]);
  }
  const overrideKeys = new Set((overrides as MetaEntry[]).map(entryKey));
  return [
    ...dedupedParent.filter((e) => !overrideKeys.has(entryKey(e))),
    ...overrides,
  ] as MetaDescriptor[];
}
