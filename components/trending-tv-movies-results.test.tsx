import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import TrendingResults from './trending-tv-movies-results';

const mockResults = {
  results: [
    {
      id: 1,
      title: 'Movie 1',
      overview: 'Overview 1',
      poster_path: '/path/to/poster1.jpg',
      backdrop_path: '/path/to/backdrop1.jpg',
      vote_average: 8.5,
      release_date: '2022-01-01',
      genre_ids: [28, 12],
      popularity: 100,
    },
    {
      id: 2,
      name: 'Show 1',
      overview: 'Overview 2',
      poster_path: '/path/to/poster2.jpg',
      backdrop_path: '/path/to/backdrop2.jpg',
      vote_average: 7.5,
      first_air_date: '2022-02-01',
      genre_ids: [16, 35],
      popularity: 90,
    },
  ],
};

describe('TrendingResults Component', () => {
  it('renders trending movies', () => {
    render(<TrendingResults result={mockResults} type="movie" />);
    expect(screen.getByText('Trending Movies')).toBeInTheDocument();
    expect(screen.getByText('Movie 1')).toBeInTheDocument();
  });

  it('renders trending shows', () => {
    render(<TrendingResults result={mockResults} type="tv" />);
    expect(screen.getByText('Trending Shows')).toBeInTheDocument();
    expect(screen.getByText('Show 1')).toBeInTheDocument();
  });

  it('shows detail view on item click', () => {
    render(<TrendingResults result={mockResults} type="movie" />);
    fireEvent.click(screen.getByText('Movie 1'));
    expect(screen.getByText('Overview 1')).toBeInTheDocument();
  });

  it('toggles show all', () => {
    render(<TrendingResults result={mockResults} type="movie" />);
    fireEvent.click(screen.getByText('View All'));
    expect(screen.getByText('Show Less')).toBeInTheDocument();
  });
});
