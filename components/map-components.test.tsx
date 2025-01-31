import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MapComponent, Place } from './map-components';

const mockPlaces: Place[] = [
  {
    name: 'Place 1',
    location: { lat: 40.7128, lng: -74.0060 },
    vicinity: 'New York, NY',
  },
  {
    name: 'Place 2',
    location: { lat: 34.0522, lng: -118.2437 },
    vicinity: 'Los Angeles, CA',
  },
];

describe('MapComponent', () => {
  it('renders the map container', () => {
    render(
      <MapComponent
        center={{ lat: 39.8283, lng: -98.5795 }}
        places={mockPlaces}
        zoom={4}
      />
    );

    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('renders markers for each place', () => {
    render(
      <MapComponent
        center={{ lat: 39.8283, lng: -98.5795 }}
        places={mockPlaces}
        zoom={4}
      />
    );

    expect(screen.getByText('Place 1')).toBeInTheDocument();
    expect(screen.getByText('Place 2')).toBeInTheDocument();
  });

  it('calls onMarkerClick when a marker is clicked', () => {
    const handleMarkerClick = jest.fn();

    render(
      <MapComponent
        center={{ lat: 39.8283, lng: -98.5795 }}
        places={mockPlaces}
        zoom={4}
        onMarkerClick={handleMarkerClick}
      />
    );

    fireEvent.click(screen.getByText('Place 1'));
    expect(handleMarkerClick).toHaveBeenCalledWith(mockPlaces[0]);

    fireEvent.click(screen.getByText('Place 2'));
    expect(handleMarkerClick).toHaveBeenCalledWith(mockPlaces[1]);
  });
});
