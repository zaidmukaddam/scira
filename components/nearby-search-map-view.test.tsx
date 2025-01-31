import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import NearbySearchMapView from './nearby-search-map-view';

interface Location {
  lat: number;
  lng: number;
}

interface Photo {
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
  original: string;
  caption?: string;
}

interface Place {
  name: string;
  location: Location;
  place_id: string;
  vicinity: string;
  rating?: number;
  reviews_count?: number;
  price_level?: string;
  description?: string;
  photos?: Photo[];
  is_closed?: boolean;
  next_open_close?: string;
  type?: string;
  cuisine?: string;
  source?: string;
  phone?: string;
  website?: string;
  hours?: string[];
  distance?: number;
  bearing?: string;
  timezone?: string;
}

describe('NearbySearchMapView', () => {
  const mockPlaces: Place[] = [
    {
      name: 'Place 1',
      location: { lat: 40.7128, lng: -74.0060 },
      place_id: '1',
      vicinity: 'New York, NY',
      rating: 4.5,
      reviews_count: 100,
      price_level: '$$',
      description: 'A nice place in New York',
      photos: [],
      is_closed: false,
      next_open_close: '1800',
      type: 'restaurant',
      cuisine: 'Italian',
      source: 'Google',
      phone: '123-456-7890',
      website: 'https://place1.com',
      hours: ['Monday: 9:00 AM - 5:00 PM'],
      distance: 1.2,
      bearing: 'N',
      timezone: 'America/New_York',
    },
    {
      name: 'Place 2',
      location: { lat: 34.0522, lng: -118.2437 },
      place_id: '2',
      vicinity: 'Los Angeles, CA',
      rating: 4.0,
      reviews_count: 50,
      price_level: '$',
      description: 'A nice place in Los Angeles',
      photos: [],
      is_closed: true,
      next_open_close: '0900',
      type: 'cafe',
      cuisine: 'French',
      source: 'Google',
      phone: '987-654-3210',
      website: 'https://place2.com',
      hours: ['Tuesday: 10:00 AM - 6:00 PM'],
      distance: 2.5,
      bearing: 'S',
      timezone: 'America/Los_Angeles',
    },
  ];

  test('renders map and list view buttons', () => {
    render(<NearbySearchMapView center={{ lat: 40.7128, lng: -74.0060 }} places={mockPlaces} type="restaurant" />);
    expect(screen.getByText('List')).toBeInTheDocument();
    expect(screen.getByText('Map')).toBeInTheDocument();
  });

  test('toggles between map and list view', () => {
    render(<NearbySearchMapView center={{ lat: 40.7128, lng: -74.0060 }} places={mockPlaces} type="restaurant" />);
    const listButton = screen.getByText('List');
    const mapButton = screen.getByText('Map');

    // Initially in map view
    expect(screen.getByText('Beta')).toBeInTheDocument();

    // Switch to list view
    fireEvent.click(listButton);
    expect(screen.getByText('Place 1')).toBeInTheDocument();
    expect(screen.getByText('Place 2')).toBeInTheDocument();

    // Switch back to map view
    fireEvent.click(mapButton);
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  test('selects a place and displays its details', () => {
    render(<NearbySearchMapView center={{ lat: 40.7128, lng: -74.0060 }} places={mockPlaces} type="restaurant" />);
    const listButton = screen.getByText('List');
    fireEvent.click(listButton);

    const place1 = screen.getByText('Place 1');
    fireEvent.click(place1);

    expect(screen.getByText('A nice place in New York')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
  });
});
