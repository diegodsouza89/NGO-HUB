Render deployment quick guide

1) Using the existing `render.yaml` (recommended)

- Push this repo to GitHub.
- In Render, create a new "Web Service" and connect your repo/branch.
- Render will detect `render.yaml` and apply these settings:
  - Build command: `npm ci && npm run build`
  - Start command: `npm run start`
  - Health check path: `/api/health`

2) Using the `Dockerfile`

- Push repo to GitHub.
- In Render, create a new "Web Service" and choose "Docker" as the environment.
- Point Render to the repo and branch — Render will build using the `Dockerfile`.

Recommended environment variables on Render:
- `NODE_ENV=production`
- `PORT=3000` (optional; render sets a port for you via `$PORT`)

Troubleshooting:
- If Render fails on build, check the build logs for missing files or lockfile mismatches.
- Ensure the repo branch matches the `branch` in `render.yaml` (default: `main`).
