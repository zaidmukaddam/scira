import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import InteractiveMap from './interactive-maps';

const mockPlaces = [
  {
    name: 'Place 1',
    location: { lat: 40.7128, lng: -74.0060 },
    place_id: '1',
    vicinity: 'New York, NY',
  },
  {
    name: 'Place 2',
    location: { lat: 34.0522, lng: -118.2437 },
    place_id: '2',
    vicinity: 'Los Angeles, CA',
  },
];

describe('InteractiveMap', () => {
  it('renders the map container', () => {
    render(
      <InteractiveMap
        center={{ lat: 39.8283, lng: -98.5795 }}
        places={mockPlaces}
        selectedPlace={null}
        onPlaceSelect={() => {}}
      />
    );

    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('renders markers for each place', () => {
    render(
      <InteractiveMap
        center={{ lat: 39.8283, lng: -98.5795 }}
        places={mockPlaces}
        selectedPlace={null}
        onPlaceSelect={() => {}}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onPlaceSelect when a marker is clicked', () => {
    const handlePlaceSelect = jest.fn();

    render(
      <InteractiveMap
        center={{ lat: 39.8283, lng: -98.5795 }}
        places={mockPlaces}
        selectedPlace={null}
        onPlaceSelect={handlePlaceSelect}
      />
    );

    fireEvent.click(screen.getByText('1'));
    expect(handlePlaceSelect).toHaveBeenCalledWith(mockPlaces[0]);

    fireEvent.click(screen.getByText('2'));
    expect(handlePlaceSelect).toHaveBeenCalledWith(mockPlaces[1]);
  });
});
