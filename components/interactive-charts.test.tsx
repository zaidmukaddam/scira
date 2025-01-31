import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { InteractiveChart } from './interactive-charts';
import { ThemeProvider } from 'next-themes';

const mockChart = {
  type: 'line',
  title: 'Sample Chart',
  x_label: 'X Axis',
  y_label: 'Y Axis',
  elements: [
    {
      label: 'Series 1',
      points: [
        [1, 2],
        [2, 3],
        [3, 4],
      ],
    },
    {
      label: 'Series 2',
      points: [
        [1, 3],
        [2, 4],
        [3, 5],
      ],
    },
  ],
};

describe('InteractiveChart', () => {
  it('renders the chart with the correct title', () => {
    render(
      <ThemeProvider>
        <InteractiveChart chart={mockChart} />
      </ThemeProvider>
    );

    expect(screen.getByText('Sample Chart')).toBeInTheDocument();
  });

  it('renders the chart with the correct axis labels', () => {
    render(
      <ThemeProvider>
        <InteractiveChart chart={mockChart} />
      </ThemeProvider>
    );

    expect(screen.getByText('X Axis')).toBeInTheDocument();
    expect(screen.getByText('Y Axis')).toBeInTheDocument();
  });

  it('renders the chart with the correct series labels', () => {
    render(
      <ThemeProvider>
        <InteractiveChart chart={mockChart} />
      </ThemeProvider>
    );

    expect(screen.getByText('Series 1')).toBeInTheDocument();
    expect(screen.getByText('Series 2')).toBeInTheDocument();
  });
});
