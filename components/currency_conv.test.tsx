import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { CurrencyConverter } from './currency_conv';

describe('CurrencyConverter', () => {
  const toolInvocation = {
    args: {
      from: 'USD',
      to: 'EUR',
      amount: '1',
    },
  };

  const result = {
    rate: '0.85',
  };

  test('renders CurrencyConverter component', () => {
    render(<CurrencyConverter toolInvocation={toolInvocation} result={result} />);
    expect(screen.getByText('Convert USD to EUR')).toBeInTheDocument();
  });

  test('displays the correct converted amount', () => {
    render(<CurrencyConverter toolInvocation={toolInvocation} result={result} />);
    expect(screen.getByText('0.85 EUR')).toBeInTheDocument();
  });

  test('updates amount input correctly', () => {
    render(<CurrencyConverter toolInvocation={toolInvocation} result={result} />);
    const input = screen.getByPlaceholderText('Amount');
    fireEvent.change(input, { target: { value: '2' } });
    expect(input.value).toBe('2');
  });

  test('displays error message for invalid input', () => {
    render(<CurrencyConverter toolInvocation={toolInvocation} result={result} />);
    const input = screen.getByPlaceholderText('Amount');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(screen.getByText('Please enter a valid number')).toBeInTheDocument();
  });

  test('displays loading state when result is not available', () => {
    render(<CurrencyConverter toolInvocation={toolInvocation} result={null} />);
    expect(screen.getByText('Getting latest rates...')).toBeInTheDocument();
  });
});
