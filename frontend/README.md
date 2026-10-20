# Card Dispute — Frontend

React 19 + TypeScript, built with [Vite](https://vite.dev) and routed with [React Router v7](https://reactrouter.com) (data mode).

## Scripts

| Command             | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Start the dev server on http://localhost:3000 |
| `npm run build`     | Type-check and build to `dist/`           |
| `npm run preview`   | Serve the production build locally        |
| `npm test`          | Run tests with Vitest (watch mode)        |
| `npm run typecheck` | Type-check only                           |

## Routing

- `src/routes/paths.ts` — URL constants; use these in links instead of strings.
- `src/routes/routes.tsx` — the route tree (`RouteObject[]`).
- `src/routes/router.tsx` — creates the browser router used in `src/main.tsx`.

To add a page: create it in `src/pages/`, add its path to `paths.ts`, and add a child route in `routes.tsx` using `lazy` so it gets its own bundle chunk.

## State management

Redux Toolkit + React Redux, all in `src/store/`:

- `store.ts` — creates the store (`makeStore`) and exports the `RootState` / `AppDispatch` types.
- `hooks.ts` — typed hooks. Always use `useAppSelector` / `useAppDispatch`, not the plain react-redux ones.
- `api/baseApi.ts` — the single RTK Query API. Server data belongs here: add endpoints with `baseApi.injectEndpoints(...)`. The base URL comes from `VITE_API_URL` (see `.env.example`).
- `slices/` — client-only state (UI, preferences). See `slices/ui/uiSlice.ts` for the pattern, then register new slices in `combineSlices(...)` in `store.ts`.

For component tests that need the store or router, use `renderWithProviders` from `src/test/renderWithProviders.tsx`.

Imports can use the `@/` alias for `src/`.
