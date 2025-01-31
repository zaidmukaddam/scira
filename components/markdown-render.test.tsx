import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import MarkdownRenderer from './markdown-render';

const mockContent = `
# Sample Heading

This is a sample paragraph with a [link](https://example.com).

\`\`\`javascript
console.log('Hello, world!');
\`\`\`

- List item 1
- List item 2

> This is a blockquote.

[1]: https://example.com
`;

describe('MarkdownRenderer', () => {
  it('renders the heading', () => {
    render(<MarkdownRenderer content={mockContent} />);
    expect(screen.getByText('Sample Heading')).toBeInTheDocument();
  });

  it('renders the paragraph with a link', () => {
    render(<MarkdownRenderer content={mockContent} />);
    expect(screen.getByText('This is a sample paragraph with a')).toBeInTheDocument();
    expect(screen.getByText('link')).toBeInTheDocument();
  });

  it('renders the code block', () => {
    render(<MarkdownRenderer content={mockContent} />);
    expect(screen.getByText("console.log('Hello, world!');")).toBeInTheDocument();
  });

  it('renders the list items', () => {
    render(<MarkdownRenderer content={mockContent} />);
    expect(screen.getByText('List item 1')).toBeInTheDocument();
    expect(screen.getByText('List item 2')).toBeInTheDocument();
  });

  it('renders the blockquote', () => {
    render(<MarkdownRenderer content={mockContent} />);
    expect(screen.getByText('This is a blockquote.')).toBeInTheDocument();
  });

  it('renders the citation link', () => {
    render(<MarkdownRenderer content={mockContent} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
