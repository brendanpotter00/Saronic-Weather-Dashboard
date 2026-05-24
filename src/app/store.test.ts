import { describe, it, expect } from 'vitest';
import { store } from './store';
import { weatherApi } from '../features/weather/weatherApi';

// store.ts is plain wiring (configureStore + setupListeners), but it's the single
// place the weatherApi reducer/middleware get mounted — so we assert that wiring
// holds. Importing the module also executes configureStore's middleware callback,
// which is the only branch-bearing line here. No network: we never dispatch a query.
describe('store', () => {
  it('mounts the weatherApi reducer at its reducerPath', () => {
    expect(store.getState()).toHaveProperty(weatherApi.reducerPath);
  });

  it('exposes a working dispatch (middleware concatenated without throwing)', () => {
    expect(typeof store.dispatch).toBe('function');
  });
});
