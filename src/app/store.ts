import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { forecastApi } from '../forecast/forecastApi';

// RTK Query owns the cache (in-memory, ~10-min TTL configured in forecastApi.ts); it resets on a
// full reload.
export const store = configureStore({
  reducer: {
    [forecastApi.reducerPath]: forecastApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(forecastApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
