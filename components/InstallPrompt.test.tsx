import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { InstallPrompt } from './InstallPrompt';

describe('InstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders InstallPrompt component', () => {
    render(<InstallPrompt />);
    expect(screen.getByText('Install Scira')).toBeInTheDocument();
  });

  test('displays correct instructions for iOS', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'iPhone',
      writable: true,
    });
    render(<InstallPrompt />);
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });

  test('displays correct instructions for Android', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Android',
      writable: true,
    });
    render(<InstallPrompt />);
    expect(screen.getByText(/Install app/)).toBeInTheDocument();
  });

  test('displays correct instructions for Chrome', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Chrome',
      writable: true,
    });
    render(<InstallPrompt />);
    expect(screen.getByText(/Install our app for a better experience/)).toBeInTheDocument();
  });

  test('dismisses the prompt when Maybe later is clicked', () => {
    render(<InstallPrompt />);
    fireEvent.click(screen.getByText('Maybe later'));
    expect(screen.queryByText('Install Scira')).not.toBeInTheDocument();
  });

  test('calls handleInstall when Install button is clicked', () => {
    const handleInstall = jest.fn();
    render(<InstallPrompt />);
    fireEvent.click(screen.getByText('Install'));
    expect(handleInstall).toHaveBeenCalled();
  });
});
