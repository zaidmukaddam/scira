import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import PlaceCard from './place-card';

describe('PlaceCard', () => {
  const place = {
    name: 'Test Place',
    location: { lat: 40.7128, lng: -74.0060 },
    place_id: 'test_place_id',
    vicinity: '123 Test St, Test City',
    rating: 4.5,
    reviews_count: 100,
    price_level: '$$',
    description: 'A test place for testing',
    photos: [
      {
        thumbnail: 'thumbnail.jpg',
        small: 'small.jpg',
        medium: 'medium.jpg',
        large: 'large.jpg',
        original: 'original.jpg',
        caption: 'Test photo',
      },
    ],
    is_closed: false,
    next_open_close: '1800',
    type: 'restaurant',
    cuisine: 'Test Cuisine',
    source: 'Test Source',
    phone: '123-456-7890',
    website: 'https://www.testplace.com',
    hours: ['Monday: 9:00 AM - 5:00 PM', 'Tuesday: 9:00 AM - 5:00 PM'],
    distance: 1.2,
    bearing: 'N',
    timezone: 'America/New_York',
  };

  const onClick = jest.fn();

  test('renders PlaceCard component', () => {
    render(<PlaceCard place={place} onClick={onClick} />);
    expect(screen.getByText('Test Place')).toBeInTheDocument();
  });

  test('displays the correct rating and reviews count', () => {
    render(<PlaceCard place={place} onClick={onClick} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(100)')).toBeInTheDocument();
  });

  test('displays the correct price level', () => {
    render(<PlaceCard place={place} onClick={onClick} />);
    expect(screen.getByText('$$')).toBeInTheDocument();
  });

  test('displays the correct address', () => {
    render(<PlaceCard place={place} onClick={onClick} />);
    expect(screen.getByText('123 Test St, Test City')).toBeInTheDocument();
  });

  test('displays the correct status', () => {
    render(<PlaceCard place={place} onClick={onClick} />);
    expect(screen.getByText('Open · Closes 6:00 PM')).toBeInTheDocument();
  });

  test('displays the correct phone number', () => {
    render(<PlaceCard place={place} onClick={onClick} />);
    expect(screen.getByText('Call')).toBeInTheDocument();
  });

  test('displays the correct website', () => {
    render(<PlaceCard place={place} onClick={onClick} />);
    expect(screen.getByText('Website')).toBeInTheDocument();
  });

  test('displays the correct hours', () => {
    render(<PlaceCard place={place} onClick={onClick} />);
    fireEvent.click(screen.getByText('Today:'));
    expect(screen.getByText('Monday: 9:00 AM - 5:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Tuesday: 9:00 AM - 5:00 PM')).toBeInTheDocument();
  });

  test('calls onClick when card is clicked', () => {
    render(<PlaceCard place={place} onClick={onClick} />);
    fireEvent.click(screen.getByText('Test Place'));
    expect(onClick).toHaveBeenCalled();
  });
});
