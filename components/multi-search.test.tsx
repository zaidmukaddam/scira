import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import MultiSearch from './multi-search';

const mockResult = {
  searches: [
    {
      query: 'example query 1',
      results: [
        {
          url: 'https://example.com/1',
          title: 'Example Title 1',
          content: 'Example content 1',
          raw_content: 'Example raw content 1',
          published_date: '2023-09-01',
        },
      ],
      images: [
        {
          url: 'https://example.com/image1.jpg',
          description: 'Example image 1',
        },
      ],
    },
    {
      query: 'example query 2',
      results: [
        {
          url: 'https://example.com/2',
          title: 'Example Title 2',
          content: 'Example content 2',
          raw_content: 'Example raw content 2',
          published_date: '2023-09-02',
        },
      ],
      images: [
        {
          url: 'https://example.com/image2.jpg',
          description: 'Example image 2',
        },
      ],
    },
  ],
};

const mockArgs = {
  queries: ['example query 1', 'example query 2'],
  maxResults: [1, 1],
  topics: ['general', 'news'],
  searchDepth: ['basic', 'advanced'],
};

describe('MultiSearch', () => {
  test('renders loading state when result is null', () => {
    render(<MultiSearch result={null} args={mockArgs} />);
    expect(screen.getByText('Running Web Search')).toBeInTheDocument();
  });

  test('renders search results and images', () => {
    render(<MultiSearch result={mockResult} args={mockArgs} />);
    expect(screen.getByText('Example Title 1')).toBeInTheDocument();
    expect(screen.getByText('Example Title 2')).toBeInTheDocument();
    expect(screen.getByAltText('Example image 1')).toBeInTheDocument();
    expect(screen.getByAltText('Example image 2')).toBeInTheDocument();
  });

  test('renders query badges', () => {
    render(<MultiSearch result={mockResult} args={mockArgs} />);
    expect(screen.getByText('example query 1')).toBeInTheDocument();
    expect(screen.getByText('example query 2')).toBeInTheDocument();
  });
});
