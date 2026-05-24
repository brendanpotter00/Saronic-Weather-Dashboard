import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { weatherApi } from '../features/weather/weatherApi';

// RTK Query owns the cache: in-memory, keyed per endpoint, with the ~10-min TTL
// configured in weatherApi.ts (refetchOnMountOrArgChange + keepUnusedDataFor). The
// cache lives for the session and resets on a full reload — fine for a single morning
// user well under Open-Meteo's rate limit.
export const store = configureStore({
  reducer: {
    [weatherApi.reducerPath]: weatherApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(weatherApi.middleware),
});

// Enables refetchOnFocus / refetchOnReconnect if we turn them on later.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
