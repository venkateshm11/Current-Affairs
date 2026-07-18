import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Highlight } from './Highlight';

describe('Highlight', () => {
  it('wraps the matched substring in a <mark> and keeps the rest as text', () => {
    const { container } = render(<Highlight text="RBI repo rate held" term="repo" />);
    const mark = container.querySelector('mark');
    expect(mark).toBeTruthy();
    expect(mark.textContent).toBe('repo');
    // Full text is preserved across the fragments.
    expect(container.textContent).toBe('RBI repo rate held');
    // No raw HTML injection surface.
    expect(container.innerHTML).not.toContain('<script');
  });

  it('escapes RegExp metacharacters so a pattern term matches literally', () => {
    const { container } = render(<Highlight text="rate .* now" term=".*" />);
    const mark = container.querySelector('mark');
    expect(mark).toBeTruthy();
    // ".*" is matched literally, not as "everything".
    expect(mark.textContent).toBe('.*');
    expect(container.textContent).toBe('rate .* now');
  });

  it('empty term renders the text unchanged with no <mark>', () => {
    const { container } = render(<Highlight text="unchanged text" term="" />);
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toBe('unchanged text');
  });
});
