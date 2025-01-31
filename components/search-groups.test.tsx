import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { SearchGroups } from './search-groups';
import { searchGroups } from '@/lib/utils';

describe('SearchGroups', () => {
  const mockOnGroupSelect = jest.fn();
  const selectedGroup = 'web';

  test('renders SearchGroups component', () => {
    render(<SearchGroups selectedGroup={selectedGroup} onGroupSelect={mockOnGroupSelect} />);
    expect(screen.getByText('Web Search')).toBeInTheDocument();
  });

  test('highlights the selected group', () => {
    render(<SearchGroups selectedGroup={selectedGroup} onGroupSelect={mockOnGroupSelect} />);
    const selectedCard = screen.getByText('Web Search').closest('.ring-2');
    expect(selectedCard).toBeInTheDocument();
  });

  test('calls onGroupSelect when a group is clicked', () => {
    render(<SearchGroups selectedGroup={selectedGroup} onGroupSelect={mockOnGroupSelect} />);
    const academicGroup = screen.getByText('Academic Search');
    fireEvent.click(academicGroup);
    expect(mockOnGroupSelect).toHaveBeenCalledWith(searchGroups.find(group => group.name === 'Academic Search'));
  });
});
