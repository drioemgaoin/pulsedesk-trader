import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';

afterEach(() => {
  cleanup();
  document.title = '';
});

describe('useDocumentTitle', () => {
  it('sets title with app name suffix when title provided', () => {
    renderHook(() => useDocumentTitle('Login'));
    expect(document.title).toBe('Login — PulseDesk Trader');
  });

  it('sets bare app name when no title provided', () => {
    renderHook(() => useDocumentTitle());
    expect(document.title).toBe('PulseDesk Trader');
  });

  it('restores app name on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Test Page'));
    expect(document.title).toBe('Test Page — PulseDesk Trader');
    unmount();
    expect(document.title).toBe('PulseDesk Trader');
  });

  it('updates title when prop changes', () => {
    const { rerender } = renderHook(({ title }: { title?: string }) => useDocumentTitle(title), {
      initialProps: { title: 'First' },
    });
    expect(document.title).toBe('First — PulseDesk Trader');
    rerender({ title: 'Second' });
    expect(document.title).toBe('Second — PulseDesk Trader');
  });
});
