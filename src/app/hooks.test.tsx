import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './hooks';
import { weatherApi } from '../features/weather/weatherApi';

// The typed hooks are thin re-exports of useDispatch/useSelector. We exercise them
// through a real Provider + the real store so the typing wires end-to-end, rather
// than importing them just to tick coverage.
function Probe() {
  const dispatch = useAppDispatch();
  const hasApiState = useAppSelector((state) => weatherApi.reducerPath in state);
  return <span>{typeof dispatch === 'function' && hasApiState ? 'wired' : 'broken'}</span>;
}

describe('typed redux hooks', () => {
  it('useAppDispatch and useAppSelector read the typed store', () => {
    render(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );
    expect(screen.getByText('wired')).toBeInTheDocument();
  });
});
