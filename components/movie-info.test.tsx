import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import TMDBResult from './movie-info';

const mockMediaDetails = {
  id: 1,
  media_type: 'movie',
  title: 'Test Movie',
  overview: 'This is a test movie overview.',
  poster_path: '/test-poster-path.jpg',
  backdrop_path: '/test-backdrop-path.jpg',
  vote_average: 8.5,
  vote_count: 1000,
  release_date: '2022-01-01',
  runtime: 120,
  genres: [{ id: 1, name: 'Action' }],
  credits: {
    cast: [
      { id: 1, name: 'Actor 1', character: 'Character 1', profile_path: '/actor1.jpg' },
      { id: 2, name: 'Actor 2', character: 'Character 2', profile_path: '/actor2.jpg' },
    ],
  },
  original_language: 'en',
};

describe('TMDBResult Component', () => {
  it('renders without crashing', () => {
    render(<TMDBResult result={{ result: mockMediaDetails }} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('displays movie details correctly', () => {
    render(<TMDBResult result={{ result: mockMediaDetails }} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('This is a test movie overview.')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('Actor 1')).toBeInTheDocument();
    expect(screen.getByText('Character 1')).toBeInTheDocument();
  });

  it('opens details dialog on click', () => {
    render(<TMDBResult result={{ result: mockMediaDetails }} />);
    fireEvent.click(screen.getByText('Test Movie'));
    expect(screen.getByText('Cast')).toBeInTheDocument();
    expect(screen.getByText('Actor 1')).toBeInTheDocument();
    expect(screen.getByText('Actor 2')).toBeInTheDocument();
  });

  it('handles missing media details gracefully', () => {
    render(<TMDBResult result={{ result: null }} />);
    expect(screen.queryByText('Test Movie')).not.toBeInTheDocument();
  });
});
