import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { FlightTracker } from './flight-tracker';

const mockData = {
  data: [
    {
      flight_date: '2023-09-01',
      flight_status: 'landed',
      departure: {
        airport: 'JFK',
        timezone: 'America/New_York',
        iata: 'JFK',
        terminal: '4',
        gate: 'B22',
        delay: 10,
        scheduled: '2023-09-01T14:00:00Z',
      },
      arrival: {
        airport: 'LAX',
        timezone: 'America/Los_Angeles',
        iata: 'LAX',
        terminal: '5',
        gate: 'C30',
        delay: 5,
        scheduled: '2023-09-01T17:00:00Z',
      },
      airline: {
        name: 'Delta',
        iata: 'DL',
      },
      flight: {
        number: 'DL123',
        iata: 'DL123',
        duration: 300,
      },
    },
  ],
};

describe('FlightTracker', () => {
  test('renders FlightTracker component', () => {
    render(<FlightTracker data={mockData} />);
    expect(screen.getByText('DL123')).toBeInTheDocument();
    expect(screen.getByText('Delta')).toBeInTheDocument();
    expect(screen.getByText('LANDED')).toBeInTheDocument();
  });

  test('displays departure and arrival information correctly', () => {
    render(<FlightTracker data={mockData} />);
    expect(screen.getByText('JFK')).toBeInTheDocument();
    expect(screen.getByText('LAX')).toBeInTheDocument();
    expect(screen.getByText('14:00 UTC')).toBeInTheDocument();
    expect(screen.getByText('17:00 UTC')).toBeInTheDocument();
  });

  test('displays flight duration correctly', () => {
    render(<FlightTracker data={mockData} />);
    expect(screen.getByText('Flight duration: 3h 0m')).toBeInTheDocument();
  });

  test('displays last updated time', () => {
    render(<FlightTracker data={mockData} />);
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });
});
