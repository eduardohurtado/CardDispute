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

- `src/app/paths.ts` — URL constants; use these in links instead of strings.
- `src/app/routes.tsx` — the route tree (`RouteObject[]`).
- `src/app/router.tsx` — creates the browser router used in `src/main.tsx`.

To add a page: create it in `src/pages/`, add its path to `paths.ts`, and add a child route in `routes.tsx` using `lazy` so it gets its own bundle chunk.

Imports can use the `@/` alias for `src/`.
