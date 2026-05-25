import { describe, it, expect } from 'vitest';
import { Status } from '../../scoring/status';
import { StatusStrip } from './StatusStrip';
import { renderWithTheme } from '../../test/renderWithTheme';

describe('StatusStrip', () => {
  it('renders a fixed-height bar', () => {
    const { container } = renderWithTheme(<StatusStrip status={Status.Go} />);
    const strip = container.firstChild as HTMLElement;
    expect(strip).toBeInTheDocument();
    expect(strip).toHaveStyle({ height: '5px' });
  });
});
