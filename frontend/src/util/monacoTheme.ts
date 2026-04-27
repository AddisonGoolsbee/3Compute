import type { Monaco } from '@monaco-editor/react';

// 3Compute Daylight — paper-toned Monaco theme. Background matches --ide-bg,
// syntax tokens use the --code-* palette from index.css. Apply via:
//   <MonacoEditor beforeMount={setupDaylightTheme} theme={DAYLIGHT_THEME} ... />

export const DAYLIGHT_THEME = 'daylight';

const SYNTAX_RULES = [
  { token: 'comment',          foreground: '908e8a', fontStyle: 'italic' },
  { token: 'string',           foreground: '2d6a4f' },
  { token: 'string.escape',    foreground: '2d6a4f' },
  { token: 'keyword',          foreground: '6d3aed' },
  { token: 'keyword.flow',     foreground: '6d3aed' },
  { token: 'number',           foreground: 'd24e32' },
  { token: 'number.hex',       foreground: 'd24e32' },
  { token: 'regexp',           foreground: '2d6a4f' },
  { token: 'type',             foreground: '1f4e79' },
  { token: 'type.identifier',  foreground: '1f4e79' },
  { token: 'tag',              foreground: '1f4e79' },
  { token: 'tag.id',           foreground: '1f4e79' },
  { token: 'attribute.name',   foreground: 'e09733' },
  { token: 'attribute.value',  foreground: '2d6a4f' },
  { token: 'function',         foreground: '1f4e79' },
  { token: 'variable',         foreground: '1a1a1f' },
  { token: 'variable.predefined', foreground: '1f4e79' },
  { token: 'identifier',       foreground: '1a1a1f' },
  { token: 'delimiter',        foreground: '2d2d35' },
  { token: 'delimiter.bracket', foreground: '2d2d35' },
  { token: 'metatag',          foreground: 'e09733' },
  { token: 'annotation',       foreground: 'e09733' },
];

const COLORS: Record<string, string> = {
  'editor.background': '#fdfaf2', // --ide-bg
  'editor.foreground': '#1a1a1f', // --ink-strong
  'editorLineNumber.foreground': '#b8b4a8', // --ink-faint
  'editorLineNumber.activeForeground': '#6b6a6e', // --ink-muted
  'editor.lineHighlightBackground': '#f3edd8', // --ide-elevated
  'editor.lineHighlightBorder': '#f3edd8',
  'editorCursor.foreground': '#1a1a1f',
  'editor.selectionBackground': '#d8e3eecc', // --c-navy-soft @ 80%
  'editor.inactiveSelectionBackground': '#d8e3ee99',
  'editor.selectionHighlightBackground': '#d8e3ee66',
  'editor.wordHighlightBackground': '#fbecd066', // --c-ochre-soft @ 40%
  'editor.wordHighlightStrongBackground': '#fbecd0aa',
  'editor.findMatchBackground': '#fbecd0',
  'editor.findMatchHighlightBackground': '#fbecd066',
  'editorWhitespace.foreground': '#e8e1ce', // --rule-soft
  'editorIndentGuide.background': '#e8e1ce',
  'editorIndentGuide.background1': '#e8e1ce',
  'editorIndentGuide.activeBackground': '#d8cfb8', // --rule
  'editorIndentGuide.activeBackground1': '#d8cfb8',
  'editorBracketMatch.background': '#fbecd0',
  'editorBracketMatch.border': '#e09733', // --c-ochre
  'editorBracketHighlight.foreground1': '#1f4e79',
  'editorBracketHighlight.foreground2': '#e09733',
  'editorBracketHighlight.foreground3': '#2d6a4f',
  'editorBracketHighlight.foreground4': '#6d3aed',
  'editorBracketHighlight.foreground5': '#e85d3f',
  'editorWidget.background': '#ffffff',
  'editorWidget.border': '#d8cfb8',
  'editorSuggestWidget.background': '#ffffff',
  'editorSuggestWidget.border': '#d8cfb8',
  'editorSuggestWidget.selectedBackground': '#f5f0e3', // --paper-tinted
  'editorSuggestWidget.highlightForeground': '#1f4e79',
  'editorHoverWidget.background': '#ffffff',
  'editorHoverWidget.border': '#d8cfb8',
  'editorGutter.background': '#fdfaf2',
  'editorGutter.modifiedBackground': '#e09733',
  'editorGutter.addedBackground': '#2d6a4f',
  'editorGutter.deletedBackground': '#e85d3f',
  'editorOverviewRuler.border': '#e8e1ce',
  'editorOverviewRuler.modifiedForeground': '#e09733',
  'editorOverviewRuler.addedForeground': '#2d6a4f',
  'editorOverviewRuler.deletedForeground': '#e85d3f',
  'editorError.foreground': '#e85d3f', // --c-tomato
  'editorWarning.foreground': '#e09733', // --c-ochre
  'editorInfo.foreground': '#1f4e79', // --c-navy
  'scrollbarSlider.background': '#d8cfb866',
  'scrollbarSlider.hoverBackground': '#b8b4a8aa',
  'scrollbarSlider.activeBackground': '#908e8acc',
  'minimap.background': '#fdfaf2',
};

export function setupDaylightTheme(monaco: Monaco): void {
  monaco.editor.defineTheme(DAYLIGHT_THEME, {
    base: 'vs',
    inherit: true,
    rules: SYNTAX_RULES,
    colors: COLORS,
  });
}
