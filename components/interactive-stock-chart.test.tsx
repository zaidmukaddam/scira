import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { InteractiveStockChart } from './interactive-stock-chart';
import { ThemeProvider } from 'next-themes';

const mockChart = {
  title: 'Sample Stock Chart',
  data: [],
  chart: {
    type: 'line',
    x_label: 'Date',
    y_label: 'Price',
    x_scale: 'time',
    elements: [
      {
        label: 'Stock Price',
        points: [
          [1625097600000, 150],
          [1625184000000, 155],
          [1625270400000, 160],
        ],
      },
    ],
  },
};

describe('InteractiveStockChart', () => {
  it('renders the chart with the correct title', () => {
    render(
      <ThemeProvider>
        <InteractiveStockChart {...mockChart} />
      </ThemeProvider>
    );

    expect(screen.getByText('Sample Stock Chart')).toBeInTheDocument();
  });

  it('renders the chart with the correct axis labels', () => {
    render(
      <ThemeProvider>
        <InteractiveStockChart {...mockChart} />
      </ThemeProvider>
    );

    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
  });

  it('renders the chart with the correct series labels', () => {
    render(
      <ThemeProvider>
        <InteractiveStockChart {...mockChart} />
      </ThemeProvider>
    );

    expect(screen.getByText('Stock Price')).toBeInTheDocument();
  });
});
