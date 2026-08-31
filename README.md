# Football registration

An Astro SSR app for the 2026/27 weekly football season. The roster is seeded from `winter-foodball-list.pdf`; all 24 Tuesday fixtures are created at the seven-day materialization point.

## Local development

```sh
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Availability is open Friday 09:00–12:00 in `Europe/Vienna`. The scheduler should run alongside the web process in production (`npm run scheduler`). Admin access uses `ADMIN_PASSWORD` and a signed, HTTP-only session cookie.

## Deployment

The GitHub Actions workflow publishes `ghcr.io/OWNER/football-registration:<commit-sha>`. On the server, create a deployment directory containing `docker-compose.deploy.yml` and a private `.env` with `IMAGE`, `DATABASE_URL=/app/data/football.db`, `ADMIN_PASSWORD`, `SESSION_SECRET`, and `ORIGIN`. Mount the compose volume to persistent storage and put HTTPS in front of `127.0.0.1:4321`.

Run `docker compose -f docker-compose.deploy.yml run --rm migrate` during first setup, then `docker compose ... up -d`. Back up the SQLite volume while the service is stopped (or use SQLite's online backup tooling). Roll back by setting `IMAGE` to an earlier SHA and running `docker compose pull && docker compose up -d`; `.env` and the volume are never replaced by deployment.
