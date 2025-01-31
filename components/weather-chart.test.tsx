import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import WeatherChart from './weather-chart';
import { ThemeProvider } from 'next-themes';

const mockResult = {
  city: {
    name: 'Sample City',
    country: 'SC',
  },
  list: [
    {
      dt: 1620000000,
      main: {
        temp_min: 280.15,
        temp_max: 285.15,
      },
    },
    {
      dt: 1620086400,
      main: {
        temp_min: 282.15,
        temp_max: 287.15,
      },
    },
    {
      dt: 1620172800,
      main: {
        temp_min: 281.15,
        temp_max: 286.15,
      },
    },
  ],
};

describe('WeatherChart', () => {
  it('renders the chart with the correct title', () => {
    render(
      <ThemeProvider>
        <WeatherChart result={mockResult} />
      </ThemeProvider>
    );

    expect(screen.getByText('Weather Forecast for Sample City')).toBeInTheDocument();
  });

  it('renders the chart with the correct axis labels', () => {
    render(
      <ThemeProvider>
        <WeatherChart result={mockResult} />
      </ThemeProvider>
    );

    expect(screen.getByText('Min Temp.')).toBeInTheDocument();
    expect(screen.getByText('Max Temp.')).toBeInTheDocument();
  });

  it('renders the chart with the correct series labels', () => {
    render(
      <ThemeProvider>
        <WeatherChart result={mockResult} />
      </ThemeProvider>
    );

    expect(screen.getByText('Min Temp.')).toBeInTheDocument();
    expect(screen.getByText('Max Temp.')).toBeInTheDocument();
  });
});
