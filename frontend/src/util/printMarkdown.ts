export function printMarkdownElement(el: HTMLElement, title: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; color: #000; max-width: 720px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 20pt; margin: 24px 0 8px; } h2 { font-size: 16pt; margin: 20px 0 6px; } h3 { font-size: 13pt; margin: 16px 0 4px; }
    p { margin: 0 0 10px; }
    ul, ol { margin: 0 0 10px; padding-left: 24px; }
    li { margin-bottom: 3px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12px; font-size: 11pt; }
    th, td { border: 1px solid #999; padding: 6px 10px; text-align: left; }
    th { background: #eee; font-weight: bold; }
    code { font-family: monospace; background: #f4f4f4; padding: 1px 4px; border-radius: 3px; font-size: 10pt; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 10pt; margin: 0 0 12px; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 3px solid #ccc; margin: 0 0 10px 0; padding-left: 12px; color: #555; }
    hr { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
    a { color: #000; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>${el.innerHTML}</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
}
