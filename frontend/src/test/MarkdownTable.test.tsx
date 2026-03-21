import { render } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TABLE_MD = `
| Column A | Column B |
|----------|----------|
| Cell 1   | Cell 2   |
`;

describe('Markdown table rendering', () => {
  it('renders a table WITHOUT remark-gfm (should NOT produce <table>)', () => {
    const { container } = render(<ReactMarkdown>{TABLE_MD}</ReactMarkdown>);
    expect(container.querySelector('table')).toBeNull();
  });

  it('renders a table WITH remark-gfm (should produce <table>)', () => {
    const { container } = render(
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{TABLE_MD}</ReactMarkdown>,
    );
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('th')).not.toBeNull();
    expect(container.querySelector('td')).not.toBeNull();
  });
});
