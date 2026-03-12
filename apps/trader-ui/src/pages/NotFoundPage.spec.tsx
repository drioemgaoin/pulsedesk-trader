import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';

describe('NotFoundPage', () => {
  it('renders 404 heading', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /404/i })).toBeInTheDocument();
  });

  it('has a link to /trading', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /go to terminal/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/trading');
  });

  it('sets document title to Page Not Found', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Page Not Found — PulseDesk Trader');
  });
});
