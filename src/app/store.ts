import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { weatherApi } from '../features/weather/weatherApi';
import { CACHE_TTL_SECONDS } from '../config/app';

// Persist the weatherApi cache slice across reloads so the morning re-check doesn't
// re-hit the rate-limited free tier. keepUnusedDataFor alone is in-memory and dies on
// reload; this + refetchOnMountOrArgChange (weatherApi.ts) gives a real ~10-min TTL.
const PERSIST_KEY = 'saronic-weather-cache-v1';
// Persist only the API slice; its key is weatherApi.reducerPath ('weatherApi').
type PersistedState = { [weatherApi.reducerPath]: ReturnType<typeof weatherApi.reducer> };

function loadPersistedState(): PersistedState | undefined {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return undefined;
    const { savedAt, state } = JSON.parse(raw) as { savedAt: number; state: PersistedState };
    // Discard a cache older than the TTL so a stale reload starts cold.
    if (typeof savedAt !== 'number' || Date.now() - savedAt > CACHE_TTL_SECONDS * 1000) {
      localStorage.removeItem(PERSIST_KEY);
      return undefined;
    }
    return state;
  } catch {
    // Unavailable / corrupt / quota — caching is best-effort, fall back to a cold load.
    return undefined;
  }
}

export const store = configureStore({
  reducer: {
    [weatherApi.reducerPath]: weatherApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(weatherApi.middleware),
  preloadedState: loadPersistedState(),
});

// Debounced write of just the API slice (+ a timestamp) on every state change.
let saveScheduled = false;
store.subscribe(() => {
  if (saveScheduled) return;
  saveScheduled = true;
  window.setTimeout(() => {
    saveScheduled = false;
    try {
      const state = store.getState();
      const payload = { savedAt: Date.now(), state: { [weatherApi.reducerPath]: state[weatherApi.reducerPath] } };
      localStorage.setItem(PERSIST_KEY, JSON.stringify(payload));
    } catch {
      // Best-effort: ignore quota / serialization / unavailable-storage failures.
    }
  }, 500);
});

// Enables refetchOnFocus / refetchOnReconnect if we turn them on later.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
